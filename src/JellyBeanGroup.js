import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

const maxParticles = 23750;
const defaultGridSize1d = 70;
const fixedPointMultiplier = 1e7;

let colors = [
  new THREE.Color("rgb(241, 224, 0)"),
  new THREE.Color("rgb(255, 112, 169)"),
  new THREE.Color("rgb(255, 44, 62)"),
  new THREE.Color("rgb(255, 117, 0)"),
  new THREE.Color("rgb(0, 193, 126)"),
];

class JellyBeanGroup {
  constructor(scene, params, container, pos, index, size) {
    if (size == null) {
      size = new THREE.Vector3(
        defaultGridSize1d,
        defaultGridSize1d,
        defaultGridSize1d
      );
    }
    this.gridSize = size;
    this.tslColors = null;
    this.index = index;
    this.clock = new THREE.Clock();
    this.position = pos;
    this.container = container;
    this.setupBuffers();
    this.setupUniforms(params, container, pos);
    this.setupComputeShaders(params);
    this.setupMesh(scene, params, index);
  }

  setupBuffers() {
    const particleStruct = TSL.struct({
      position: { type: "vec3" },
      velocity: { type: "vec3" },
      C: { type: "mat3" },
      rolled: { type: "uint" },
    });
    const particleStructSize = 24; // each vec3 occupies 4 floats and mat3 occupies 12 floats in memory because of webgpu memory alignment
    // int is 4 units, i assume?
    const particleArray = new Float32Array(maxParticles * particleStructSize);
    const directionArray = new Float32Array(maxParticles * particleStructSize);

    const q = new THREE.Quaternion();
    const v = new THREE.Euler();

    for (let i = 0; i < maxParticles; i++) {
      particleArray[i * particleStructSize] = Math.random() * 0.8 + 0.1;
      particleArray[i * particleStructSize + 1] = Math.random() * 0.8 + 0.1;
      particleArray[i * particleStructSize + 2] = Math.random() * 0.8 + 0.1;

      q.random();
      v.setFromQuaternion(q);

      directionArray[i * particleStructSize] = v.x;
      directionArray[i * particleStructSize] = v.y;
      directionArray[i * particleStructSize] = v.z;
    }

    this.particleBuffer = TSL.instancedArray(particleArray, particleStruct);
    const cellCount = this.gridSize.x * this.gridSize.y * this.gridSize.z;

    const cellStruct = TSL.struct({
      x: { type: "int", atomic: true },
      y: { type: "int", atomic: true },
      z: { type: "int", atomic: true },
      mass: { type: "int", atomic: true },
    });

    this.cellBuffer = TSL.instancedArray(cellCount, cellStruct);
    this.cellBufferFloat = TSL.instancedArray(cellCount, "vec4");
  }

  setupUniforms(params, container, pos) {
    this.gridSizeUniform = TSL.uniform(this.gridSize);
    this.particleCountUniform = TSL.uniform(params.particleCount, "uint");
    this.stiffnessUniform = TSL.uniform(1000);
    this.restDensityUniform = TSL.uniform(container.restDensity); // default 0.65
    this.dynamicViscosityUniform = TSL.uniform(5);
    this.dtUniform = TSL.uniform(1 / 60);
    this.gravityUniform = TSL.uniform(
      new THREE.Vector3(0, params.gravityPull, 0)
    );
    this.fallIndexUniform = TSL.uniform(-1);
    this.xOffsetUniform = TSL.uniform(pos[0]);
    this.yOffsetUniformPc = TSL.uniform(pos[1]);
    this.yOffsetUniform = TSL.uniform(container.yOffset);
    this.zOffsetUniform = TSL.uniform(pos[2] - 0.02);

    this.innerRadiusUniform = TSL.uniform(container.radius);
    this.subtractionUniform = TSL.uniform(container.subtract);
    this.bounceUniform = TSL.uniform(container.bounce);
  }

  setupComputeShaders(params) {
    // the MLS-MPM system uses five compute shaders:
    // 1. this.clearGridKernel: this clears the grid before each pass
    // 2. this.p2g1Kernel & 3. this.p2g2Kernel: These particle2grid kernels transfer the particles' energy to the grid
    // 4. this.updateGridKernel: updates the grid
    // 5. this.g2pKernel: grid2particle kernel, transfers the grid energy back to the particles
    // the implementation closely follows https://github.com/matsuoka-601/WebGPU-Ocean

    // because webgpu only supports int atomics, we use fixed point floats by multiplying/dividing the float values with a high integer constant
    const encodeFixedPoint = (f32) => {
      return TSL.int(f32.mul(fixedPointMultiplier));
    };

    const decodeFixedPoint = (i32) => {
      return TSL.float(i32).div(fixedPointMultiplier);
    };

    const cellCount = this.gridSize.x * this.gridSize.y * this.gridSize.z;
    this.clearGridKernel = TSL.Fn(() => {
      TSL.If(TSL.instanceIndex.greaterThanEqual(TSL.uint(cellCount)), () => {
        TSL.Return();
      });

      TSL.atomicStore(this.cellBuffer.element(TSL.instanceIndex).get("x"), 0);
      TSL.atomicStore(this.cellBuffer.element(TSL.instanceIndex).get("y"), 0);
      TSL.atomicStore(this.cellBuffer.element(TSL.instanceIndex).get("z"), 0);
      TSL.atomicStore(
        this.cellBuffer.element(TSL.instanceIndex).get("mass"),
        0
      );
    })().compute(cellCount);

    this.p2g1Kernel = TSL.Fn(() => {
      TSL.If(
        TSL.instanceIndex.greaterThanEqual(this.particleCountUniform),
        () => {
          TSL.Return();
        }
      );
      const particlePosition = this.particleBuffer
        .element(TSL.instanceIndex)
        .get("position")
        .toConst("particlePosition");
      const particleVelocity = this.particleBuffer
        .element(TSL.instanceIndex)
        .get("velocity")
        .toConst("particleVelocity");
      const C = this.particleBuffer
        .element(TSL.instanceIndex)
        .get("C")
        .toConst("C");

      const gridPosition = particlePosition.mul(this.gridSizeUniform).toVar();
      const cellIndex = TSL.ivec3(gridPosition).sub(1).toConst("cellIndex");
      const cellDiff = gridPosition.fract().sub(0.5).toConst("cellDiff");
      const w0 = TSL.float(0.5)
        .mul(TSL.float(0.5).sub(cellDiff))
        .mul(TSL.float(0.5).sub(cellDiff));
      const w1 = TSL.float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = TSL.float(0.5)
        .mul(TSL.float(0.5).add(cellDiff))
        .mul(TSL.float(0.5).add(cellDiff));
      const weights = TSL.array([w0, w1, w2]).toConst("weights");

      TSL.Loop(
        { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
        ({ gx }) => {
          TSL.Loop(
            { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
            ({ gy }) => {
              TSL.Loop(
                { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
                ({ gz }) => {
                  const weight = weights
                    .element(gx)
                    .x.mul(weights.element(gy).y)
                    .mul(weights.element(gz).z);
                  const cellX = cellIndex.add(TSL.ivec3(gx, gy, gz)).toConst();
                  const cellDist = TSL.vec3(cellX)
                    .add(0.5)
                    .sub(gridPosition)
                    .toConst("cellDist");
                  const Q = C.mul(cellDist);

                  const massContrib = weight; // assuming particle mass = 1.0
                  const velContrib = massContrib
                    .mul(particleVelocity.add(Q))
                    .toConst("velContrib");
                  const cellPtr = cellX.x
                    .mul(TSL.int(this.gridSize.y * this.gridSize.z))
                    .add(cellX.y.mul(TSL.int(this.gridSize.z)))
                    .add(cellX.z)
                    .toConst();
                  const cell = this.cellBuffer.element(cellPtr);

                  TSL.atomicAdd(cell.get("x"), encodeFixedPoint(velContrib.x));
                  TSL.atomicAdd(cell.get("y"), encodeFixedPoint(velContrib.y));
                  TSL.atomicAdd(cell.get("z"), encodeFixedPoint(velContrib.z));
                  TSL.atomicAdd(
                    cell.get("mass"),
                    encodeFixedPoint(massContrib)
                  );
                }
              );
            }
          );
        }
      );
    })().compute(params.particleCount);

    this.p2g2Kernel = TSL.Fn(() => {
      TSL.If(
        TSL.instanceIndex.greaterThanEqual(this.particleCountUniform),
        () => {
          TSL.Return();
        }
      );
      const particlePosition = this.particleBuffer
        .element(TSL.instanceIndex)
        .get("position")
        .toConst("particlePosition");
      const gridPosition = particlePosition.mul(this.gridSizeUniform).toVar();

      const cellIndex = TSL.ivec3(gridPosition).sub(1).toConst("cellIndex");
      const cellDiff = gridPosition.fract().sub(0.5).toConst("cellDiff");
      const w0 = TSL.float(0.5)
        .mul(TSL.float(0.5).sub(cellDiff))
        .mul(TSL.float(0.2).sub(cellDiff)); //change second float from 0.5 to 0.2
      const w1 = TSL.float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = TSL.float(0.5)
        .mul(TSL.float(0.5).add(cellDiff))
        .mul(TSL.float(0.2).add(cellDiff)); //change second float from 0.5 to 0.2
      const weights = TSL.array([w0, w1, w2]).toConst("weights");

      const density = TSL.float(0).toVar("density");
      TSL.Loop(
        { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
        ({ gx }) => {
          TSL.Loop(
            { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
            ({ gy }) => {
              TSL.Loop(
                { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
                ({ gz }) => {
                  const weight = weights
                    .element(gx)
                    .x.mul(weights.element(gy).y)
                    .mul(weights.element(gz).z);
                  const cellX = cellIndex.add(TSL.ivec3(gx, gy, gz)).toConst();
                  const cellPtr = cellX.x
                    .mul(TSL.int(this.gridSize.y * this.gridSize.z))
                    .add(cellX.y.mul(TSL.int(this.gridSize.z)))
                    .add(cellX.z)
                    .toConst();
                  const cell = this.cellBuffer.element(cellPtr);
                  const mass = decodeFixedPoint(
                    TSL.atomicLoad(cell.get("mass"))
                  );
                  density.addAssign(mass.mul(weight));
                }
              );
            }
          );
        }
      );

      const volume = TSL.float(1).div(density);
      const pressure = TSL.max(
        0.0,
        TSL.pow(density.div(this.restDensityUniform), 5.0)
          .sub(1)
          .mul(this.stiffnessUniform)
      ).toConst("pressure");
      const stress = TSL.mat3(
        pressure.negate(),
        0,
        0,
        0,
        pressure.negate(),
        0,
        0,
        0,
        pressure.negate()
      ).toVar("stress");
      const dudv = this.particleBuffer
        .element(TSL.instanceIndex)
        .get("C")
        .toConst("C");

      const strain = dudv.add(dudv.transpose());
      stress.addAssign(strain.mul(this.dynamicViscosityUniform));
      const eq16Term0 = volume.mul(-4).mul(stress).mul(this.dtUniform);

      TSL.Loop(
        { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
        ({ gx }) => {
          TSL.Loop(
            { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
            ({ gy }) => {
              TSL.Loop(
                { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
                ({ gz }) => {
                  const weight = weights
                    .element(gx)
                    .x.mul(weights.element(gy).y)
                    .mul(weights.element(gz).z);
                  const cellX = cellIndex.add(TSL.ivec3(gx, gy, gz)).toConst();
                  const cellDist = TSL.vec3(cellX)
                    .add(0.5)
                    .sub(gridPosition)
                    .toConst("cellDist");
                  const momentum = eq16Term0
                    .mul(weight)
                    .mul(cellDist)
                    .toConst("momentum");

                  const cellPtr = cellX.x
                    .mul(TSL.int(this.gridSize.y * this.gridSize.z))
                    .add(cellX.y.mul(TSL.int(this.gridSize.z)))
                    .add(cellX.z)
                    .toConst();
                  const cell = this.cellBuffer.element(cellPtr);
                  TSL.atomicAdd(cell.get("x"), encodeFixedPoint(momentum.x));
                  TSL.atomicAdd(cell.get("y"), encodeFixedPoint(momentum.y));
                  TSL.atomicAdd(cell.get("z"), encodeFixedPoint(momentum.z));
                }
              );
            }
          );
        }
      );
    })().compute(params.particleCount);

    this.updateGridKernel = TSL.Fn(() => {
      TSL.If(TSL.instanceIndex.greaterThanEqual(TSL.uint(cellCount)), () => {
        TSL.Return();
      });
      const cell = this.cellBuffer.element(TSL.instanceIndex);
      const mass = decodeFixedPoint(TSL.atomicLoad(cell.get("mass"))).toConst();
      TSL.If(mass.lessThanEqual(0), () => {
        TSL.Return();
      });

      const vx = decodeFixedPoint(TSL.atomicLoad(cell.get("x")))
        .div(mass)
        .toVar();
      const vy = decodeFixedPoint(TSL.atomicLoad(cell.get("y")))
        .div(mass)
        .toVar();
      const vz = decodeFixedPoint(TSL.atomicLoad(cell.get("z")))
        .div(mass)
        .toVar();

      const x = TSL.int(TSL.instanceIndex).div(
        TSL.int(this.gridSize.z * this.gridSize.y)
      );
      const y = TSL.int(TSL.instanceIndex)
        .div(TSL.int(this.gridSize.z))
        .mod(TSL.int(this.gridSize.y));
      const z = TSL.int(TSL.instanceIndex).mod(TSL.int(this.gridSize.z));
      TSL.If(
        x
          .lessThan(TSL.int(1))
          .or(x.greaterThan(TSL.int(this.gridSize.x).sub(TSL.int(2)))),
        () => {
          vx.assign(0);
        }
      );
      TSL.If(
        y
          .lessThan(TSL.int(1))
          .or(y.greaterThan(TSL.int(this.gridSize.y).sub(TSL.int(2)))),
        () => {
          vy.assign(0);
        }
      );
      TSL.If(
        z
          .lessThan(TSL.int(1))
          .or(z.greaterThan(TSL.int(this.gridSize.z).sub(TSL.int(2)))),
        () => {
          vz.assign(0);
        }
      );

      this.cellBufferFloat
        .element(TSL.instanceIndex)
        .assign(TSL.vec4(vx, vy, vz, mass));
    })().compute(cellCount);

    const clampToRoundedBox = (pos, box, radius) => {
      box.addAssign(TSL.vec3(0, this.yOffsetUniformPc, 0));
      const result = pos.sub(0.5).toVar();
      const pp = TSL.step(box, result.abs()).mul(
        result.add(box.negate().mul(result.sign()))
      );
      const ppLen = pp.length().toVar();
      const dist = ppLen.sub(radius);
      TSL.If(dist.greaterThan(0.0), () => {
        result.subAssign(pp.normalize().mul(dist).mul(this.bounceUniform)); //how much jelly beans bounce
      });
      result.addAssign(0.5);
      return result;
    };

    this.g2pKernel = TSL.Fn(() => {
      TSL.If(
        TSL.instanceIndex.greaterThanEqual(this.particleCountUniform),
        () => {
          TSL.Return();
        }
      );

      const particlePosition = this.particleBuffer
        .element(TSL.instanceIndex)
        .get("position")
        .toVar("particlePosition");
      const gridPosition = particlePosition.mul(this.gridSizeUniform).toVar();
      const particleVelocity = TSL.vec3(0).toVar();

      const cellIndex = TSL.ivec3(gridPosition).sub(1).toConst("cellIndex");
      const cellDiff = gridPosition.fract().sub(0.5).toConst("cellDiff");

      const w0 = TSL.float(0.5)
        .mul(TSL.float(0.5).sub(cellDiff))
        .mul(TSL.float(0.5).sub(cellDiff));
      const w1 = TSL.float(0.75).sub(cellDiff.mul(cellDiff));
      const w2 = TSL.float(0.5)
        .mul(TSL.float(0.5).add(cellDiff))
        .mul(TSL.float(0.5).add(cellDiff));
      const weights = TSL.array([w0, w1, w2]).toConst("weights");

      const B = TSL.mat3(0).toVar("B");
      TSL.Loop(
        { start: 0, end: 3, type: "int", name: "gx", condition: "<" },
        ({ gx }) => {
          TSL.Loop(
            { start: 0, end: 3, type: "int", name: "gy", condition: "<" },
            ({ gy }) => {
              TSL.Loop(
                { start: 0, end: 3, type: "int", name: "gz", condition: "<" },
                ({ gz }) => {
                  const weight = weights
                    .element(gx)
                    .x.mul(weights.element(gy).y)
                    .mul(weights.element(gz).z);
                  const cellX = cellIndex.add(TSL.ivec3(gx, gy, gz)).toConst();
                  const cellDist = TSL.vec3(cellX)
                    .add(0.5)
                    .sub(gridPosition)
                    .toConst("cellDist");
                  const cellPtr = cellX.x
                    .mul(TSL.int(this.gridSize.y * this.gridSize.z))
                    .add(cellX.y.mul(TSL.int(this.gridSize.z)))
                    .add(cellX.z)
                    .toConst();

                  const weightedVelocity = this.cellBufferFloat
                    .element(cellPtr)
                    .xyz.mul(weight)
                    .toConst("weightedVelocity");
                  const term = TSL.mat3(
                    weightedVelocity.mul(cellDist.x).mul(0.01), //changed
                    weightedVelocity.mul(cellDist.y).mul(0.01), //changed
                    weightedVelocity.mul(cellDist.z).mul(0.01) //changed
                  );
                  B.addAssign(term);
                  particleVelocity.addAssign(weightedVelocity);
                }
              );
            }
          );
        }
      );

      this.particleBuffer.element(TSL.instanceIndex).get("C").assign(B.mul(4));

      // gravity
      particleVelocity.addAssign(this.gravityUniform.mul(this.dtUniform));

      // scale from (this.gridSize.x, this.gridSize.y, this.gridSize.z) to (1, 1, 1)
      particleVelocity.divAssign(this.gridSizeUniform);

      // add velocity to position
      particlePosition.addAssign(particleVelocity.mul(this.dtUniform));

      // TSL.clamp position so outermost gridCells are not reached
      particlePosition.assign(
        TSL.clamp(
          particlePosition,
          TSL.vec3(1).div(this.gridSizeUniform),
          TSL.vec3(this.gridSize).sub(1).div(this.gridSizeUniform)
        )
      );

      /*const innerBox = this.gridSizeUniform
        .mul(0.2) // .1 for wine-glass ish shape
        .sub(15.0)
        .div(this.gridSizeUniform)
        .toVar();
      const innerRadius = TSL.float(3.0).div(this.gridSizeUniform.x);
      const posNext = particlePosition
        .add(particleVelocity.mul(this.dtUniform).mul(2.0))
        .toConst("posNext");
      const posNextClamped = clampToRoundedBox(posNext, innerBox, innerRadius);
      particleVelocity.addAssign(posNextClamped.sub(posNext));*/

      // add force for particles to stay within rounded box
      const innerBox = this.gridSizeUniform
        .mul(0.2) //changed from 0.3 to 0.2
        .sub(this.subtractionUniform)
        .div(this.gridSizeUniform)
        .toVar();
      const innerRadius = TSL.float(this.innerRadiusUniform).div(
        this.gridSizeUniform.x
      );
      const posNext = particlePosition
        .add(particleVelocity.mul(this.dtUniform).mul(2.0))
        .toConst("posNext");
      const posNextClamped = clampToRoundedBox(posNext, innerBox, innerRadius);
      particleVelocity.addAssign(posNextClamped.sub(posNext));

      particleVelocity.mulAssign(this.gridSizeUniform);

      TSL.If(
        this.fallIndexUniform
          .greaterThanEqual(TSL.instanceIndex)
          .and(this.fallIndexUniform.lessThan(TSL.instanceIndex.add(60))),
        () => {
          TSL.If(
            this.particleBuffer
              .element(TSL.instanceIndex)
              .get("rolled")
              .lessThan(1),
            () => {
              var randX = TSL.float(0.5).add(
                TSL.hash(TSL.instanceIndex).sub(0.5).mul(0.3)
              );
              var randZ = TSL.float(0.5).add(
                TSL.hash(this.fallIndexUniform).sub(0.5).mul(0.3)
              );
              particleVelocity.assign(TSL.vec3(0, 0, 0));
              particlePosition.assign(TSL.vec3(randX, 1, randZ));
              this.particleBuffer
                .element(TSL.instanceIndex)
                .get("rolled")
                .assign(1);
            }
          );
        }
      );

      this.particleBuffer
        .element(TSL.instanceIndex)
        .get("position")
        .assign(particlePosition);
      TSL.If(
        this.particleBuffer
          .element(TSL.instanceIndex)
          .get("rolled")
          .lessThan(1),
        () => {
          this.particleBuffer
            .element(TSL.instanceIndex)
            .get("position")
            .assign(TSL.vec3(0, 0, 0));
        }
      );

      this.particleBuffer
        .element(TSL.instanceIndex)
        .get("velocity")
        .assign(particleVelocity);
    })().compute(params.particleCount);
  }

  setupMesh(scene, params, index) {
    // mergeVertices to reduce the number of vertexShaderCalls
    var capsule = new THREE.CapsuleGeometry(0.0045, 0.0045, 4, 8);

    this.geometry = BufferGeometryUtils.mergeVertices(capsule);

    this.geometry.rotateX(3.14 / 2);

    const threeTone = new THREE.TextureLoader().load("./threeTone.jpg");
    threeTone.minFilter = THREE.NearestFilter;
    threeTone.magFilter = THREE.NearestFilter;
    var meshMaterial = new THREE.MeshToonMaterial({
      color: 0xffffff,
      map: threeTone,
      side: THREE.FrontSide,
    });

    meshMaterial.vertexNode = this.jellyBeanVertex();
    meshMaterial.colorNode = this.getRandomColor(index);

    this.particleMesh = new THREE.Mesh(this.geometry, meshMaterial);

    this.particleMesh.count = params.particleCount;

    this.particleMesh.frustumCulled = false;
    scene.add(this.particleMesh);

    const onKeyDown = (e) => {
      if (e.key == " ") {
        //this.particleMesh.position.y += 100;
      }
    };
    document.addEventListener("keydown", onKeyDown);
  }

  jellyBeanVertex = TSL.Fn(() => {
    const c = TSL.cos(TSL.float(TSL.instanceIndex.mod(360)));
    const s = TSL.sin(TSL.float(TSL.instanceIndex.mod(360)));

    // Y-axis rotation matrix
    const rotationMatrix = TSL.mat3(
      c,
      TSL.float(0),
      s.mul(-1),
      TSL.float(0),
      TSL.float(1),
      TSL.float(0),
      s,
      TSL.float(0),
      c
    );
    var particlePosition = this.particleBuffer
      .element(TSL.instanceIndex)
      .get("position");
    const localPosition = rotationMatrix.mul(TSL.positionGeometry);
    const worldPosition = localPosition.add(particlePosition);
    worldPosition.addAssign(
      TSL.vec3(
        this.xOffsetUniform.value - 0.5,
        this.yOffsetUniform.value - 0.5,
        this.zOffsetUniform.value - 0.48
      )
    );
    const viewProjPosition = TSL.cameraProjectionMatrix.mul(
      TSL.cameraViewMatrix.mul(worldPosition)
    );

    return viewProjPosition;
  });

  getRandomColor = TSL.Fn((index) => {
    if (this.tslColors == null) {
      this.tslColors = TSL.color(0, 0, 0).toArray(colors.length);
      for (var i = 0; i < colors.length; i++) {
        var c = colors[i];
        this.tslColors.element(i).assign(TSL.color(c.r, c.g, c.b));
      }
    }
    const seed = TSL.instanceIndex.mod(colors.length).toVar();
    return this.tslColors.element(seed);
  });

  renderFunction = async (renderer, paused) => {
    const deltaTime = THREE.MathUtils.clamp(
      this.clock.getDelta(),
      0.00001,
      1 / 60
    ); // don't advance the time too far, for example when the window is out of focus
    this.dtUniform.value = deltaTime;

    if (!paused) {
      await renderer.computeAsync([
        this.clearGridKernel,
        this.p2g1Kernel,
        this.p2g2Kernel,
        this.updateGridKernel,
        this.g2pKernel,
      ]);
    }
    if (this.fallIndexUniform.value < this.particleCountUniform.value) {
      this.fallIndexUniform.value = this.fallIndexUniform.value + 60;
    }
  };

  setParticleCount(value) {
    this.p2g1Kernel.count = value;
    this.p2g2Kernel.count = value;
    this.g2pKernel.count = value;
    this.p2g1Kernel.updateDispatchCount();
    this.p2g2Kernel.updateDispatchCount();
    this.g2pKernel.updateDispatchCount();
    this.particleMesh.count = value;
    this.particleCountUniform.value = value;
    this.yOffsetUniformPc.value = value * -0.000003158 + 0.0526316;
  }

  getParticleCount() {
    return this.particleCountUniform.value;
  }
}

export { JellyBeanGroup };
