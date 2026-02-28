import * as THREE from 'three';

export class Hyperspeed {
    constructor(options = {}) {
        this.container = options.container || document.body;
        this.speed = options.speed || 1;
        this.starCount = options.starCount || 1000;
        this.starDist = options.starDist || 200;
        this.starSize = options.starSize || 0.5;

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.createStars();

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.animate();
    }

    createStars() {
        const starGeo = new THREE.BufferGeometry();
        const starMaterial = new THREE.PointsMaterial({
            color: 0xaaaaaa,
            size: this.starSize,
        });

        const starPositions = [];
        this.starVelocities = [];

        for (let i = 0; i < this.starCount; i++) {
            const x = THREE.MathUtils.randFloatSpread(this.starDist);
            const y = THREE.MathUtils.randFloatSpread(this.starDist);
            const z = THREE.MathUtils.randFloatSpread(this.starDist);

            starPositions.push(x, y, z);
            this.starVelocities.push(0);
        }

        starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
        this.stars = new THREE.Points(starGeo, starMaterial);
        this.scene.add(this.stars);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        const positions = this.stars.geometry.attributes.position.array;

        for (let i = 0; i < this.starCount; i++) {
            this.starVelocities[i] += this.speed * 0.005;
            positions[i * 3 + 2] += this.starVelocities[i]; // Update Z position

            // If a star moves past the camera, reset it
            if (positions[i * 3 + 2] > 100) {
                positions[i * 3 + 2] = -this.starDist / 2;
                this.starVelocities[i] = 0;
            }
        }

        this.stars.geometry.attributes.position.needsUpdate = true;

        // Rotate the entire starfield slowly
        this.stars.rotation.z += 0.002;

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    destroy() {
        window.removeEventListener('resize', this.onWindowResize.bind(this), false);
        this.container.removeChild(this.renderer.domElement);
        // Clear ThreeJS memory
        this.scene.clear();
        this.renderer.dispose();
    }
}
