import * as THREE from "three/webgpu";
import * as TWEEN from "https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { JellyBeanGroup } from "./JellyBeanGroup.js";
import WebGPU from "three/addons/capabilities/WebGPU.js";
import * as BufferGeometryUtils from "three/addons/utils/BufferGeometryUtils.js";

import containersJson from "./json/containers.json";

let renderer, scene, camera, controls, jarModel;
var jellyBeanSims = {};
var containerModels = {};
const maxParticles = 23750;
const containers = containersJson["containers"];
const positions = containersJson["positions"];

var jellyBeansSetUp = false;
var totalJellyBeans = 0;
var totalJellyBeansLeft = 0;

if (WebGPU.isAvailable() === false) {
  document.body.appendChild(WebGPU.getErrorMessage());
  throw new Error("No WebGPU support");
}

const gui = new GUI();

const params = {
  particleCount: 23750,
  gravityPull: -(9.81 * 9.81),
};

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

  const rgbeLoader = new RGBELoader().setPath("");

  const hdrTexture = await rgbeLoader.loadAsync(
    "public/kloppenheim_06_puresky_4k.hdr"
  );
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = new THREE.Color("rgba(175, 243, 255, 1)");

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

  controls = new OrbitControls(camera, renderer.domElement);

  controls.maxPolarAngle = Math.PI * 0.35;
  controls.enableZoom = false;
  controls.enablePan = false;
  //controls.autoRotate = true;
  controls.touches = { TWO: THREE.TOUCH.DOLLY_ROTATE };
  //controls.target = jarModel.positions;

  controls.update();
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
}

function animateCameraZoom() {
  const coords = {
    x: camera.position.x,
    y: camera.position.y,
    z: camera.position.z,
  };
  new TWEEN.Tween(coords)
    .to({ x: -0.75, y: 0.6, z: -0.75 }, 2000)
    .onUpdate(() => camera.position.set(coords.x, coords.y, coords.z))
    .easing(TWEEN.Easing.Quadratic.InOut)
    .delay(800)
    .start();
}

function onQuestionsAnswered() {
  animateCameraZoom();
}

function showJellyBeans(
  index = 0,
  amount = -1,
  container = {},
  pos = [0, 0, 0]
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
    gui
      .add(params, "particleCount", 100, maxParticles, 10)
      .onChange((value) => {
        group.setParticleCount(value);
      });
    jellyBeansSetUp = true;
    controls.autoRotate = false;
    group.setParticleCount(params.particleCount);
    setTimeout(() => {
      //paused = true;
    }, 3500);
  }, 1000);
}

const loader = new GLTFLoader();
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
  console.log("Setting up " + c.id + " at " + p);
  return new Promise((resolve, reject) => {
    loader.load("public/" + c.file, async function (gltf) {
      var model = gltf.scene;
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

function getRandomPosition() {
  var index = Math.floor(Math.random() * positions.length);
  var position = positions[index];
  positions.splice(index, 1);
  console.log(position, positions);
  return position;
}

function setUpTest() {
  const threeTone = new THREE.TextureLoader().load("/public/threeTone.jpg");
  threeTone.minFilter = THREE.NearestFilter;
  threeTone.magFilter = THREE.NearestFilter;
  var meshMaterial = new THREE.MeshToonMaterial({
    color: 0xffffff,
    map: threeTone,
    side: THREE.FrontSide,
  });

  var capsule = new THREE.CapsuleGeometry(0.005, 0.005, 4, 8);
  var geometry = BufferGeometryUtils.mergeVertices(capsule);

  geometry.rotateX(3.14 / 2);
  var particleMesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial());
  scene.add(particleMesh);
}

async function onCategorySet(e) {
  console.log(totalJellyBeans, e.detail.percent);
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

  console.log(
    "cat " +
      e.detail.index +
      " is " +
      e.detail.percent * 100 +
      " % for total of " +
      subamount +
      " and total left is " +
      totalJellyBeansLeft
  );

  if (editedCategory) {
    jellyBeanSims[e.detail.index].setParticleCount(subamount);
  } else {
    var c = getContainer(subamount);
    var p = getRandomPosition();
    var model = await setUpContainer(c, p);
    containerModels[e.detail.index] = model;

    console.log(c);
    showJellyBeans(e.detail.index, subamount, c, p);
  }
  jellyBeanSims[0].setParticleCount(totalJellyBeansLeft);
}

function onResetCategory(e) {
  console.log("resetting category " + e.detail.index);

  var model = containerModels[e.detail.index];
  var jellyBeanSim = jellyBeanSims[e.detail.index];
  var amount = jellyBeanSim.getParticleCount();
  scene.remove(model);
  scene.remove(jellyBeanSim.particleMesh);
  delete containerModels[e.detail.index];
  delete jellyBeanSims[e.detail.index];

  totalJellyBeansLeft += amount;
  jellyBeanSims[0].setParticleCount(totalJellyBeansLeft);
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

var paused = false;
function setupInputs() {
  const onKeyDown = (e) => {
    if (e.key == "s") {
      document.getElementById("text-container").style.display = "none";
      document.getElementById("categories").style.opacity = 1;
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

async function render() {
  TWEEN.update();
  controls.update();
  if (!jellyBeansSetUp) {
    await renderer.renderAsync(scene, camera);
    return;
  }
  for (const index of Object.keys(jellyBeanSims)) {
    await jellyBeanSims[index].renderFunction(renderer, paused);
  }

  await renderer.renderAsync(scene, camera);
}
