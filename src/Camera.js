import * as THREE from 'three';

class Camera {
    constructor(camera, vehicle) {
        this.camera = camera;
        this.vehicle = vehicle;
        this.target = new THREE.Vector3();
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.stiffness = 10;
        this.damping = 5;
    }

    update(deltaTime) {
        if (!this.vehicle.chassis) return;

        const chassisPosition = this.vehicle.chassis.position;
        const chassisQuaternion = this.vehicle.chassis.quaternion;

        // Calculate the desired camera position behind the car
        const desiredOffset = new THREE.Vector3(0, 5, -10);
        desiredOffset.applyQuaternion(chassisQuaternion);
        const desiredPosition = chassisPosition.clone().add(desiredOffset);

        // Update the camera position using a spring-damper system
        const force = desiredPosition.clone().sub(this.position).multiplyScalar(this.stiffness);
        const dampingForce = this.velocity.clone().multiplyScalar(-this.damping);
        const acceleration = force.add(dampingForce);
        this.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.position.add(this.velocity.clone().multiplyScalar(deltaTime));

        this.camera.position.copy(this.position);
        this.camera.lookAt(chassisPosition);
    }
}

export default Camera;
