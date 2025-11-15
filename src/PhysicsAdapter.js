import RAPIER from '@dimforge/rapier3d-compat';

class PhysicsAdapter {
    constructor() {
        this.gravity = { x: 0.0, y: -9.81, z: 0.0 };
        this.world = null;
    }

    async init() {
        await RAPIER.init();
        this.world = new RAPIER.World(this.gravity);
    }

    step() {
        if (this.world) {
            this.world.step();
        }
    }

    createRigidBody(desc, colliderDesc) {
        const body = this.world.createRigidBody(desc);
        this.world.createCollider(colliderDesc, body);
        return body;
    }
}

export default new PhysicsAdapter();
