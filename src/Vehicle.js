import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import PhysicsAdapter from './PhysicsAdapter.js';
import { tuning } from './tuning.js';

class Vehicle {
    constructor(scene) {
        this.scene = scene;
        this.chassis = null;
        this.chassisBody = null;
        this.wheels = [];

        this.throttle = 0;
        this.steering = 0;
        this.handbrake = false;

        // Vehicle properties for raycasting
        this.suspensionStiffness = tuning.suspensionStiffness;
        this.suspensionDamping = tuning.suspensionDamping;
        this.suspensionRestLength = tuning.suspensionRestLength;
        this.suspensionTravel = tuning.suspensionTravel;
        this.wheelRadius = tuning.wheelRadius;
        this.tireGrip = tuning.tireGrip;
        this.tireSideGrip = tuning.tireSideGrip;
        this.motorTorque = tuning.motorTorque;
        this.brakingForce = tuning.brakingForce;
        this.wheelPositions = [
            new THREE.Vector3(1.2, -0.2, 1.5),   // Front-right
            new THREE.Vector3(-1.2, -0.2, 1.5),  // Front-left
            new THREE.Vector3(1.2, -0.2, -1.5),  // Rear-right
            new THREE.Vector3(-1.2, -0.2, -1.5)   // Rear-left
        ];

        this.createChassis();
        this.createWheels();
    }

    createChassis() {
        // Create the chassis mesh
        const chassisGeometry = new THREE.BoxGeometry(2.2, 1, 4.5);
        const chassisMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        this.chassis = new THREE.Mesh(chassisGeometry, chassisMaterial);
        this.chassis.castShadow = true;
        this.scene.add(this.chassis);

        // Create the chassis rigid body
        const chassisSize = { x: 1.1, y: 0.5, z: 2.25 };
        const chassisDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 2, 0).setMass(1200);
        const chassisColliderDesc = RAPIER.ColliderDesc.cuboid(chassisSize.x, chassisSize.y, chassisSize.z);
        this.chassisBody = PhysicsAdapter.createRigidBody(chassisDesc, chassisColliderDesc);
    }

    createWheels() {
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

        for (let i = 0; i < 4; i++) {
            // Create the wheel mesh as a cylinder
            const wheelGeometry = new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.3, 24);
            // Rotate the cylinder to be oriented like a wheel
            wheelGeometry.rotateZ(Math.PI / 2);

            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.castShadow = true;
            this.scene.add(wheel);
            this.wheels.push(wheel);
        }
    }

    update(deltaTime) {
        // Sync chassis mesh with physics body
        if (this.chassisBody) {
            const position = this.chassisBody.translation();
            const rotation = this.chassisBody.rotation();
            this.chassis.position.set(position.x, position.y, position.z);
            this.chassis.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
        }

        // Raycast for each wheel
        for (let i = 0; i < 4; i++) {
            const wheelPosition = this.wheelPositions[i];

            // The ray's origin is the suspension attachment point on the chassis
            const rayOrigin = this.chassis.localToWorld(wheelPosition.clone());

            // The ray's direction is down, relative to the chassis
            const rayDirection = new THREE.Vector3(0, -1, 0);
            rayDirection.applyQuaternion(this.chassis.quaternion);

            const ray = new RAPIER.Ray({x: rayOrigin.x, y: rayOrigin.y, z: rayOrigin.z}, {x: rayDirection.x, y: rayDirection.y, z: rayDirection.z});
            const hit = PhysicsAdapter.world.castRay(ray, this.suspensionRestLength + this.wheelRadius, true);

            if (hit) {
                // Calculate suspension compression
                const suspensionLength = hit.toi;
                const suspensionCompression = this.suspensionRestLength - suspensionLength;

                // Calculate spring force
                const springForce = this.suspensionStiffness * suspensionCompression;

                // Calculate damping force
                const lastCompression = this.wheels[i].userData.lastSuspensionCompression || 0;
                const compressionSpeed = (suspensionCompression - lastCompression) / deltaTime;
                const dampingForce = this.suspensionDamping * compressionSpeed;

                // Apply suspension force to the chassis
                const suspensionForce = springForce + dampingForce;
                const forceDirection = rayDirection.clone().multiplyScalar(-1);
                this.chassisBody.addForceAtPoint({x: forceDirection.x * suspensionForce, y: forceDirection.y * suspensionForce, z: forceDirection.z * suspensionForce}, {x: rayOrigin.x, y: rayOrigin.y, z: rayOrigin.z}, true);

                // Update last compression
                this.wheels[i].userData.lastSuspensionCompression = suspensionCompression;

                // Update visual wheel position
                const hitPoint = ray.pointAt(hit.toi);
                this.wheels[i].position.set(hitPoint.x, hitPoint.y + this.wheelRadius, hitPoint.z);

                // Tire forces
                const chassis_velocity = new THREE.Vector3(this.chassisBody.linvel().x, this.chassisBody.linvel().y, this.chassisBody.linvel().z);
                const chassis_angular_velocity = new THREE.Vector3(this.chassisBody.angvel().x, this.chassisBody.angvel().y, this.chassisBody.angvel().z);
                const hitPoint_three = new THREE.Vector3(hitPoint.x, hitPoint.y, hitPoint.z);
                const chassis_translation_three = new THREE.Vector3(this.chassisBody.translation().x, this.chassisBody.translation().y, this.chassisBody.translation().z);
                const point_velocity = chassis_velocity.add(hitPoint_three.sub(chassis_translation_three).cross(chassis_angular_velocity));

                const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.chassis.quaternion);
                const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.chassis.quaternion);

                // Lateral slip
                const lateralVelocity = point_velocity.dot(right);
                const lateralSlip = Math.atan(lateralVelocity / Math.max(Math.abs(point_velocity.dot(forward)), 0.1));
                const lateralForce = -lateralSlip * this.tireSideGrip * springForce;
                this.chassisBody.addForceAtPoint({ x: right.x * lateralForce, y: right.y * lateralForce, z: right.z * lateralForce }, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, true);

                // Longitudinal slip (simplified)
                const wheelRotationSpeed = this.wheels[i].userData.rotationSpeed || 0;
                const longitudinalVelocity = point_velocity.dot(forward);
                const slipRatio = (wheelRotationSpeed * this.wheelRadius - longitudinalVelocity) / Math.max(Math.abs(longitudinalVelocity), 0.1);
                const longitudinalForce = slipRatio * this.tireGrip * springForce;
                this.chassisBody.addForceAtPoint({ x: forward.x * longitudinalForce, y: forward.y * longitudinalForce, z: forward.z * longitudinalForce }, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, true);


                // Drivetrain
                if (i >= 2) { // Rear wheels
                    const targetRotationSpeed = this.throttle * 30; // 30 rad/s
                    const rotationSpeedError = targetRotationSpeed - (this.wheels[i].userData.rotationSpeed || 0);
                    const drivingTorque = rotationSpeedError * this.motorTorque;

                    const drivingForce = drivingTorque / this.wheelRadius;
                    this.chassisBody.addForceAtPoint({ x: forward.x * drivingForce, y: forward.y * drivingForce, z: forward.z * drivingForce }, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, true);

                    this.wheels[i].userData.rotationSpeed = (this.wheels[i].userData.rotationSpeed || 0) + (drivingTorque / 40) * deltaTime; // 40 is wheel mass
                }

                // Braking
                if (this.throttle < 0) {
                    const brakingForce = -this.throttle * this.brakingForce;
                    const wheelRotationSpeed = this.wheels[i].userData.rotationSpeed || 0;
                    const brakingSign = Math.sign(wheelRotationSpeed);
                    const brakingVector = { x: -forward.x * brakingSign * brakingForce, y: -forward.y * brakingSign * brakingForce, z: -forward.z * brakingSign * brakingForce };
                    this.chassisBody.addForceAtPoint(brakingVector, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, true);
                }

                // Handbrake
                if (this.handbrake && i >= 2) { // Rear wheels
                    const wheelRotationSpeed = this.wheels[i].userData.rotationSpeed || 0;
                    const brakingSign = Math.sign(wheelRotationSpeed);
                    const brakingVector = { x: -forward.x * brakingSign * this.brakingForce * 2, y: -forward.y * brakingSign * this.brakingForce * 2, z: -forward.z * brakingSign * this.brakingForce * 2 };
                    this.chassisBody.addForceAtPoint(brakingVector, { x: hitPoint.x, y: hitPoint.y, z: hitPoint.z }, true);
                }


            } else {
                // No ground contact, wheel is in the air
                this.wheels[i].position.copy(rayOrigin.clone().add(rayDirection.clone().multiplyScalar(this.suspensionRestLength)));
                this.wheels[i].userData.lastSuspensionCompression = 0;
            }

            // Update visual wheel rotation
            this.wheels[i].quaternion.copy(this.chassis.quaternion);

            // Apply steering rotation to front wheels
            if (i < 2) {
                this.wheels[i].rotateY(this.steering * 0.5);
            }

            // Apply driving rotation
            const wheelRotationSpeed = this.wheels[i].userData.rotationSpeed || 0;
            this.wheels[i].rotateX(wheelRotationSpeed * deltaTime);
        }
    }
}

export default Vehicle;
