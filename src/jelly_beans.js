import * as THREE from "three/webgpu";
import * as TSL from "three/tsl";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

const clock = new THREE.Clock();

const maxParticles = 23750;
const gridSize1d = 60;
const gridSize = new THREE.Vector3(gridSize1d, 60, gridSize1d);
const fixedPointMultiplier = 1e7;

let particleCountUniform,
  stiffnessUniform,
  restDensityUniform,
  dynamicViscosityUniform,
  dtUniform,
  gravityUniform,
  gridSizeUniform;
let particleBuffer, cellBuffer, cellBufferFloat;
let clearGridKernel, p2g1Kernel, p2g2Kernel, updateGridKernel, g2pKernel;
let particleMesh;
let fallIndexUniform;

let colors = [
  new THREE.Color("rgb(241, 224, 0)"),
  new THREE.Color("rgb(255, 112, 169)"),
  new THREE.Color("rgb(255, 44, 62)"),
  new THREE.Color("rgb(0, 193, 126)"),
  new THREE.Color("rgb(255, 117, 0)"),
];

/*let colors = [
    new THREE.Color("rgb(211, 30, 37)"),
    new THREE.Color("rgb(255, 235, 209)"),
    new THREE.Color("rgbr(58, 138, 68)"),
    new THREE.Color("rgb(151, 202, 63)"),
    new THREE.Color("rgb(1, 86, 143)"),
    new THREE.Color("rgb(242, 128, 47)"),
    new THREE.Color("rgb(255, 184, 201)"),
    new THREE.Color("rgb(111, 51, 22)"),
];*/

var tslColors = null;

function setupParticles(scene, params, gui) {
  setupBuffers();
  setupUniforms(params, gui);
  setupComputeShaders(params);
  setupMesh(scene, params);
}

function setupBuffers() {
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

  particleBuffer = TSL.instancedArray(particleArray, particleStruct);
  const cellCount = gridSize.x * gridSize.y * gridSize.z;

  const cellStruct = TSL.struct({
    x: { type: "int", atomic: true },
    y: { type: "int", atomic: true },
    z: { type: "int", atomic: true },
    mass: { type: "int", atomic: true },
  });

  cellBuffer = TSL.instancedArray(cellCount, cellStruct);
  cellBufferFloat = TSL.instancedArray(cellCount, "vec4");
}

function setupUniforms(params, gui) {
  gridSizeUniform = TSL.uniform(gridSize);
  particleCountUniform = TSL.uniform(params.particleCount, "uint");
  stiffnessUniform = TSL.uniform(1000);
  restDensityUniform = TSL.uniform(1);
  dynamicViscosityUniform = TSL.uniform(5);
  dtUniform = TSL.uniform(1 / 60);
  gravityUniform = TSL.uniform(new THREE.Vector3(0, params.gravityPull, 0));
  fallIndexUniform = TSL.uniform(-1);

  gui.add(stiffnessUniform, "value", 0, 1000).name("stiffness");
  gui.add(dynamicViscosityUniform, "value", 0, 100).name("dynamic viscosity");
  gui.add(dtUniform, "value", 0, 1).name("dt");
  gui.add(params, "gravityPull", -200, 0, -81).onChange((value) => {
    gravityUniform = TSL.uniform(new THREE.Vector3(0, params.gravityPull, 0));
  });
  gui.add(restDensityUniform, "value", 1.0, 3, 0.1).name("restDensity");
  // it's interesting to adjust the restDensity but it might cause the simulation to become unstable
}

function setupComputeShaders(params) {
  // the MLS-MPM system uses five compute shaders:
  // 1. clearGridKernel: this clears the grid before each pass
  // 2. p2g1Kernel & 3. p2g2Kernel: These particle2grid kernels transfer the particles' energy to the grid
  // 4. updateGridKernel: updates the grid
  // 5. g2pKernel: grid2particle kernel, transfers the grid energy back to the particles
  // the implementation closely follows https://github.com/matsuoka-601/WebGPU-Ocean

  // because webgpu only supports int atomics, we use fixed point floats by multiplying/dividing the float values with a high integer constant
  const encodeFixedPoint = (f32) => {
    return TSL.int(f32.mul(fixedPointMultiplier));
  };

  const decodeFixedPoint = (i32) => {
    return TSL.float(i32).div(fixedPointMultiplier);
  };

  const cellCount = gridSize.x * gridSize.y * gridSize.z;
  clearGridKernel = TSL.Fn(() => {
    TSL.If(TSL.instanceIndex.greaterThanEqual(TSL.uint(cellCount)), () => {
      TSL.Return();
    });

    TSL.atomicStore(cellBuffer.element(TSL.instanceIndex).get("x"), 0);
    TSL.atomicStore(cellBuffer.element(TSL.instanceIndex).get("y"), 0);
    TSL.atomicStore(cellBuffer.element(TSL.instanceIndex).get("z"), 0);
    TSL.atomicStore(cellBuffer.element(TSL.instanceIndex).get("mass"), 0);
  })().compute(cellCount);

  p2g1Kernel = TSL.Fn(() => {
    TSL.If(TSL.instanceIndex.greaterThanEqual(particleCountUniform), () => {
      TSL.Return();
    });
    const particlePosition = particleBuffer
      .element(TSL.instanceIndex)
      .get("position")
      .toConst("particlePosition");
    const particleVelocity = particleBuffer
      .element(TSL.instanceIndex)
      .get("velocity")
      .toConst("particleVelocity");
    const C = particleBuffer.element(TSL.instanceIndex).get("C").toConst("C");

    const gridPosition = particlePosition.mul(gridSizeUniform).toVar();
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
                  .mul(TSL.int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(TSL.int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();
                const cell = cellBuffer.element(cellPtr);

                TSL.atomicAdd(cell.get("x"), encodeFixedPoint(velContrib.x));
                TSL.atomicAdd(cell.get("y"), encodeFixedPoint(velContrib.y));
                TSL.atomicAdd(cell.get("z"), encodeFixedPoint(velContrib.z));
                TSL.atomicAdd(cell.get("mass"), encodeFixedPoint(massContrib));
              }
            );
          }
        );
      }
    );
  })().compute(params.particleCount);

  p2g2Kernel = TSL.Fn(() => {
    TSL.If(TSL.instanceIndex.greaterThanEqual(particleCountUniform), () => {
      TSL.Return();
    });
    const particlePosition = particleBuffer
      .element(TSL.instanceIndex)
      .get("position")
      .toConst("particlePosition");
    const gridPosition = particlePosition.mul(gridSizeUniform).toVar();

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
                  .mul(TSL.int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(TSL.int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();
                const cell = cellBuffer.element(cellPtr);
                const mass = decodeFixedPoint(TSL.atomicLoad(cell.get("mass")));
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
      TSL.pow(density.div(restDensityUniform), 5.0).sub(1).mul(stiffnessUniform)
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
    const dudv = particleBuffer
      .element(TSL.instanceIndex)
      .get("C")
      .toConst("C");

    const strain = dudv.add(dudv.transpose());
    stress.addAssign(strain.mul(dynamicViscosityUniform));
    const eq16Term0 = volume.mul(-4).mul(stress).mul(dtUniform);

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
                  .mul(TSL.int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(TSL.int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();
                const cell = cellBuffer.element(cellPtr);
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

  updateGridKernel = TSL.Fn(() => {
    TSL.If(TSL.instanceIndex.greaterThanEqual(TSL.uint(cellCount)), () => {
      TSL.Return();
    });
    const cell = cellBuffer.element(TSL.instanceIndex);
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

    const x = TSL.int(TSL.instanceIndex).div(TSL.int(gridSize.z * gridSize.y));
    const y = TSL.int(TSL.instanceIndex)
      .div(TSL.int(gridSize.z))
      .mod(TSL.int(gridSize.y));
    const z = TSL.int(TSL.instanceIndex).mod(TSL.int(gridSize.z));
    TSL.If(
      x
        .lessThan(TSL.int(1))
        .or(x.greaterThan(TSL.int(gridSize.x).sub(TSL.int(2)))),
      () => {
        vx.assign(0);
      }
    );
    TSL.If(
      y
        .lessThan(TSL.int(1))
        .or(y.greaterThan(TSL.int(gridSize.y).sub(TSL.int(2)))),
      () => {
        vy.assign(0);
      }
    );
    TSL.If(
      z
        .lessThan(TSL.int(1))
        .or(z.greaterThan(TSL.int(gridSize.z).sub(TSL.int(2)))),
      () => {
        vz.assign(0);
      }
    );

    cellBufferFloat
      .element(TSL.instanceIndex)
      .assign(TSL.vec4(vx, vy, vz, mass));
  })().compute(cellCount);

  const clampToRoundedBox = (pos, box, radius) => {
    const result = pos.sub(0.5).toVar();
    const pp = TSL.step(box, result.abs()).mul(
      result.add(box.negate().mul(result.sign()))
    );
    const ppLen = pp.length().toVar();
    const dist = ppLen.sub(radius);
    TSL.If(dist.greaterThan(0.0), () => {
      result.subAssign(pp.normalize().mul(dist).mul(1.3));
    });
    result.addAssign(0.5);
    return result;
  };

  g2pKernel = TSL.Fn(() => {
    TSL.If(TSL.instanceIndex.greaterThanEqual(particleCountUniform), () => {
      TSL.Return();
    });
    const particlePosition = particleBuffer
      .element(TSL.instanceIndex)
      .get("position")
      .toVar("particlePosition");
    const gridPosition = particlePosition.mul(gridSizeUniform).toVar();
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
                  .mul(TSL.int(gridSize.y * gridSize.z))
                  .add(cellX.y.mul(TSL.int(gridSize.z)))
                  .add(cellX.z)
                  .toConst();

                const weightedVelocity = cellBufferFloat
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

    particleBuffer.element(TSL.instanceIndex).get("C").assign(B.mul(4));

    // gravity
    particleVelocity.addAssign(gravityUniform.mul(dtUniform));

    // scale from (gridSize.x, gridSize.y, gridSize.z) to (1, 1, 1)
    particleVelocity.divAssign(gridSizeUniform);

    // add velocity to position
    particlePosition.addAssign(particleVelocity.mul(dtUniform));

    // TSL.clamp position so outermost gridCells are not reached
    particlePosition.assign(
      TSL.clamp(
        particlePosition,
        TSL.vec3(1).div(gridSizeUniform),
        TSL.vec3(gridSize).sub(1).div(gridSizeUniform)
      )
    );

    // add force for particles to stay within rounded box
    const innerBox = gridSizeUniform
      .mul(0.2) //changed from 0.3 to 0.2
      .sub(9.0)
      .div(gridSizeUniform)
      .toVar();
    const innerRadius = TSL.float(2.0).div(gridSizeUniform.x); //changed from 6.0 to 2.0
    const posNext = particlePosition
      .add(particleVelocity.mul(dtUniform).mul(2.0))
      .toConst("posNext");
    const posNextClamped = clampToRoundedBox(posNext, innerBox, innerRadius);
    particleVelocity.addAssign(posNextClamped.sub(posNext));

    // scale from (1, 1, 1) back to (gridSize.x, gridSize.y, gridSize.z) to
    particleVelocity.mulAssign(gridSizeUniform);

    TSL.If(
      fallIndexUniform
        .greaterThanEqual(TSL.instanceIndex)
        .and(fallIndexUniform.lessThan(TSL.instanceIndex.add(60))),
      () => {
        TSL.If(
          particleBuffer.element(TSL.instanceIndex).get("rolled").lessThan(1),
          () => {
            var randX = TSL.float(0.5).add(
              TSL.hash(TSL.instanceIndex).sub(0.5).mul(0.3)
            );
            var randZ = TSL.float(0.5).add(
              TSL.hash(fallIndexUniform).sub(0.5).mul(0.3)
            );
            particleVelocity.assign(TSL.vec3(0, 0, 0));
            particlePosition.assign(TSL.vec3(randX, 1, randZ));
            particleBuffer.element(TSL.instanceIndex).get("rolled").assign(1);
          }
        );
      }
    );

    particleBuffer
      .element(TSL.instanceIndex)
      .get("position")
      .assign(particlePosition);
    TSL.If(
      particleBuffer.element(TSL.instanceIndex).get("rolled").lessThan(1),
      () => {
        particleBuffer
          .element(TSL.instanceIndex)
          .get("position")
          .assign(TSL.vec3(0, 0, 0));
      }
    );

    particleBuffer
      .element(TSL.instanceIndex)
      .get("velocity")
      .assign(particleVelocity);
  })().compute(params.particleCount);
}

var meshMaterial, geometry;

function setupMesh(scene, params) {
  // mergeVertices to reduce the number of vertexShaderCalls
  var capsule = new THREE.CapsuleGeometry(0.005, 0.005, 4, 8).deleteAttribute(
    "uv"
  );

  geometry = BufferGeometryUtils.mergeVertices(capsule);

  geometry.rotateX(3.14 / 2);

  /*meshMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff000),
    roughness: 0.3,
    metalness: 0.3,
  });
  meshMaterial = new THREE.MeshPhongNodeMaterial({
    shininess: 12,
    specular: new THREE.Color(0xfff000),
  });*/

  meshMaterial = new THREE.MeshPhysicalMaterial({
    roughness: 0.5, // some gloss
    metalness: 0.0, // candy isn’t metallic
    clearcoat: 0.3, // candy shell shine
    sheen: new THREE.Color(0xffffff), // optional subtle soft reflection
    transmission: 0.1, // slight translucency
  });
  meshMaterial.envMapIntensity = 5;

  meshMaterial.positionNode = TSL.Fn(() => {
    var particlePosition = particleBuffer
      .element(TSL.instanceIndex)
      .get("position");
    return TSL.attribute("position").add(particlePosition);
  })();

  meshMaterial.vertexNode = jellyBeanVertex();
  meshMaterial.colorNode = getRandomColor();

  particleMesh = new THREE.Mesh(geometry, meshMaterial);

  particleMesh.count = params.particleCount;
  particleMesh.position.set(-0.5, -0.4, -0.5);

  particleMesh.frustumCulled = false;
  scene.add(particleMesh);
}

const jellyBeanVertex = TSL.Fn(() => {
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
  var particlePosition = particleBuffer
    .element(TSL.instanceIndex)
    .get("position");
  const localPosition = rotationMatrix.mul(TSL.positionGeometry);
  const worldPosition = localPosition.add(particlePosition);
  worldPosition.addAssign(TSL.vec3(-0.5, -0.5, -0.5));
  const viewProjPosition = TSL.cameraProjectionMatrix.mul(
    TSL.cameraViewMatrix.mul(worldPosition)
  );
  return viewProjPosition;
});

const getRandomColor = TSL.Fn(() => {
  if (tslColors == null) {
    tslColors = TSL.color(0, 0, 0).toArray(colors.length);
    for (var i = 0; i < colors.length; i++) {
      var c = colors[i];
      tslColors.element(i).assign(TSL.color(c.r, c.g, c.b));
    }
  }
  const seed = TSL.instanceIndex.mod(8).toVar();
  return tslColors.element(seed);
});

const renderFunction = async (renderer, paused) => {
  const deltaTime = THREE.MathUtils.clamp(clock.getDelta(), 0.00001, 1 / 60); // don't advance the time too far, for example when the window is out of focus
  dtUniform.value = deltaTime;

  if (!paused) {
    await renderer.computeAsync([
      clearGridKernel,
      p2g1Kernel,
      p2g2Kernel,
      updateGridKernel,
      g2pKernel,
    ]);
  }
  fallIndexUniform.value = fallIndexUniform.value + 100;
};

function setParticleCount(value) {
  p2g1Kernel.count = value;
  p2g2Kernel.count = value;
  g2pKernel.count = value;
  p2g1Kernel.updateDispatchCount();
  p2g2Kernel.updateDispatchCount();
  g2pKernel.updateDispatchCount();
  particleMesh.count = value;
  particleCountUniform.value = value;
}

export { setupParticles, renderFunction, setParticleCount };
