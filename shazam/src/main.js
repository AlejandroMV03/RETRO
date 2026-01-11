import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

// --- NUEVOS IMPORTES PARA EL EFECTO BLOOM (BRILLO) ---
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- 1. ESCENARIO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202); 
scene.fog = new THREE.FogExp2(0x020202, 0.015);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
// Posición para ver todo el conjunto
camera.position.set(0, 10, 110); 

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// TONE MAPPING: Vital para que el brillo se vea intenso pero real
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- CONFIGURACIÓN DEL BLOOM (POST-PROCESADO) ---
const renderScene = new RenderPass(scene, camera);

// Resolución, Fuerza, Radio, Umbral
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    1.5,  // Fuerza del brillo (1.5 es fuerte y bonito)
    0.4,  // Radio de expansión
    0.1   // Umbral (qué tan brillante debe ser algo para empezar a brillar)
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false; 
controls.maxPolarAngle = Math.PI / 2; 

// Suelo
const floorGeo = new THREE.PlaneGeometry(500, 500);
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x050505,
    roughness: 0.1,
    metalness: 0.8
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -25;
floor.receiveShadow = true;
scene.add(floor);

const dragPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1000, 1000),
    new THREE.MeshBasicMaterial({ visible: false })
);
dragPlane.rotation.x = -Math.PI / 2;
dragPlane.position.y = -25;
scene.add(dragPlane);

// Iluminación
scene.add(new THREE.AmbientLight(0xffffff, 0.1)); // Ambiente bajo para que resalte el neón
const spotLight = new THREE.SpotLight(0xffffff, 100);
spotLight.position.set(0, 50, 50);
spotLight.angle = 0.6;
spotLight.penumbra = 0.5;
spotLight.castShadow = true;
scene.add(spotLight);


// --- 2. LAPTOP GAMER (OBSTÁCULO SUPERIOR) ---
const laptopGroup = new THREE.Group();
laptopGroup.position.set(0, 15, 0); // Altura definida
scene.add(laptopGroup);

// Materiales (Con Emissive alto para activar el Bloom)
const laptopRGBMat = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, 
    wireframe: true, 
    transparent: true, opacity: 0.8
    // El color aquí actuará como luz para el Bloom
});
const laptopBlackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const screenBrightMat = new THREE.MeshBasicMaterial({ color: 0xffffff }); // Pantalla blanca brillante

function createRGBLaptop() {
    const laptop = new THREE.Group();
    // Base
    const baseGeo = new THREE.BoxGeometry(26, 1.5, 18);
    laptop.add(new THREE.Mesh(baseGeo, laptopBlackMat));
    laptop.add(new THREE.Mesh(baseGeo, laptopRGBMat));

    // Pantalla
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0.5, -8);
    screenGroup.rotation.x = 0.3;
    const lidGeo = new THREE.BoxGeometry(26, 16, 1);
    const lid = new THREE.Mesh(lidGeo, laptopBlackMat);
    const lidWire = new THREE.Mesh(lidGeo, laptopRGBMat);
    lid.position.y = 8;
    lidWire.position.y = 8;
    screenGroup.add(lid);
    screenGroup.add(lidWire);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), screenBrightMat);
    display.position.set(0, 8, 0.6);
    screenGroup.add(display);

    laptop.add(screenGroup);
    return laptop;
}
const laptop = createRGBLaptop();
laptopGroup.add(laptop);

// Luz puntual para reforzar el brillo del centro
const laptopLight = new THREE.PointLight(0xff0000, 2, 50);
laptopLight.position.set(0, 20, 10);
scene.add(laptopLight);


// --- 3. TEXTO "ALEJANDRO MV" (OBSTÁCULO INFERIOR) ---
const letters = []; 
const fontLoader = new FontLoader();

fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
    const message = "Alejandro MV";
    
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 });
    // El material lateral tiene EMISSIVE para brillar con el Bloom
    const sideMat = new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        emissive: 0xffffff, 
        emissiveIntensity: 2.0 // Intensidad alta para Bloom fuerte
    });
    const materials = [faceMat, sideMat];

    let totalWidth = message.length * 9; 
    let xOffset = -totalWidth / 2;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === " ") { xOffset += 12; continue; } 

        const geo = new TextGeometry(char, {
            font: font, 
            size: 10,           
            height: 2,          
            curveSegments: 12,
            bevelEnabled: true, 
            bevelThickness: 0.5,
            bevelSize: 0.3,
            bevelSegments: 3
        });
        
        geo.computeBoundingBox();
        const width = geo.boundingBox.max.x - geo.boundingBox.min.x;
        const mesh = new THREE.Mesh(geo, materials);
        
        // Posición: Abajo
        mesh.position.set(xOffset, -15, -20); 
        
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        mesh.userData = { 
            originalZ: -20,
            isDragging: false 
        };

        scene.add(mesh);
        letters.push(mesh);
        xOffset += width + 2; 
    }
});


// --- INTERACCIÓN DE ARRASTRE ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedObject = null;

// Referencias UI (Aseguramos que existan antes de usarlas)
const startButton = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const fullscreenBtn = document.getElementById('fullscreen-btn');

window.addEventListener('mousedown', (e) => {
    // Si la alerta está visible, no permitir clic en 3D
    if(overlay && overlay.style.display !== 'none') return;

    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(letters);
    if (intersects.length > 0) {
        controls.enabled = false;
        draggedObject = intersects[0].object;
        draggedObject.userData.isDragging = true;
    }
});

window.addEventListener('mousemove', (e) => {
    if (!draggedObject) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(dragPlane);
    if (intersects.length > 0) {
        let newZ = intersects[0].point.z;
        newZ = Math.max(-20, Math.min(30, newZ)); 
        draggedObject.position.z = newZ;
    }
});

window.addEventListener('mouseup', () => {
    if (draggedObject) {
        draggedObject.userData.isDragging = false;
        draggedObject = null;
        controls.enabled = true;
    }
});


// --- 4. LLUVIA DE NÚMEROS Y LLAVES ---
function createCharTexture(char) {
    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext('2d');
    ctx.font = 'bold 50px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(char, 32, 32);
    return new THREE.CanvasTexture(cvs);
}

const specificChars = ['0','1','2','3','4','5','6','7','8','9','{','}','[',']'];
const textures = specificChars.map(c => createCharTexture(c));

const particles = [];

function spawnDrop(volume) {
    const tex = textures[Math.floor(Math.random() * textures.length)];
    // Material transparente, pero con color brillante para el Bloom
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0x44ff44, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(mat);
    
    sprite.position.set((Math.random()-0.5)*300, 80, (Math.random()-0.5)*150);
    const size = 3;
    sprite.scale.set(size, size, 1);
    
    sprite.userData = { 
        velocity: new THREE.Vector3(0, -(0.4 + volume), 0),
        onGround: false,
        life: 100 
    };
    
    scene.add(sprite);
    particles.push(sprite);
}


// --- 5. AUDIO & LOGICA UI ---
let analyser, dataArray, isAudioActive = false;

// Botón Pantalla Completa
if(fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.log(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    });
}

async function startCapture() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        stream.getVideoTracks()[0].stop();
        if (stream.getAudioTracks().length === 0) { alert("⚠️ Sin audio."); return; }
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        isAudioActive = true;
        
        // Ocultar overlay
        if(overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.style.display = 'none'; }, 500);
        }
    } catch (e) { console.error(e); }
}
if(startButton) startButton.addEventListener('click', startCapture);

let hue = 0;

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    let volume = 0, bass = 0;
    if (isAudioActive) {
        analyser.getByteFrequencyData(dataArray);
        bass = dataArray[5] / 255; 
        let sum = 0; for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        volume = sum / dataArray.length / 255;
    }

    // A. LAPTOP GIRATORIA Y COLORES (RGB Cycle)
    const time = Date.now() * 0.001;
    const rainbowColor = new THREE.Color().setHSL(time % 1, 1, 0.5);
    
    laptopRGBMat.color.copy(rainbowColor); 
    laptopLight.color.copy(rainbowColor);  
    laptopGroup.rotation.y += 0.01;
    laptopGroup.position.y = 15 + Math.sin(time) * 1; 

    // B. TEXTO REACTIVO
    hue += 0.005; if(hue>1) hue=0;
    const textLedColor = new THREE.Color().setHSL(hue, 1, 0.5);

    letters.forEach(mesh => {
        if(mesh.material[1]) {
            mesh.material[1].emissive.copy(textLedColor);
            // El Bloom hace que esto brille mucho con el bajo
            mesh.material[1].emissiveIntensity = 1.0 + (bass * 4.0); 
        }
        if (!mesh.userData.isDragging) {
            mesh.position.z += (mesh.userData.originalZ - mesh.position.z) * 0.1;
        }
    });

    // C. GENERAR GOTAS
    if (volume > 0.01) spawnDrop(volume);
    if (Math.random() < 0.1) spawnDrop(0); 

    // D. FÍSICA DE LAS GOTAS
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        if (!p.userData.onGround) {
            p.position.add(p.userData.velocity);

            // 1. Colisión Laptop
            const distLaptop = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
            if (Math.abs(p.position.y - 15) < 5 && distLaptop < 20) {
                p.userData.velocity.y = 0.5; 
                const angle = Math.atan2(p.position.z, p.position.x);
                p.userData.velocity.x = Math.cos(angle) * 0.8;
                p.userData.velocity.z = Math.sin(angle) * 0.8;
                p.material.color.setHex(0xffffff); 
            }

            // 2. Colisión Letras
            if (p.position.y < -10 && p.position.y > -20 && 
                p.position.z < -15 && p.position.z > -25 && 
                p.position.x > -60 && p.position.x < 60) {
                
                p.userData.onGround = true; 
                p.position.y = -10; 
                p.material.color.setHex(0x00ffff); 
            }

            // 3. Suelo
            if (p.position.y < -25) {
                p.userData.onGround = true;
                p.position.y = -25;
            }

        } else {
            p.userData.life -= 1; 
            p.material.opacity = p.userData.life / 100; 
            p.position.x += (Math.random() - 0.5) * 0.1;
            
            if (p.userData.life <= 0) {
                scene.remove(p);
                particles.splice(i, 1);
            }
        }
    }

    // USAMOS EL COMPOSER EN VEZ DEL RENDERER NORMAL PARA EL BLOOM
    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Ajustar también el tamaño del Bloom
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();