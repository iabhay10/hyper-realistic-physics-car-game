import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import PhysicsAdapter from './PhysicsAdapter.js';
import Vehicle from './Vehicle.js';
import Controls from './Controls.js';
import Camera from './Camera.js';
import Track from './Track.js';
import UI from './UI.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(10, 20, 0);
directionalLight.castShadow = true;
scene.add(directionalLight);

let vehicle;
let chaseCamera;
let track;
const clock = new THREE.Clock();

async function initPhysics() {
    await PhysicsAdapter.init();

    track = new Track(scene);
    vehicle = new Vehicle(scene);
    chaseCamera = new Camera(camera, vehicle);
}


// Animation loop
function animate() {
    requestAnimationFrame(animate);

    const deltaTime = clock.getDelta();

    // Step the physics world
    PhysicsAdapter.step();

    if (vehicle) {
        if (Controls.forward) {
            vehicle.throttle = 1;
        } else if (Controls.backward) {
            vehicle.throttle = -1;
        } else {
            vehicle.throttle = 0;
        }

        if (Controls.left) {
            vehicle.steering = 0.5;
        } else if (Controls.right) {
            vehicle.steering = -0.5;
        } else {
            vehicle.steering = 0;
        }

        vehicle.handbrake = Controls.handbrake;

        vehicle.update(deltaTime);
    }

    if (chaseCamera) {
        chaseCamera.update(deltaTime);
    }

    UI.update(vehicle);

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

initPhysics().then(() => {
    animate();
});
