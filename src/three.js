import * as THREE from "three/webgpu";
import * as TWEEN from "https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three-stdlib";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { JellyBeanGroup } from "./JellyBeanGroup.js";
import WebGPU from "three/addons/capabilities/WebGPU.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

import containersJson from "./json/containers.json";

let renderer, scene, camera, controls, banana, bananaShowing;
var jellyBeanSims = {};
var containerModels = {};
const containers = containersJson["containers"];
const positions = containersJson["positions"];
var currentContainerIndex = 0;

var jellyBeansSetUp = false;
var totalJellyBeans = 0;
var totalJellyBeansLeft = 0;
var manager = null;
var gltfLoader = null;

if (WebGPU.isAvailable() === false) {
  document.body.appendChild(WebGPU.getErrorMessage());
  throw new Error("No WebGPU support");
}

//const gui = new GUI();

const params = {
  particleCount: 23750,
  gravityPull: -(9.81 * 9.81),
};
console.log(window);
window.addEventListener("load", function () {
  console.log("window loaded");
  document.addEventListener("data-loaded", onDataLoaded);
});
init();
async function init() {
  renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  //renderer.toneMapping = THREE.ACESFilmicToneMapping;
  //srenderer.toneMappingExposure = 1.2;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    40,
    window.innerWidth / window.innerHeight,
    0.01,
    10
  );
  camera.position.set(-1.5, 0.75, -1.5);

  controls = new OrbitControls(camera, renderer.domElement);
  //controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableRotate = true;
  controls.maxPolarAngle = 1.1;
  controls.minPolarAngle = 0.85;
  controls.maxDistance = 3;
  controls.minDistance = 0.6;
  //controls.autoRotate = true;
  controls.touches = { TWO: THREE.TOUCH.DOLLY_ROTATE };
  controls.update();

  manager = new THREE.LoadingManager();
  manager.onLoad = () => {
    console.log("Loading complete!");
    document.dispatchEvent(new CustomEvent("three-loaded"));
  };

  const rgbeLoader = new RGBELoader(manager).setPath("");
  gltfLoader = new GLTFLoader(manager);

  const hdrTexture = await rgbeLoader.loadAsync(
    "./kloppenheim_06_puresky_4k.hdr"
  );
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = new THREE.Color("rgba(146, 239, 255, 1)");

  scene.backgroundBlurriness = 0.5;
  scene.environment = hdrTexture;
  //scene.environmentIntensity = 1;

  const planeGeometry = new THREE.PlaneGeometry(15, 15);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotateX(-1.57);
  plane.position.y -= 0.16;
  plane.receiveShadow = true;
  scene.add(plane);

  var jarModel = await setUpContainer(containers["jar"], [0, -0.17, 0]);
  containerModels[0] = jarModel;

  //setUpTest();

  const light = new THREE.PointLight(0xffffff, 300);
  light.castShadow = true;
  light.shadow.camera.near = 0.01;
  light.shadow.camera.far = 10;
  light.shadow.mapSize = new THREE.Vector2(2000, 2000);
  light.shadow.bias = 0.0001;
  light.position.set(2, 5.4, 0);

  scene.add(light);

  setupInputs();

  window.addEventListener("resize", onWindowResize);

  renderer.setAnimationLoop(render);

  document.addEventListener("answered-questions", onQuestionsAnswered);
  document.addEventListener("show-jelly-beans", (e) => {
    showJellyBeans(0, e.detail.days, containers["jar"]);
    totalJellyBeans = e.detail.days;
    totalJellyBeansLeft = e.detail.days;
    setTimeout(() => {
      controls.autoRotate = true;
    }, 6000);
  });
  document.addEventListener("category-set", onCategorySet);
  document.addEventListener("reset-category", onResetCategory);
  document.addEventListener("highlight-category", onHighlightCategory);
  document.addEventListener("unhighlight-category", onUnhighlightCategory);
  document.addEventListener("category-selected", onCategorySelected);
  document.addEventListener("toggle-banana", toggleBanana);
}

function animateCameraZoom() {
  const coords = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };
  controls.enabled = false;
  new TWEEN.Tween(coords)
    .to({ x: -0.9, y: 0.6, z: -0.9 }, 2000)
    .onUpdate(() => camera.position.set(coords.x, coords.y, coords.z))
    .easing(TWEEN.Easing.Quadratic.InOut)
    .delay(800)
    .onComplete(() => {
      controls.enabled = true;
    })
    .start();
}

function moveCameraToGroup(
  group,
  index,
  azimuth,
  radius = -1,
  polarAngle = -1
) {
  currentContainerIndex = index;
  if (banana) {
    var offset = group.container.bananaPosOffset;
    banana.position.set(
      group.position[0] + offset[0],
      group.position[1] + offset[1],
      group.position[2] + offset[2]
    );
  }

  var spherical = new THREE.Spherical();
  var currAzimuth = controls.getAzimuthalAngle();
  var r = radius == -1 ? 1.5 : radius;
  var p = polarAngle == -1 ? 0.85 : polarAngle;

  var distance = Math.abs(currAzimuth - azimuth);
  if (distance > Math.abs(currAzimuth + 2 * Math.PI - azimuth)) {
    currAzimuth += 2 * Math.PI;
  } else if (distance > Math.abs(currAzimuth - 2 * Math.PI - azimuth)) {
    currAzimuth -= 2 * Math.PI;
  }

  spherical.radius = controls.getDistance();
  spherical.phi = controls.getPolarAngle();
  spherical.theta = currAzimuth;
  var sphericalObj = {
    a: currAzimuth,
    r: controls.getDistance(),
    p: controls.getPolarAngle(),

    x: controls.target.x,
    y: controls.target.y,
    z: controls.target.z,
  };

  controls.enabled = false;
  var cameraTween = new TWEEN.Tween(sphericalObj)
    .to(
      {
        a: azimuth,
        r: r,
        p: p,
        x: group.position[0],
        y: group.position[1] + 0.3,
        z: group.position[2],
      },
      2000
    )
    .onUpdate(() => {
      spherical.theta = sphericalObj.a;
      spherical.radius = sphericalObj.r;
      spherical.phi = sphericalObj.p;

      // Create a temporary vector for the new camera position relative to target
      const target = new THREE.Vector3(
        sphericalObj.x,
        sphericalObj.y,
        sphericalObj.z
      );
      const newPos = new THREE.Vector3()
        .setFromSpherical(spherical)
        .add(target);

      camera.position.copy(newPos);
      controls.target.copy(target);
    })
    .onComplete(() => {
      controls.enabled = true;
    });

  cameraTween.start();
}

function onQuestionsAnswered() {
  animateCameraZoom();
}

function showJellyBeans(
  index = 0,
  amount = -1,
  container = {},
  pos = [0, 0, 0, 0]
) {
  if (amount != -1) {
    params.particleCount = amount;
  }
  setTimeout(() => {
    var gridSize = null;
    var group = new JellyBeanGroup(
      scene,
      params,
      container,
      pos,
      index,
      gridSize
    );
    jellyBeanSims[index] = group;
    /*gui
      .add(params, "particleCount", 100, maxParticles, 10)
      .onChange((value) => {
        group.setParticleCount(value);
      });*/
    jellyBeansSetUp = true;
    controls.autoRotate = false;
    group.setParticleCount(params.particleCount);

    if (index != 0) {
      moveCameraToGroup(jellyBeanSims[index], index, pos[3]);
    }

    setTimeout(() => {
      //paused = true;
    }, 3500);
  }, 1000);
}

const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.04,
  roughness: 0.08,
  ior: 1.25,
  //envMap: hdrEquirect,
  //envMapIntensity: 1,
  transmission: 1, // use material.transmission for glass materials
  specularIntensity: 1,
  specularColor: 0xffffff,
  opacity: 1,
  side: THREE.DoubleSide,
  transparent: true,
});

const highlightMat = new THREE.MeshPhysicalMaterial({
  color: 0xffedab,
  metalness: 0.04,
  roughness: 0.08,
  ior: 1.25,
  //envMap: hdrEquirect,
  //envMapIntensity: 1,
  transmission: 1, // use material.transmission for glass materials
  specularIntensity: 1,
  specularColor: 0xffedab,
  opacity: 1,
  side: THREE.DoubleSide,
  transparent: true,
});

async function setUpContainer(c, p = [0, 0, 0]) {
  return new Promise((resolve, reject) => {
    gltfLoader.load("./" + c.file, async function (gltf) {
      var model = gltf.scene;
      model.def = c;
      model.scale.set(c.scale[0], c.scale[1], c.scale[2]);
      model.position.set(p[0], p[1], p[2]);
      model.castShadow = true;
      model.receiveShadow = true;
      model.traverse((o) => {
        if (o.isMesh) {
          o.material = glassMat;
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      scene.add(model);
      resolve(model);
    });
  });
}

function getContainer(amt) {
  var potential = [];
  var keys = Object.keys(containers);
  for (var i = 0; i < keys.length; i++) {
    var id = keys[i];
    if (containers[id].max >= amt && containers[id].min <= amt) {
      potential.push(containers[id]);
    }
  }
  return potential[Math.floor(Math.random() * potential.length)];
}

async function onCategorySet(e) {
  var subamount = Math.round(totalJellyBeans * e.detail.percent);
  var editedCategory = e.detail.index in jellyBeanSims;

  var amountToSubtractFromTotal = subamount;
  if (editedCategory) {
    amountToSubtractFromTotal =
      subamount - jellyBeanSims[e.detail.index].getParticleCount();
  }

  if (totalJellyBeansLeft - amountToSubtractFromTotal >= 0) {
    totalJellyBeansLeft -= amountToSubtractFromTotal;
  } else {
    document.dispatchEvent(new Event("overboard", { bubbles: true }));
    return;
  }

  if (Object.keys(jellyBeanSims).length == 1) {
    document.getElementById("container-title-0").style.display = "block";
  }

  if (editedCategory) {
    var container = containerModels[e.detail.index];
    console.log(subamount, container.def.max, container.def.min);
    if (subamount > container.def.max || subamount < container.def.min) {
      scene.remove(container);
      scene.remove(jellyBeanSims[e.detail.index].particleMesh);
      var c = getContainer(subamount);
      var p = positions[e.detail.index - 1];
      var model = await setUpContainer(c, p);
      containerModels[e.detail.index] = model;
      showJellyBeans(e.detail.index, subamount, c, p);
    } else {
      jellyBeanSims[e.detail.index].setParticleCount(subamount);
    }
  } else {
    var c = getContainer(subamount);
    var p = positions[e.detail.index - 1];
    var model = await setUpContainer(c, p);
    containerModels[e.detail.index] = model;
    console.log("adding container ", c);
    showJellyBeans(e.detail.index, subamount, c, p);
  }
  jellyBeanSims[0].setParticleCount(totalJellyBeansLeft);
}

function onResetCategory(e) {
  console.log("resetting category " + e.detail.index);

  var model = containerModels[e.detail.index];
  var jellyBeanSim = jellyBeanSims[e.detail.index];
  if (jellyBeanSim == null) return;
  var amount = jellyBeanSim.getParticleCount();
  scene.remove(model);
  scene.remove(jellyBeanSim.particleMesh);
  delete containerModels[e.detail.index];
  delete jellyBeanSims[e.detail.index];

  totalJellyBeansLeft += amount;
  jellyBeanSims[0].setParticleCount(totalJellyBeansLeft);
  moveCameraToGroup(jellyBeanSims[0], 0, -2.35, 1.4, 1.1);
}

function onHighlightCategory(e) {
  var model = containerModels[e.detail.index];
  if (!model) {
    return;
  }
  model.traverse((o) => {
    if (o.isMesh) {
      o.material = highlightMat;
    }
  });
}

function onUnhighlightCategory(e) {
  var model = containerModels[e.detail.index];
  if (!model) {
    return;
  }
  model.traverse((o) => {
    if (o.isMesh) {
      o.material = glassMat;
    }
  });
}

function onCategorySelected(e) {
  var group = jellyBeanSims[e.detail.index];
  if (group) {
    if (e.detail.index == 0) {
      moveCameraToGroup(group, 0, -2.35, 1.4, 1.1);
    } else {
      moveCameraToGroup(group, e.detail.index, group.position[3]);
    }
  }
}

function onDataLoaded(e) {
  console.log("days: " + e.detail.days);
  document.getElementById("text-container").style.display = "none";
  document.getElementById("categories").style.opacity = 1;
  setTimeout(
    () => (document.getElementById("container-label-0").style.opacity = 1),
    1500
  );
  animateCameraZoom();
  totalJellyBeans = e.detail.days;
  totalJellyBeansLeft = e.detail.days;
  showJellyBeans(0, -1, containers["jar"]);
}

var paused = false;

function setupInputs() {
  const onKeyDown = (e) => {
    console.log("azimuth: " + controls.getAzimuthalAngle());
    console.log("distance: " + controls.getDistance());
    console.log("polar angle: " + controls.getPolarAngle());
    console.log(containerModels, jellyBeanSims);

    if (e.key == "s") {
      document.getElementById("text-container").style.display = "none";
      document.getElementById("categories").style.opacity = 1;
      setTimeout(
        () => (document.getElementById("container-label-0").style.opacity = 1),
        1500
      );

      animateCameraZoom();
      totalJellyBeans = params.particleCount;
      totalJellyBeansLeft = params.particleCount;
      showJellyBeans(0, -1, containers["jar"]);
      controls.enableZoom = true;
      controls.enablePan = true;
    }
    //paused = !paused;
  };

  document.addEventListener("keydown", onKeyDown);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function toScreenPosition(obj) {
  var vector = new THREE.Vector3();

  var widthHalf = 0.5 * window.innerWidth;
  var heightHalf = 0.5 * window.innerHeight;

  obj.updateMatrixWorld();
  vector.setFromMatrixPosition(obj.matrixWorld);
  vector.project(camera);

  vector.x = vector.x * widthHalf + widthHalf;
  vector.y = -(vector.y * heightHalf) + heightHalf;

  return {
    x: vector.x,
    y: vector.y,
    distance: camera.position.distanceTo(obj.position),
  };
}

async function toggleBanana() {
  var group = jellyBeanSims[currentContainerIndex];
  if (!banana) {
    banana = await new Promise((resolve, reject) => {
      gltfLoader.load("./banana.glb", async function (gltf) {
        let textureLoader = new THREE.TextureLoader(manager);
        let map = textureLoader.load("./Banana_BaseColor.png");
        let normalMap = textureLoader.load("./Banana_Normal.png");
        let aoMap = textureLoader.load("./Banana_AO.png");
        let roughnessMap = textureLoader.load("./Banana_Roughness.png");
        let metallicMap = textureLoader.load("./Banana_Metallic.png");
        const bananaMat = new THREE.MeshStandardMaterial({
          map: map,
          normalMap: normalMap,
          aoMap: aoMap,
          roughnessMap: roughnessMap,
          metalnessMap: metallicMap,
        });

        var model = gltf.scene;
        model.scale.set(2, 2, 2);

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = bananaMat;
            child.castShadow = true;
          }
        });
        scene.add(model);
        resolve(model);
      });
    });
  }
  var offset = group.container.bananaPosOffset;
  banana.position.set(
    group.position[0] + offset[0],
    group.position[1] + offset[1],
    group.position[2] + offset[2]
  );
  bananaShowing = !bananaShowing;
  banana.visible = bananaShowing;
}

async function render() {
  TWEEN.update();
  controls.update();
  if (banana && banana.visible) {
    banana.rotation.y += 0.004;
  }
  if (!jellyBeansSetUp) {
    await renderer.renderAsync(scene, camera);
    return;
  }
  for (const index of Object.keys(jellyBeanSims)) {
    await jellyBeanSims[index].renderFunction(renderer, paused);
  }
  var containerData = [];
  for (const [index, model] of Object.entries(containerModels)) {
    var screenPos = toScreenPosition(model);
    screenPos.amount = jellyBeanSims[index]
      ? jellyBeanSims[index].getParticleCount()
      : 0;
    screenPos.index = index;
    screenPos.yOffset =
      jellyBeanSims[index] &&
      jellyBeanSims[index].container &&
      jellyBeanSims[index].container.labelYOffset != undefined
        ? jellyBeanSims[index].container.labelYOffset
        : 0;
    screenPos.percentage = (100 * screenPos.amount) / totalJellyBeans;
    containerData.push(screenPos);
  }

  document.dispatchEvent(
    new CustomEvent("screen-data", {
      detail: { data: containerData },
    })
  );
  //console.log(controls.getAzimuthalAngle());

  await renderer.renderAsync(scene, camera);
}
