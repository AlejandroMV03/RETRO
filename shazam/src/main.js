import * as THREE from 'three';

// --- 1. ESCENARIO ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000); 
scene.fog = new THREE.FogExp2(0x000000, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 70); 
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ReinhardToneMapping;
renderer.toneMappingExposure = 2.0;
document.body.appendChild(renderer.domElement);

const floorY = -15; // Suelo real

// --- 2. LAPTOP RGB (OBSTÁCULO) ---
const centerGroup = new THREE.Group();
scene.add(centerGroup);

// Materiales
const frameMat = new THREE.MeshStandardMaterial({ 
    color: 0x111111, wireframe: true, emissive: 0xff0000, emissiveIntensity: 2 
});
const screenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });

function createLaptop() {
    const laptop = new THREE.Group();
    // Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(22, 1.5, 16), frameMat);
    laptop.add(base);
    // Pantalla
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(22, 14, 0.5), frameMat);
    screenFrame.position.set(0, 7, -8);
    screenFrame.rotation.x = 0.2;
    laptop.add(screenFrame);
    // Luz
    const screenLight = new THREE.Mesh(new THREE.PlaneGeometry(20, 12), screenMat);
    screenLight.position.set(0, 7, -7.6);
    screenLight.rotation.x = 0.2;
    laptop.add(screenLight);
    
    return laptop;
}
const laptop = createLaptop();
centerGroup.add(laptop);

const mainLight = new THREE.PointLight(0xffffff, 3, 100);
mainLight.position.set(0, 10, 0);
centerGroup.add(mainLight);


// --- 3. CARRO LIMPIADOR ---
function createCar() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.2 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 8), bodyMat);
    chassis.position.y = 4;
    group.add(chassis);
    
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 6), bodyMat);
    cabin.position.set(-3, 9, 0);
    group.add(cabin);
    
    const blade = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 18), darkMat);
    blade.position.set(8, 3, 0);
    blade.rotation.z = -0.2;
    group.add(blade);
    
    const wheelGeo = new THREE.CylinderGeometry(2.5, 2.5, 2, 16);
    wheelGeo.rotateX(Math.PI/2);
    const wheels = [
        {x:-4, z:5}, {x:4, z:5}, {x:-4, z:-5}, {x:4, z:-5}
    ];
    wheels.forEach(pos => {
        const w = new THREE.Mesh(wheelGeo, darkMat);
        w.position.set(pos.x, 2.5, pos.z);
        group.add(w);
    });

    return group;
}
const cleanerCar = createCar();
cleanerCar.position.set(-150, floorY, 0);
scene.add(cleanerCar);


// --- 4. SISTEMA DE LLUVIA (MODIFICADO: SOLO NÚMEROS Y ÁREA GRANDE) ---
function createCharTexture(char) {
    const cvs = document.createElement('canvas');
    cvs.width = 64; cvs.height = 64;
    const ctx = cvs.getContext('2d');
    ctx.font = 'bold 50px monospace';
    ctx.fillStyle = '#00ff00';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 32, 32);
    return new THREE.CanvasTexture(cvs);
}

// CAMBIO 1: Solamente números del 0 al 9
const chars = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const textures = chars.map(c => createCharTexture(c));

const fallingParticles = [];
const piledParticles = [];

function spawnDrop(volume) {
    const tex = textures[Math.floor(Math.random() * textures.length)];
    const mat = new THREE.SpriteMaterial({ map: tex, color: 0x00ff00, transparent: true });
    const sprite = new THREE.Sprite(mat);
    
    // CAMBIO 2: Área masiva ("De todos lados")
    // Aumentamos el spread de 60 a 250 para cubrir toda la pantalla
    const spreadX = 250; 
    const spreadZ = 150; // Profundidad

    sprite.position.set(
        (Math.random() - 0.5) * spreadX, 
        60, // Caen desde un poco más alto
        (Math.random() - 0.5) * spreadZ
    );
    
    const size = 1.5 + Math.random() * 2;
    sprite.scale.set(size, size, 1);
    
    // Velocidad vertical y un poco de deriva horizontal
    sprite.userData = { 
        velocityY: -(0.3 + volume), 
        velocityX: 0,
        velocityZ: 0,
        onLaptop: false // Flag para saber si está resbalando en la lap
    };
    
    scene.add(sprite);
    fallingParticles.push(sprite);
}


// --- 5. INTERFAZ Y AUDIO ---
let analyser, dataArray, isAudioActive = false;
const startButton = document.getElementById('start-btn');
const uiContainer = document.getElementById('ui-container');
const fullscreenBtn = document.getElementById('fullscreen-btn');

// Lógica Robusta de Pantalla Completa
fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(err); // Por si falla
        });
    } else {
        document.exitFullscreen();
    }
});

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
        uiContainer.style.display = 'none';
    } catch (e) { console.error(e); }
}
if(startButton) startButton.addEventListener('click', startCapture);


// --- 6. ANIMACIÓN FÍSICA ---
let hue = 0;
let silenceTimer = 0;
let isSweeping = false;

function animate() {
    requestAnimationFrame(animate);

    // -- AUDIO --
    let volume = 0, bass = 0;
    if (isAudioActive) {
        analyser.getByteFrequencyData(dataArray);
        bass = dataArray[5] / 255;
        let sum = 0; for(let i=0; i<dataArray.length; i++) sum+=dataArray[i];
        volume = sum / dataArray.length / 255;
    }

    // -- LAPTOP FLOTANTE --
    hue += 0.005 + (bass * 0.02);
    if(hue>1) hue=0;
    const color = new THREE.Color().setHSL(hue, 1, 0.5);
    const oppColor = new THREE.Color().setHSL((hue+0.5)%1, 1, 0.5);
    
    frameMat.emissive.copy(color);
    screenMat.color.copy(oppColor);
    mainLight.color.copy(color);
    
    // Altura actual de la laptop (oscila)
    const laptopY = Math.sin(Date.now()*0.002)*2 + (bass*2);
    centerGroup.position.y = laptopY;
    // Rotación suave
    centerGroup.rotation.y += 0.005;

    // -- GENERAR GOTAS --
    if (volume > 0.02) {
        const count = Math.floor(volume*4)+1;
        for(let i=0; i<count; i++) spawnDrop(volume);
        silenceTimer = 0;
        isSweeping = false;
        cleanerCar.position.x = -150;
    } else {
        silenceTimer++;
    }

    // -- FÍSICA DE CAÍDA Y COLISIÓN --
    const laptopRadius = 14; // Radio aproximado de colisión de la laptop

    for (let i = fallingParticles.length - 1; i >= 0; i--) {
        const p = fallingParticles[i];
        
        // Aplicar gravedad
        p.position.y += p.userData.velocityY;
        p.position.x += p.userData.velocityX;
        p.position.z += p.userData.velocityZ;

        // 1. CHEQUEO DE COLISIÓN CON LAPTOP
        // Solo si está cayendo desde arriba y cruza la altura de la laptop
        if (p.position.y < laptopY + 2 && p.position.y > laptopY - 2 && !p.userData.onLaptop) {
            
            // Distancia al centro (ignoramos Y)
            const dist = Math.sqrt(p.position.x * p.position.x + p.position.z * p.position.z);
            
            if (dist < laptopRadius) {
                // ¡COLISIÓN DETECTADA!
                p.userData.onLaptop = true;
                p.position.y = laptopY + 2; // Lo ponemos encima
                p.userData.velocityY = 0;   // Deja de caer verticalmente rápido
                
                // Efecto de impacto: cambiar color a blanco momentáneo
                p.material.color.setHex(0xffffff);

                // Calcular dirección de rebote (del centro hacia afuera)
                const angle = Math.atan2(p.position.z, p.position.x);
                // Le damos un empujón fuerte hacia afuera para que resbale
                p.userData.velocityX = Math.cos(angle) * 0.8; 
                p.userData.velocityZ = Math.sin(angle) * 0.8;
                // Pequeño rebote hacia arriba
                p.userData.velocityY = 0.5; 
            }
        }

        // Si ya chocó y está "resbalando", aplicamos gravedad suave
        if (p.userData.onLaptop) {
            p.userData.velocityY -= 0.05; // Gravedad
            // Volver al color verde poco a poco
            if (p.material.color.g < 1) p.material.color.setHex(0x00ff00);
        }

        // 2. CHEQUEO DE COLISIÓN CON EL SUELO REAL
        if (p.position.y <= floorY) {
            // Se detiene en el suelo
            p.position.y = floorY + Math.random(); 
            p.material.color.setHex(0x004400); // Verde oscuro (basura)
            piledParticles.push(p);
            fallingParticles.splice(i, 1);
        }
    }

    // -- EL CARRO LIMPIADOR --
    if (silenceTimer > 180 && piledParticles.length > 0 && !isSweeping) {
        isSweeping = true;
        cleanerCar.position.x = -100;
    }

    if (isSweeping) {
        cleanerCar.position.x += 1.0; // Velocidad del carro
        cleanerCar.position.y = floorY + 3.5 + Math.sin(Date.now()*0.5)*0.2; // Vibración
        
        // Rotar ruedas
        cleanerCar.children.forEach((c, idx) => { if(idx>=3) c.rotation.x -= 0.3; });

        // Barrer basura
        const bladeX = cleanerCar.position.x + 10;
        for (let i = piledParticles.length - 1; i >= 0; i--) {
            const p = piledParticles[i];
            if (p.position.x < bladeX && p.position.x > bladeX - 10) {
                // Efecto de salir volando al ser empujado
                p.position.x += 2; // Empujar adelante
                p.position.y += Math.random(); // Saltar un poco
                p.material.opacity -= 0.1; // Desvanecer
                if(p.material.opacity <= 0) {
                    scene.remove(p);
                    piledParticles.splice(i, 1);
                }
            }
        }
        if (cleanerCar.position.x > 100) {
            isSweeping = false;
            cleanerCar.position.x = -150;
            silenceTimer = 0;
        }
    }

    // Limpieza de seguridad
    if (piledParticles.length > 1000) scene.remove(piledParticles.shift());

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

// Cambio para actualizar Netlify