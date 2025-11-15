class Controls {
    constructor() {
        this.forward = false;
        this.backward = false;
        this.left = false;
        this.right = false;
        this.handbrake = false;

        this.addEventListeners();
    }

    addEventListeners() {
        document.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'w':
                case 'ArrowUp':
                    this.forward = true;
                    break;
                case 's':
                case 'ArrowDown':
                    this.backward = true;
                    break;
                case 'a':
                case 'ArrowLeft':
                    this.left = true;
                    break;
                case 'd':
                case 'ArrowRight':
                    this.right = true;
                    break;
                case ' ':
                    this.handbrake = true;
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.key) {
                case 'w':
                case 'ArrowUp':
                    this.forward = false;
                    break;
                case 's':
                case 'ArrowDown':
                    this.backward = false;
                    break;
                case 'a':
                case 'ArrowLeft':
                    this.left = false;
                    break;
                case 'd':
                case 'ArrowRight':
                    this.right = false;
                    break;
                case ' ':
                    this.handbrake = false;
                    break;
            }
        });
    }
}

export default new Controls();
