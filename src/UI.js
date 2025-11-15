class UI {
    constructor() {
        this.speedometer = document.createElement('div');
        this.speedometer.style.position = 'absolute';
        this.speedometer.style.bottom = '10px';
        this.speedometer.style.right = '10px';
        this.speedometer.style.color = 'white';
        this.speedometer.style.fontSize = '24px';
        document.body.appendChild(this.speedometer);
    }

    update(vehicle) {
        if (vehicle && vehicle.chassisBody) {
            const speed = vehicle.chassisBody.linvel().length() * 3.6; // m/s to km/h
            this.speedometer.textContent = `${Math.round(speed)} km/h`;
        }
    }
}

export default new UI();
