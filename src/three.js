import * as THREE from "three/webgpu";
import * as TWEEN from "https://unpkg.com/@tweenjs/tween.js@23.1.3/dist/tween.esm.js";

import { GUI } from "three/addons/libs/lil-gui.module.min.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  setupParticles,
  renderFunction,
  setParticleCount,
} from "./jelly_beans.js";

import WebGPU from "three/addons/capabilities/WebGPU.js";

let renderer, scene, camera, controls, jarModel;

const maxParticles = 23750;

var jellyBeansSetUp = false;

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
    "kloppenheim_06_puresky_4k.hdr"
  );
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdrTexture;
  scene.backgroundBlurriness = 0.5;
  scene.environment = hdrTexture;

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xeeeeee, 0.6);
  scene.add(hemiLight);

  await setupJar();

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.y = 7;
  directionalLight.position.z = 0;
  directionalLight.target = jarModel;

  const light = new THREE.AmbientLight(0x404040, 25); // soft white light
  scene.add(light);
  scene.add(directionalLight);

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
    console.log(e);
    showJellyBeans(e.detail.days);
  });
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

function showJellyBeans(amount = -1) {
  if (amount != -1) {
    params.particleCount = amount;
  }
  setTimeout(() => {
    setupParticles(scene, params, gui);
    gui
      .add(params, "particleCount", 4096, maxParticles, 10)
      .onChange((value) => {
        setParticleCount(value);
      });
    jellyBeansSetUp = true;
    setTimeout(() => {
      //paused = true;
    }, 3500);
  }, 1000);
}

async function setupJar() {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load("/jar2.glb", async function (gltf) {
      jarModel = gltf.scene;
      jarModel.scale.set(4.8, 3, 4.8);
      jarModel.position.set(0, -0.17, 0);
      scene.add(jarModel);
      resolve(gltf);
    });
  });
}

var paused = false;
function setupInputs() {
  const onKeyDown = (e) => {
    console.log(e);
    if (e.key == "s") {
      document.getElementById("content").style.display = "none";
      animateCameraZoom();
      showJellyBeans();
      controls.enableZoom = true;
      controls.enablePan = true;
    }

    //paused = !paused;
    /*var oldCount = particleCountUniform.value;
        console.log(oldCount)
        setParticleCount(0);
        var curr = 0;
        setInterval(() => {
            if (curr < oldCount) {
                curr = Math.min(curr + 800, oldCount);
                setParticleCount(curr)
            }
        }, 10);*/
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
  renderFunction(renderer, paused);

  await renderer.renderAsync(scene, camera);
}
