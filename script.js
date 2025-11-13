import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165/build/three.module.js";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.165/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.165/examples/jsm/webxr/ARButton.js";

let camera, scene, renderer;
let reticle, hitTestSource = null, hitTestSourceRequested = false;
let placedObject = null;

init();
animate();

function init() {
  // SCENE
  scene = new THREE.Scene();

  // LIGHT
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // CAMERA
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // RETICLE (cari lantai)
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x19b096 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // AR BUTTON
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"]
  });
  document.getElementById("arButton").replaceWith(arButton);
}

function placeGLB() {
  const loader = new GLTFLoader();
  loader.load("Bola.glb", (gltf) => {
    const model = gltf.scene;

    // posisikan model tepat di lokasi reticle
    model.position.setFromMatrixPosition(reticle.matrix);
    model.quaternion.setFromRotationMatrix(reticle.matrix);

    // skalakan kalau terlalu besar
    model.scale.set(0.3, 0.3, 0.3);

    scene.add(model);
    placedObject = model;
  });
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const session = renderer.xr.getSession();

    if (!hitTestSourceRequested) {
      session.requestReferenceSpace("viewer").then((refSpace) => {
        session.requestHitTestSource({ space: refSpace }).then((source) => {
          hitTestSource = source;
        });
      });

      session.addEventListener("end", () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const pose = hitTestResults[0].getPose(referenceSpace);

        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);

        // tap layar untuk place model
        window.addEventListener("click", () => {
          if (!placedObject && reticle.visible) placeGLB();
        });
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
