document.addEventListener('DOMContentLoaded', async () => {
    
    // --- GRUNNLEGGENDE OPPSETT ---
    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({ lerp: 0.08 });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    function splitH1IntoChars() {
        const h1 = document.querySelector('.manifest-section h1');
        if (h1) h1.innerHTML = h1.textContent.split('').map(char => `<span class="char">${char === ' ' ? ' ' : char}</span>`).join('');
    }
    
    function initContentAnimations(webglReadyTimeline) {
        const contentTl = gsap.timeline();
        contentTl
            .to('.manifest-section h1 .char', { opacity: 1, y: 0, duration: 1.2, stagger: 0.04, ease: 'power4.out' })
            .to('.manifest-section p', { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out' }, '-=0.8');

        webglReadyTimeline.add(contentTl);

        document.querySelectorAll('.screen-section:not(:first-child) .content').forEach(contentBox => {
            const tl = gsap.timeline({
                scrollTrigger: { trigger: contentBox.parentElement, start: 'top 70%', end: 'top 40%', toggleActions: 'play none none reverse' }
            });
            tl.to(contentBox.children, { opacity: 1, y: 0, stagger: 0.2, duration: 1.2, ease: 'power3.out' });
        });
    }

    // --- HOVEDLOGIKK ---
    splitH1IntoChars();
    await loadThreeJs();
    initWebGL();


    // ===============================================
    // UNIVERSELL WEBGL-KODE (THREE.JS)
    // ===============================================
    async function loadThreeJs() {
        return new Promise((resolve, reject) => {
            if (window.THREE) { resolve(); return; }
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function initWebGL() {
        let scene, camera, renderer, sculpture;
        const mouse = new THREE.Vector2(-10, -10);
        const clock = new THREE.Clock();
        let isContactActive = false;

        const uniforms = {
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

        function setup() {
            const container = document.getElementById('visual-container');
            const canvas = document.createElement('canvas');
            container.appendChild(canvas);

            scene = new THREE.Scene();
            camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.z = 20;

            renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !isMobile, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

            const subdivisions = isMobile ? 24 : 64; 
            const geometry = new THREE.IcosahedronGeometry(6, subdivisions);
            const material = new THREE.ShaderMaterial({
                vertexShader: document.getElementById('vertexShader').textContent,
                fragmentShader: document.getElementById('fragmentShader').textContent,
                uniforms: uniforms,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });

            sculpture = new THREE.Mesh(geometry, material);
            scene.add(sculpture);
            
            window.addEventListener('resize', onResize, false);
            addInteractionListeners();
            onResize();
        }

        function onResize() {
            const w = window.innerWidth;
            const h = window.innerHeight;
            camera.aspect = w / h;
            camera.fov = w <= 768 ? 70 : 50;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            uniforms.uResolution.value.set(w, h);
        }

        function addInteractionListeners() {
            const el = renderer.domElement;
            el.addEventListener('mousemove', (e) => updateMouseAndFocus(e.clientX, e.clientY));
            el.addEventListener('touchmove', (e) => {
                if (e.touches.length > 0) updateMouseAndFocus(e.touches[0].clientX, e.touches[0].clientY);
            });
        }

        function updateMouseAndFocus(x, y) {
            mouse.x = (x / window.innerWidth) * 2 - 1;
            mouse.y = -(y / window.innerHeight) * 2 + 1;
        }

        function animate() {
            const elapsedTime = clock.getElapsedTime();
            uniforms.uTime.value = elapsedTime;

            if (isContactActive) {
                uniforms.uHeartbeat.value = (Math.sin(elapsedTime * 1.5) + 1.0) / 2.0 * 0.4;
            }
            
            sculpture.rotation.y = elapsedTime * 0.02; // Slower, more deliberate rotation
            
            const targetLightPos = new THREE.Vector3(mouse.x * 5, mouse.y * 5, camera.position.z + 10);
            uniforms.uLightPos.value.lerp(targetLightPos, 0.04);
            
            const focusTarget = new THREE.Vector3(mouse.x, mouse.y, 0).unproject(camera);
            uniforms.uFocusPoint.value.lerp(focusTarget, 0.1);

            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }

        function initMasterTimeline() {
            const masterTl = gsap.timeline({ onComplete: () => { document.body.style.overflow = ''; } });
            const preloader = document.getElementById('preloader');

            masterTl
                .to(preloader, { opacity: 0, duration: 0.5, onComplete: () => preloader.style.display = 'none' })
                .fromTo(camera.position, { z: 5 }, { z: 20, duration: 3.0, ease: 'power3.inOut' }, 0)
                .to('#visual-container', { opacity: 1, duration: 2.5, ease: 'power2.out' }, 0.2);

            initContentAnimations(masterTl);
        }

        function initScrollTriggers() {
            ScrollTrigger.create({
                trigger: ".scroll-container", start: "top top", end: "bottom bottom", scrub: 1.2,
                onUpdate: self => {
                    uniforms.uScrollProgress.value = self.progress;
                    gsap.to(camera.position, { z: 20 - (self.progress * 12), immediateRender: false });
                }
            });

            ScrollTrigger.create({
                trigger: ".contact-section", start: "top center", end: "bottom center",
                onToggle: self => {
                    isContactActive = self.isActive;
                    gsap.to(uniforms.uFocusStrength, { value: self.isActive ? 1.0 : 0.0, duration: 1.0 });
                    if (!self.isActive) {
                        gsap.to(uniforms.uHeartbeat, { value: 0.0, duration: 0.5 });
                    }
                }
            });
        }
        
        function initDigitalHandshake() {
            const copyLine = document.querySelector('.copy-line');
            copyLine.addEventListener('click', () => {
                navigator.clipboard.writeText('kontakt@prestisje.no').then(() => {
                    if (navigator.vibrate) navigator.vibrate([50]);
                    gsap.fromTo(uniforms.uCopyGlow, { value: 0.0 }, { value: 1.0, duration: 0.4, yoyo: true, repeat: 1, ease: 'power2.inOut' });
                });
            });
        }

        setup();
        animate();
        initMasterTimeline();
        initScrollTriggers();
        initDigitalHandshake();
    }
});