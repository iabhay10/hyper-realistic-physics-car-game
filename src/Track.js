import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import PhysicsAdapter from './PhysicsAdapter.js';

class Track {
    constructor(scene) {
        this.scene = scene;
        this.mesh = null;
        this.body = null;

        this.createTrack();
    }

    createTrack() {
        const trackRadius = 50;
        const trackWidth = 10;
        const trackSegments = 64;

        const shape = new THREE.Shape();
        shape.moveTo(trackRadius, 0);
        shape.absarc(0, 0, trackRadius, 0, Math.PI * 2, false);
        const hole = new THREE.Path();
        hole.moveTo(trackRadius - trackWidth, 0);
        hole.absarc(0, 0, trackRadius - trackWidth, 0, Math.PI * 2, true);
        shape.holes.push(hole);

        const geometry = new THREE.ExtrudeGeometry(shape, {
            depth: 1,
            bevelEnabled: false,
        });
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({ color: 0x808080 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);

        // Create the physics body
        const vertices = geometry.attributes.position.array;
        const indices = new Uint32Array(geometry.index.array);
        const trackDesc = RAPIER.RigidBodyDesc.fixed();
        const trackColliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices);
        this.body = PhysicsAdapter.createRigidBody(trackDesc, trackColliderDesc);
    }
}

export default Track;
