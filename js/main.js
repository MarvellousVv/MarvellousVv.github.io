import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls;
let flashlight, flashlightOn = true;
let enemy, enemySpeed = 0.6, enemyActive = false;
let battery = 100;
let batteryDrainRate = 4; // percent per minute
let lastTime = performance.now();
let overlayMessage = document.getElementById('message');
let batteryEl = document.getElementById('battery-value');

init();
animate();

function init(){
  // Renderer
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  // Scene
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.03);

  // Camera
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);

  // Controls
  controls = new PointerLockControls(camera, renderer.domElement);
  controls.getObject().position.set(0,1.6,10);

  const onClick = () => {
    controls.lock();
    overlayMessage.classList.add('hidden');
  };
  overlayMessage.addEventListener('click', onClick);

  controls.addEventListener('lock', ()=> overlayMessage.classList.add('hidden'));
  controls.addEventListener('unlock', ()=> overlayMessage.classList.remove('hidden'));

  // Floor
  const floorGeo = new THREE.PlaneGeometry(60,60);
  const floorMat = new THREE.MeshStandardMaterial({color:0x111111});
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  // Walls - simple box Room
  const wallMat = new THREE.MeshStandardMaterial({color:0x070707});
  const room = new THREE.Mesh(new THREE.BoxGeometry(40,8,40), wallMat);
  room.position.set(0,4,0);
  room.material.side = THREE.BackSide;
  scene.add(room);

  // Ambient light
  scene.add(new THREE.AmbientLight(0x222222));

  // Flashlight
  flashlight = new THREE.SpotLight(0xffffff, 2, 30, Math.PI/8, 0.5);
  flashlight.position.copy(camera.position);
  flashlight.target.position.set(camera.position.x, camera.position.y, camera.position.z-1);
  scene.add(flashlight);
  scene.add(flashlight.target);

  // A glowing objective orb
  const orbGeo = new THREE.SphereGeometry(0.6,32,32);
  const orbMat = new THREE.MeshStandardMaterial({emissive:0x00ff88,emissiveIntensity:1,color:0x003322});
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.set( -8, 1.2, -8 );
  scene.add(orb);

  // Enemy (simple red sphere)
  const eGeo = new THREE.SphereGeometry(0.9,24,24);
  const eMat = new THREE.MeshStandardMaterial({color:0x330000,emissive:0x220000});
  enemy = new THREE.Mesh(eGeo,eMat);
  enemy.position.set(10,0.9,10);
  scene.add(enemy);

  // Player collision placeholder
  camera.userData.velocity = new THREE.Vector3();
  camera.userData.speed = 6;

  // Keyboard
  const keys = {};
  document.addEventListener('keydown',(e)=>{
    keys[e.code] = true;
    if(e.code === 'KeyF') toggleFlashlight();
  });
  document.addEventListener('keyup',(e)=> keys[e.code]=false);

  // Simple movement loop using controls.getObject()
  function movePlayer(delta){
    const dir = new THREE.Vector3();
    const forward = (keys['KeyW']?1:0) - (keys['KeyS']?1:0);
    const strafe = (keys['KeyD']?1:0) - (keys['KeyA']?1:0);
    dir.set(strafe,0,forward).normalize();
    const quat = controls.getObject().quaternion;
    dir.applyQuaternion(quat);
    dir.y = 0;
    controls.getObject().position.addScaledVector(dir, camera.userData.speed * delta);
    // keep inside room
    controls.getObject().position.x = THREE.MathUtils.clamp(controls.getObject().position.x, -19, 19);
    controls.getObject().position.z = THREE.MathUtils.clamp(controls.getObject().position.z, -19, 19);
  }

  // Expose movePlayer for animate
  camera.userData.movePlayer = movePlayer;

  // Resize
  window.addEventListener('resize', onWindowResize);
  function onWindowResize(){
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // simple ambient noise
  initAudio();
}

function toggleFlashlight(){
  flashlightOn = !flashlightOn;
  flashlight.intensity = flashlightOn ? 2 : 0.05;
}

function animate(){
  requestAnimationFrame(animate);
  const now = performance.now();
  const delta = (now - lastTime)/1000;
  lastTime = now;

  // Update battery only while flashlight is on and player is playing
  if(flashlightOn && controls.isLocked){
    battery -= (batteryDrainRate/60) * delta; // per second
    battery = Math.max(0, battery);
    if(battery === 0 && flashlightOn){ toggleFlashlight(); }
  }
  batteryEl.textContent = Math.round(battery);

  // Position flashlight with camera
  flashlight.position.copy(controls.getObject().position);
  const forward = new THREE.Vector3(0,0,-1).applyQuaternion(controls.getObject().quaternion);
  flashlight.target.position.copy(controls.getObject().position).add(forward);
  flashlight.target.updateMatrixWorld();

  // Move player
  camera.userData.movePlayer(delta);

  // Enemy behavior
  const playerPos = controls.getObject().position;
  const dist = enemy.position.distanceTo(playerPos);
  if(dist < 12) enemyActive = true; // detect range
  if(enemyActive){
    // chase the player
    const dir = new THREE.Vector3().subVectors(playerPos, enemy.position).setY(0).normalize();
    enemy.position.addScaledVector(dir, enemySpeed * delta * 2);
  } else {
    // simple patrol
    enemy.position.x += Math.sin(now/1000)*0.002;
  }

  // If enemy hits player -> jump scare
  if(dist < 1.5){
    triggerJumpScare();
  }

  renderer.render(scene,camera);
}

let screaming = false;
function triggerJumpScare(){
  if(screaming) return;
  screaming = true;
  document.body.style.backgroundColor = 'red';
  document.body.classList.add('flash');
  setTimeout(()=>{ document.body.style.backgroundColor = ''; document.body.classList.remove('flash'); screaming=false; }, 600);
  // loud oscillator
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 220;
    g.gain.value = 0.8;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    setTimeout(()=>{ o.stop(); ctx.close(); }, 650);
  } catch(e){ console.warn('Audio failed',e); }
}

function initAudio(){
  // subtle ambient noise using oscillator
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 55;
    g.gain.value = 0.02;
    o.connect(g); g.connect(ctx.destination);
    o.start();
    // do not close; small leak but acceptable for prototype
  } catch(e){ console.warn('Audio init failed', e); }
}

