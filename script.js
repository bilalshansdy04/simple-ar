import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165/build/three.module.js";
import { ARButton } from "https://cdn.jsdelivr.net/npm/three@0.165/examples/jsm/webxr/ARButton.js";

let camera, scene, renderer;
let reticle, hitTestSource = null, hitTestSourceRequested = false;
let placedObject = null;

init();
animate();

function init() {
  // SCENE
  scene = new THREE.Scene();

  // CAMERA
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // RENDERER
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // RETICLE (penanda lantai)
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x19b096 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // BUTTON AR
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
  });
  document.getElementById("arButton").replaceWith(arButton);
}

function placeObject() {
  const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
  const material = new THREE.MeshStandardMaterial({ color: 0x19b096 });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.setFromMatrixPosition(reticle.matrix);
  mesh.quaternion.setFromRotationMatrix(reticle.matrix);

  scene.add(mesh);
  placedObject = mesh;
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

        // Tap to place
        window.addEventListener("click", () => {
          if (!placedObject && reticle.visible) placeObject();
        });
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
