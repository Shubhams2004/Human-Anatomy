import * as THREE from 'three';

export interface ProceduralTextureSet {
  myocardiumMap: THREE.CanvasTexture;
  myocardiumBump: THREE.CanvasTexture;
  brainMap: THREE.CanvasTexture;
  brainBump: THREE.CanvasTexture;
  cerebellumBump: THREE.CanvasTexture;
  lungMap: THREE.CanvasTexture;
  lungBump: THREE.CanvasTexture;
  liverMap: THREE.CanvasTexture;
  stomachMap: THREE.CanvasTexture;
  kidneyMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size = 512): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeat = 1,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

// Deterministic pseudo-random for clean repeatable textures
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createAnatomicalTextures(
  maxAnisotropy: number,
): ProceduralTextureSet {
  const aniso = Math.min(maxAnisotropy || 4, 8);
  const rand = mulberry32(4219);

  // 1. Myocardium (striated cardiac muscle + subtle capillary branching)
  const [myoC, myoCtx] = makeCanvas(512);
  myoCtx.fillStyle = '#9c2c38';
  myoCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 420; i++) {
    const y = rand() * 512;
    myoCtx.strokeStyle =
      rand() > 0.5 ? 'rgba(130, 24, 38, 0.25)' : 'rgba(195, 72, 82, 0.16)';
    myoCtx.lineWidth = 1 + rand() * 2.5;
    myoCtx.beginPath();
    myoCtx.moveTo(0, y);
    myoCtx.bezierCurveTo(
      170,
      y + (rand() - 0.5) * 18,
      340,
      y + (rand() - 0.5) * 18,
      512,
      y,
    );
    myoCtx.stroke();
  }
  // Subtle epicardial fat / vessels
  for (let i = 0; i < 24; i++) {
    myoCtx.strokeStyle = 'rgba(218, 175, 130, 0.14)';
    myoCtx.lineWidth = 2 + rand() * 3;
    myoCtx.beginPath();
    const x = rand() * 512;
    myoCtx.moveTo(x, 0);
    myoCtx.quadraticCurveTo(x + (rand() - 0.5) * 60, 256, x + (rand() - 0.5) * 40, 512);
    myoCtx.stroke();
  }
  const myocardiumMap = finalizeTexture(myoC, true, aniso, 2);

  const [myoBC, myoBCtx] = makeCanvas(512);
  myoBCtx.fillStyle = '#808080';
  myoBCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 400; i++) {
    const y = rand() * 512;
    myoBCtx.strokeStyle =
      rand() > 0.5 ? 'rgba(210,210,210,0.22)' : 'rgba(55,55,55,0.22)';
    myoBCtx.lineWidth = 1 + rand() * 2;
    myoBCtx.beginPath();
    myoBCtx.moveTo(0, y);
    myoBCtx.lineTo(512, y + (rand() - 0.5) * 12);
    myoBCtx.stroke();
  }
  const myocardiumBump = finalizeTexture(myoBC, false, aniso, 2);

  // 2. Brain Gyri & Sulci (convoluted cortical folds)
  const [brC, brCtx] = makeCanvas(512);
  const [brBC, brBCtx] = makeCanvas(512);
  brCtx.fillStyle = '#d9a79c';
  brCtx.fillRect(0, 0, 512, 512);
  brBCtx.fillStyle = '#b8b8b8';
  brBCtx.fillRect(0, 0, 512, 512);

  // Draw winding sulci grooves & raised gyri highlights
  for (let i = 0; i < 95; i++) {
    let x = rand() * 512;
    let y = rand() * 512;
    const steps = 10 + Math.floor(rand() * 12);
    let angle = rand() * Math.PI * 2;

    brCtx.beginPath();
    brBCtx.beginPath();
    brCtx.moveTo(x, y);
    brBCtx.moveTo(x, y);

    for (let s = 0; s < steps; s++) {
      angle += (rand() - 0.5) * 1.45;
      const len = 14 + rand() * 16;
      const nx = x + Math.cos(angle) * len;
      const ny = y + Math.sin(angle) * len;
      brCtx.quadraticCurveTo(x, y, nx, ny);
      brBCtx.quadraticCurveTo(x, y, nx, ny);
      x = nx;
      y = ny;
    }
    // Sulcus dark groove
    brCtx.strokeStyle = 'rgba(128, 66, 62, 0.58)';
    brCtx.lineWidth = 5 + rand() * 4;
    brCtx.lineCap = 'round';
    brCtx.stroke();

    // Inner bright gyrus ridge
    brCtx.strokeStyle = 'rgba(236, 194, 184, 0.42)';
    brCtx.lineWidth = 2.5;
    brCtx.stroke();

    // Bump groove
    brBCtx.strokeStyle = 'rgba(28, 28, 28, 0.78)';
    brBCtx.lineWidth = 7 + rand() * 4;
    brBCtx.lineCap = 'round';
    brBCtx.stroke();
  }
  const brainMap = finalizeTexture(brC, true, aniso, 2);
  const brainBump = finalizeTexture(brBC, false, aniso, 2);

  // 3. Cerebellum Folia (fine parallel horizontal ridges)
  const [cerC, cerCtx] = makeCanvas(512);
  cerCtx.fillStyle = '#909090';
  cerCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 6) {
    cerCtx.fillStyle = (y / 6) % 2 === 0 ? '#d8d8d8' : '#3a3a3a';
    cerCtx.fillRect(0, y, 512, 3);
  }
  const cerebellumBump = finalizeTexture(cerC, false, aniso, 2);

  // 4. Lung Pleural Lobules (polygonal secondary pulmonary lobules)
  const [lgC, lgCtx] = makeCanvas(512);
  const [lgBC, lgBCtx] = makeCanvas(512);
  lgCtx.fillStyle = '#d48b8d';
  lgCtx.fillRect(0, 0, 512, 512);
  lgBCtx.fillStyle = '#a0a0a0';
  lgBCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 240; i++) {
    const cx = rand() * 512;
    const cy = rand() * 512;
    const r = 10 + rand() * 18;
    lgCtx.strokeStyle = 'rgba(130, 74, 82, 0.25)';
    lgCtx.lineWidth = 1.5;
    lgCtx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.25;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (k === 0) lgCtx.moveTo(px, py);
      else lgCtx.lineTo(px, py);
    }
    lgCtx.closePath();
    lgCtx.stroke();

    lgBCtx.strokeStyle = 'rgba(45,45,45,0.35)';
    lgBCtx.lineWidth = 2;
    lgBCtx.beginPath();
    lgBCtx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    lgBCtx.stroke();
  }
  const lungMap = finalizeTexture(lgC, true, aniso, 2);
  const lungBump = finalizeTexture(lgBC, false, aniso, 2);

  // 5. Liver Parenchyma (rich reddish-mahogany with subtle lobular speckle)
  const [lvC, lvCtx] = makeCanvas(512);
  lvCtx.fillStyle = '#7b2c26';
  lvCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 650; i++) {
    lvCtx.fillStyle =
      rand() > 0.5 ? 'rgba(98, 30, 26, 0.25)' : 'rgba(148, 62, 52, 0.16)';
    lvCtx.beginPath();
    lvCtx.arc(rand() * 512, rand() * 512, 2 + rand() * 6, 0, Math.PI * 2);
    lvCtx.fill();
  }
  const liverMap = finalizeTexture(lvC, true, aniso, 2);

  // 6. Stomach Serosa
  const [stC, stCtx] = makeCanvas(512);
  stCtx.fillStyle = '#c8736a';
  stCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 180; i++) {
    stCtx.strokeStyle = 'rgba(165, 76, 68, 0.22)';
    stCtx.lineWidth = 2 + rand() * 3;
    const x = rand() * 512;
    stCtx.beginPath();
    stCtx.moveTo(x, 0);
    stCtx.bezierCurveTo(x + 25, 170, x - 25, 340, x, 512);
    stCtx.stroke();
  }
  const stomachMap = finalizeTexture(stC, true, aniso, 1);

  // 7. Kidney Cortex
  const [kdC, kdCtx] = makeCanvas(512);
  kdCtx.fillStyle = '#8d3632';
  kdCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 500; i++) {
    kdCtx.fillStyle =
      rand() > 0.5 ? 'rgba(115, 38, 34, 0.28)' : 'rgba(168, 72, 64, 0.18)';
    kdCtx.beginPath();
    kdCtx.arc(rand() * 512, rand() * 512, 1.5 + rand() * 4, 0, Math.PI * 2);
    kdCtx.fill();
  }
  const kidneyMap = finalizeTexture(kdC, true, aniso, 1);

  // 8. Soft Radial Contact Shadow
  const [shC, shCtx] = makeCanvas(256);
  const grad = shCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(2, 6, 18, 0.65)');
  grad.addColorStop(0.5, 'rgba(2, 6, 18, 0.28)');
  grad.addColorStop(1, 'rgba(2, 6, 18, 0.0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 256, 256);
  const contactShadowMap = finalizeTexture(shC, false, 1, 1);

  return {
    myocardiumMap,
    myocardiumBump,
    brainMap,
    brainBump,
    cerebellumBump,
    lungMap,
    lungBump,
    liverMap,
    stomachMap,
    kidneyMap,
    contactShadowMap,
    dispose: () => {
      myocardiumMap.dispose();
      myocardiumBump.dispose();
      brainMap.dispose();
      brainBump.dispose();
      cerebellumBump.dispose();
      lungMap.dispose();
      lungBump.dispose();
      liverMap.dispose();
      stomachMap.dispose();
      kidneyMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
