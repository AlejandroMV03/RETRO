import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- 1. ESCENARIO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202); 
scene.fog = new THREE.FogExp2(0x020202, 0.015);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- AJUSTE DE CÁMARA PARA MÓVIL ---
function updateCameraDistance() {
    // Si el ancho es menor que el alto (Celular vertical), nos alejamos más
    if (window.innerWidth < window.innerHeight) {
        camera.position.set(0, 20, 180); // Más lejos para que quepa todo
    } else {
        camera.position.set(0, 10, 110); // Posición normal PC
    }
}
updateCameraDistance();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
// OPTIMIZACIÓN MÓVIL: Ajustar densidad de píxeles (máximo 2 para rendimiento)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// --- BLOOM (POST-PROCESADO) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), 
    1.5, 0.4, 0.1
);
const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// Controles
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = true; // Permitir zoom en móvil (pellizco)
controls.maxPolarAngle = Math.PI / 2; 

// Suelo
const floorGeo = new THREE.PlaneGeometry(500, 500);
const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x050505, roughness: 0.1, metalness: 0.8
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
scene.add(new THREE.AmbientLight(0xffffff, 0.2));
const spotLight = new THREE.SpotLight(0xffffff, 100);
spotLight.position.set(0, 50, 50);
spotLight.angle = 0.6;
spotLight.penumbra = 0.5;
spotLight.castShadow = true;
scene.add(spotLight);


// --- 2. LAPTOP GAMER ---
const laptopGroup = new THREE.Group();
laptopGroup.position.set(0, 15, 0); 
scene.add(laptopGroup);

const laptopRGBMat = new THREE.MeshBasicMaterial({ 
    color: 0xff0000, wireframe: true, transparent: true, opacity: 0.8
});
const laptopBlackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
const screenBrightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

function createRGBLaptop() {
    const laptop = new THREE.Group();
    const baseGeo = new THREE.BoxGeometry(26, 1.5, 18);
    laptop.add(new THREE.Mesh(baseGeo, laptopBlackMat));
    laptop.add(new THREE.Mesh(baseGeo, laptopRGBMat));

    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0.5, -8);
    screenGroup.rotation.x = 0.3;
    const lidGeo = new THREE.BoxGeometry(26, 16, 1);
    const lid = new THREE.Mesh(lidGeo, laptopBlackMat);
    const lidWire = new THREE.Mesh(lidGeo, laptopRGBMat);
    lid.position.y = 8; lidWire.position.y = 8;
    screenGroup.add(lid); screenGroup.add(lidWire);
    const display = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), screenBrightMat);
    display.position.set(0, 8, 0.6);
    screenGroup.add(display);
    laptop.add(screenGroup);
    return laptop;
}
const laptop = createRGBLaptop();
laptopGroup.add(laptop);

const laptopLight = new THREE.PointLight(0xff0000, 2, 50);
laptopLight.position.set(0, 20, 10);
scene.add(laptopLight);


// --- 3. TEXTO "ALEJANDRO MV" ---
const letters = []; 
const fontLoader = new FontLoader();

fontLoader.load('https://threejs.org/examples/fonts/helvetiker_bold.typeface.json', (font) => {
    const message = "Alejandro MV";
    const faceMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.8 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveIntensity: 2.0 });
    const materials = [faceMat, sideMat];

    let totalWidth = message.length * 9; 
    let xOffset = -totalWidth / 2;

    for (let i = 0; i < message.length; i++) {
        const char = message[i];
        if (char === " ") { xOffset += 12; continue; } 

        const geo = new TextGeometry(char, {
            font: font, size: 10, height: 2,          
            curveSegments: 12, bevelEnabled: true, 
            bevelThickness: 0.5, bevelSize: 0.3, bevelSegments: 3
        });
        
        geo.computeBoundingBox();
        const width = geo.boundingBox.max.x - geo.boundingBox.min.x;
        const mesh = new THREE.Mesh(geo, materials);
        
        mesh.position.set(xOffset, -15, -20); 
        mesh.castShadow = true; mesh.receiveShadow = true;
        mesh.userData = { originalZ: -20, isDragging: false };

        scene.add(mesh);
        letters.push(mesh);
        xOffset += width + 2; 
    }
});


// --- INTERACCIÓN (MOUSE + TOUCH) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let draggedObject = null;

// UI Elements
const overlay = document.getElementById('overlay');

// FUNCIÓN UNIFICADA PARA DETECTAR POSICIÓN (Touch o Mouse)
function updateMousePosition(event) {
    let clientX, clientY;
    
    if (event.changedTouches) {
        // Es un evento táctil
        clientX = event.changedTouches[0].clientX;
        clientY = event.changedTouches[0].clientY;
    } else {
        // Es un evento de mouse
        clientX = event.clientX;
        clientY = event.clientY;
    }

    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
}

// 1. INICIO (MouseDown / TouchStart)
function onStart(e) {
    if(overlay && overlay.style.display !== 'none') return;
    updateMousePosition(e);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(letters);
    if (intersects.length > 0) {
        controls.enabled = false; // Desactivar rotación para poder arrastrar
        draggedObject = intersects[0].object;
        draggedObject.userData.isDragging = true;
    }
}

// 2. MOVIMIENTO (MouseMove / TouchMove)
function onMove(e) {
    if (!draggedObject) return;
    // Prevenir scroll en móviles al arrastrar letras
    if(e.changedTouches) e.preventDefault(); 
    
    updateMousePosition(e);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(dragPlane);
    if (intersects.length > 0) {
        let newZ = intersects[0].point.z;
        newZ = Math.max(-20, Math.min(30, newZ)); 
        draggedObject.position.z = newZ;
    }
}

// 3. FIN (MouseUp / TouchEnd)
function onEnd() {
    if (draggedObject) {
        draggedObject.userData.isDragging = false;
        draggedObject = null;
        controls.enabled = true; // Reactivar rotación
    }
}

// Event Listeners (Mouse)
window.addEventListener('mousedown', onStart);
window.addEventListener('mousemove', onMove);
window.addEventListener('mouseup', onEnd);

// Event Listeners (Touch - Móvil)
window.addEventListener('touchstart', onStart, { passive: false });
window.addEventListener('touchmove', onMove, { passive: false });
window.addEventListener('touchend', onEnd);


// --- 4. LLUVIA Y OBJETOS ---
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
    // Material brillante para el Bloom
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0x44ff44, transparent: true, opacity: 0.9 });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set((Math.random()-0.5)*300, 80, (Math.random()-0.5)*150);
    sprite.scale.set(3, 3, 1);
    sprite.userData = { velocity: new THREE.Vector3(0, -(0.4 + volume), 0), onGround: false, life: 100 };
    scene.add(sprite);
    particles.push(sprite);
}


// --- 5. AUDIO & LOGICA UI ---
let analyser, dataArray, isAudioActive = false;
const startButton = document.getElementById('start-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');

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
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        isAudioActive = true;
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

    // A. LAPTOP
    const time = Date.now() * 0.001;
    const rainbowColor = new THREE.Color().setHSL(time % 1, 1, 0.5);
    laptopRGBMat.color.copy(rainbowColor); 
    laptopLight.color.copy(rainbowColor);  
    laptopGroup.rotation.y += 0.01;
    laptopGroup.position.y = 15 + Math.sin(time) * 1; 

    // B. TEXTO
    hue += 0.005; if(hue>1) hue=0;
    const textLedColor = new THREE.Color().setHSL(hue, 1, 0.5);
    letters.forEach(mesh => {
        if(mesh.material[1]) {
            mesh.material[1].emissive.copy(textLedColor);
            mesh.material[1].emissiveIntensity = 1.0 + (bass * 4.0); 
        }
        if (!mesh.userData.isDragging) {
            mesh.position.z += (mesh.userData.originalZ - mesh.position.z) * 0.1;
        }
    });

    // C. LLUVIA
    if (volume > 0.01) spawnDrop(volume);
    if (Math.random() < 0.1) spawnDrop(0); 

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        if (!p.userData.onGround) {
            p.position.add(p.userData.velocity);
            // Colisiones
            const distLaptop = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
            if (Math.abs(p.position.y - 15) < 5 && distLaptop < 20) {
                p.userData.velocity.y = 0.5; 
                const angle = Math.atan2(p.position.z, p.position.x);
                p.userData.velocity.x = Math.cos(angle) * 0.8;
                p.userData.velocity.z = Math.sin(angle) * 0.8;
                p.material.color.setHex(0xffffff); 
            }
            if (p.position.y < -10 && p.position.y > -20 && p.position.z < -15 && p.position.z > -25 && p.position.x > -60 && p.position.x < 60) {
                p.userData.onGround = true; p.position.y = -10; p.material.color.setHex(0x00ffff); 
            }
            if (p.position.y < -25) { p.userData.onGround = true; p.position.y = -25; }
        } else {
            p.userData.life -= 1; 
            p.material.opacity = p.userData.life / 100; 
            p.position.x += (Math.random() - 0.5) * 0.1;
            if (p.userData.life <= 0) { scene.remove(p); particles.splice(i, 1); }
        }
    }

    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    
    // Actualizar posición de cámara si gira el celular
    updateCameraDistance();
});

animate();