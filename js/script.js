document.addEventListener('DOMContentLoaded', () => {
    // --- GENESIS DIREKTIV: Starte applikasjonen ---
    const app = new PrestigeApp();
    app.init();
});


class PrestigeApp {
    constructor() {
        // --- Systemvariabler og tilstand ---
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.webgl = {
            scene: null,
            camera: null,
            renderer: null,
            sculpture: null,
            uniforms: null,
            clock: new THREE.Clock(),
            mouse: new THREE.Vector2(-10, -10),
            isContactActive: false
        };
        
        // --- Binding av metoder for å sikre 'this' kontekst ---
        this.animate = this.animate.bind(this);
    }

    init() {
        document.body.classList.add('loading');
        this.splitH1IntoChars();
        this.setupLenis();
        this.setupWebGL();
        this.initMasterTimeline();
        this.initScrollTriggers();
        this.initDigitalHandshake();
    }
    
    // --- 1. OPPSETT AV GRUNNLEGGENDE STRUKTUR ---
    splitH1IntoChars() {
        const h1 = document.querySelector('.manifest-section h1');
        if (h1) h1.innerHTML = h1.textContent.split('').map(char => `<span class="char">${char === ' ' ? ' ' : char}</span>`).join('');
    }

    setupLenis() {
        const lenis = new Lenis({ lerp: 0.08 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
    }

    // --- 2. OPPSETT AV WEBGL (THREE.JS) ---
    setupWebGL() {
        const container = document.getElementById('visual-container');
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);

        this.webgl.scene = new THREE.Scene();
        this.webgl.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.webgl.camera.position.z = 20;

        this.webgl.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !this.isMobile, alpha: true });
        // FIKS: Bruker native devicePixelRatio for skarphet på mobil, men justerer geometri for ytelse.
        this.webgl.renderer.setPixelRatio(window.devicePixelRatio); 
        this.webgl.renderer.setSize(window.innerWidth, window.innerHeight);

        this.webgl.uniforms = {
            uTime: { value: 0.0 },
            uScrollProgress: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uColor: { value: new THREE.Color(0xB9933E) },
            uLightPos: { value: new THREE.Vector3(0, 0, 30) },
            uFocusStrength: { value: 0.0 },
            uFocusPoint: { value: new THREE.Vector3(0,0,0) },
            uHeartbeat: { value: 0.0 },
            uCopyGlow: { value: 0.0 }
        };

        const subdivisions = this.isMobile ? 20 : 64; // Redusert for mobil ytelse
        const geometry = new THREE.IcosahedronGeometry(6, subdivisions);
        const material = new THREE.ShaderMaterial({
            vertexShader: document.getElementById('vertexShader').textContent,
            fragmentShader: document.getElementById('fragmentShader').textContent,
            uniforms: this.webgl.uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.webgl.sculpture = new THREE.Mesh(geometry, material);
        this.webgl.scene.add(this.webgl.sculpture);
        
        window.addEventListener('resize', this.onResize.bind(this), false);
        this.addInteractionListeners();
        this.onResize(); // Kjør en gang for initialt oppsett
        this.animate(); // Start animasjonsløkken
    }

    // --- 3. ANIMASJON & INTERAKSJON ---
    initMasterTimeline() {
        const masterTl = gsap.timeline({
            onComplete: () => {
                // FIKS: Fjerner 'loading' klassen som kontrollerer 'overflow' for å fikse scroll-bug.
                document.body.classList.remove('loading');
                document.getElementById('visual-container').classList.add('interactive');
            }
        });
        const preloader = document.getElementById('preloader');

        masterTl
            .to(preloader, { opacity: 0, duration: 0.6, ease: 'power1.inOut', onComplete: () => preloader.style.display = 'none' })
            .fromTo(this.webgl.camera.position, { z: 5 }, { z: 20, duration: 3.5, ease: 'expo.inOut' }, 0)
            .to('#visual-container', { opacity: 1, duration: 3.0, ease: 'power2.out' }, 0.5)
            .to('.manifest-section h1 .char', { opacity: 1, y: 0, duration: 1.5, stagger: 0.05, ease: 'expo.out' }, 1.5)
            .to('.manifest-section p', { opacity: 1, y: 0, duration: 1.5, ease: 'expo.out' }, '-=1.2');
    }

    initScrollTriggers() {
        document.querySelectorAll('.screen-section:not(:first-child) .content').forEach(contentBox => {
            gsap.to(contentBox.children, {
                opacity: 1, y: 0, stagger: 0.2, duration: 1.2, ease: 'power3.out',
                scrollTrigger: { trigger: contentBox.parentElement, start: 'top 70%', toggleActions: 'play none none reverse' }
            });
        });

        ScrollTrigger.create({
            trigger: ".scroll-container", start: "top top", end: "bottom bottom", scrub: 1.5,
            onUpdate: self => {
                this.webgl.uniforms.uScrollProgress.value = self.progress;
                gsap.to(this.webgl.camera.position, { z: 20 - (self.progress * 12), immediateRender: false, ease: 'power1.out' });
            }
        });

        ScrollTrigger.create({
            trigger: ".contact-section", start: "top center", end: "bottom center",
            onToggle: self => {
                this.webgl.isContactActive = self.isActive;
                gsap.to(this.webgl.uniforms.uFocusStrength, { value: self.isActive ? 1.0 : 0.0, duration: 1.0 });
                if (!self.isActive) {
                    gsap.to(this.webgl.uniforms.uHeartbeat, { value: 0.0, duration: 0.5 });
                }
            }
        });
    }

    initDigitalHandshake() {
        const contactEl = document.querySelector('.contact-interactive');
        const confirmationEl = document.querySelector('.copy-confirmation');
        
        contactEl.addEventListener('click', () => {
            navigator.clipboard.writeText('kontakt@prestisje.no').then(() => {
                if (navigator.vibrate) navigator.vibrate([50]);
                gsap.fromTo(this.webgl.uniforms.uCopyGlow, { value: 0.0 }, { value: 1.0, duration: 0.4, yoyo: true, repeat: 1, ease: 'power2.inOut' });
                
                // --- Forbedret feedback ---
                confirmationEl.textContent = 'Kopiert';
                gsap.fromTo(confirmationEl, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3, onComplete: () => {
                    gsap.to(confirmationEl, { opacity: 0, y: 10, delay: 1.5 });
                }});
            }).catch(() => {
                confirmationEl.textContent = 'Kunne ikke kopiere';
            });
        });
    }

    // --- 4. HJELPEMETODER OG HENDELSESLISTENERS ---
    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.webgl.camera.aspect = w / h;
        this.webgl.camera.fov = w <= 768 ? 70 : 50;
        this.webgl.camera.updateProjectionMatrix();
        this.webgl.renderer.setSize(w, h);
        this.webgl.uniforms.uResolution.value.set(w, h);
    }
    
    addInteractionListeners() {
        const updateMouseAndFocus = (x, y) => {
            this.webgl.mouse.x = (x / window.innerWidth) * 2 - 1;
            this.webgl.mouse.y = -(y / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('mousemove', (e) => updateMouseAndFocus(e.clientX, e.clientY));
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length > 0) updateMouseAndFocus(e.touches[0].clientX, e.touches[0].clientY);
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        const elapsedTime = this.webgl.clock.getElapsedTime();
        this.webgl.uniforms.uTime.value = elapsedTime;

        if (this.webgl.isContactActive) {
            this.webgl.uniforms.uHeartbeat.value = (Math.sin(elapsedTime * 1.5) + 1.0) / 2.0 * 0.4;
        }
        
        this.webgl.sculpture.rotation.y = elapsedTime * 0.02;
        
        const targetLightPos = new THREE.Vector3(this.webgl.mouse.x * 5, this.webgl.mouse.y * 5, this.webgl.camera.position.z + 10);
        this.webgl.uniforms.uLightPos.value.lerp(targetLightPos, 0.04);
        
        const focusTarget = new THREE.Vector3(this.webgl.mouse.x, this.webgl.mouse.y, 0).unproject(this.webgl.camera);
        this.webgl.uniforms.uFocusPoint.value.lerp(focusTarget, 0.1);

        this.webgl.renderer.render(this.webgl.scene, this.webgl.camera);
    }
}
