import * as THREE from 'three';

export interface ProceduralTextureSet {
  myocardiumMap: THREE.CanvasTexture;
  myocardiumNormal: THREE.CanvasTexture;
  brainMap: THREE.CanvasTexture;
  brainNormal: THREE.CanvasTexture;
  cerebellumNormal: THREE.CanvasTexture;
  lungMap: THREE.CanvasTexture;
  lungNormal: THREE.CanvasTexture;
  liverMap: THREE.CanvasTexture;
  stomachMap: THREE.CanvasTexture;
  kidneyMap: THREE.CanvasTexture;
  boneMap: THREE.CanvasTexture;
  muscleMap: THREE.CanvasTexture;
  muscleNormal: THREE.CanvasTexture;
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

/** Converts a grayscale height canvas into a tangent-space RGB normal map via Sobel filter */
function heightCanvasToNormalTexture(
  heightCanvas: HTMLCanvasElement,
  strength: number,
  anisotropy: number,
  repeat = 1,
): THREE.CanvasTexture {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const hCtx = heightCanvas.getContext('2d')!;
  const src = hCtx.getImageData(0, 0, w, h).data;

  const [nCanvas, nCtx] = makeCanvas(w);
  const dstImg = nCtx.createImageData(w, h);
  const dst = dstImg.data;

  const sample = (x: number, y: number) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = sample(x - 1, y - 1);
      const t = sample(x, y - 1);
      const tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y);
      const r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1);
      const b = sample(x, y + 1);
      const br = sample(x + 1, y + 1);

      const dx = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dy = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const dz = 1.0;
      const len = Math.hypot(dx, dy, dz);

      const idx = (y * w + x) * 4;
      dst[idx] = Math.round(((-dx / len) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round(((-dy / len) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round(((dz / len) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  nCtx.putImageData(dstImg, 0, 0);
  return finalizeTexture(nCanvas, false, anisotropy, repeat);
}

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

export function createAnatomicalTextures(maxAnisotropy: number): ProceduralTextureSet {
  const aniso = Math.min(maxAnisotropy || 4, 8);
  const rand = mulberry32(4219);

  // 1. Myocardium (Rich cardiac muscle fibers + capillary web)
  const [myoC, myoCtx] = makeCanvas(512);
  const [myoHC, myoHCtx] = makeCanvas(512);
  myoCtx.fillStyle = '#992632';
  myoCtx.fillRect(0, 0, 512, 512);
  myoHCtx.fillStyle = '#808080';
  myoHCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 650; i++) {
    const y = rand() * 512;
    const wave = (rand() - 0.5) * 20;
    myoCtx.strokeStyle =
      rand() > 0.45 ? 'rgba(122, 18, 30, 0.32)' : 'rgba(205, 78, 86, 0.22)';
    myoCtx.lineWidth = 1 + rand() * 2.4;
    myoCtx.beginPath();
    myoCtx.moveTo(0, y);
    myoCtx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
    myoCtx.stroke();

    myoHCtx.strokeStyle =
      rand() > 0.5 ? 'rgba(215, 215, 215, 0.3)' : 'rgba(45, 45, 45, 0.3)';
    myoHCtx.lineWidth = 1 + rand() * 2;
    myoHCtx.beginPath();
    myoHCtx.moveTo(0, y);
    myoHCtx.bezierCurveTo(170, y + wave, 340, y - wave, 512, y);
    myoHCtx.stroke();
  }
  const myocardiumMap = finalizeTexture(myoC, true, aniso, 2);
  const myocardiumNormal = heightCanvasToNormalTexture(myoHC, 2.2, aniso, 2);

  // 2. Skeletal Muscle Striation (Deep red fascicles + fine white perimysium)
  const [musC, musCtx] = makeCanvas(512);
  const [musHC, musHCtx] = makeCanvas(512);
  musCtx.fillStyle = '#a83636';
  musCtx.fillRect(0, 0, 512, 512);
  musHCtx.fillStyle = '#808080';
  musHCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 700; i++) {
    const x = rand() * 512;
    const isFascia = rand() > 0.88;
    musCtx.strokeStyle = isFascia
      ? 'rgba(235, 210, 200, 0.24)'
      : rand() > 0.5
        ? 'rgba(130, 28, 28, 0.34)'
        : 'rgba(198, 72, 68, 0.24)';
    musCtx.lineWidth = isFascia ? 1.2 : 1.5 + rand() * 2.5;
    musCtx.beginPath();
    musCtx.moveTo(x, 0);
    musCtx.quadraticCurveTo(x + (rand() - 0.5) * 14, 256, x, 512);
    musCtx.stroke();

    musHCtx.strokeStyle = rand() > 0.5 ? 'rgba(220,220,220,0.28)' : 'rgba(40,40,40,0.28)';
    musHCtx.lineWidth = 1.5 + rand() * 2;
    musHCtx.beginPath();
    musHCtx.moveTo(x, 0);
    musHCtx.lineTo(x, 512);
    musHCtx.stroke();
  }
  const muscleMap = finalizeTexture(musC, true, aniso, 2);
  const muscleNormal = heightCanvasToNormalTexture(musHC, 2.6, aniso, 2);

  // 3. Brain Gyri & Sulci (Deep cortical folds + sulcal AO + fine pial vessels)
  const [brC, brCtx] = makeCanvas(512);
  const [brHC, brHCtx] = makeCanvas(512);
  brCtx.fillStyle = '#e0afa4';
  brCtx.fillRect(0, 0, 512, 512);
  brHCtx.fillStyle = '#d4d4d4';
  brHCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 120; i++) {
    let x = rand() * 512;
    let y = rand() * 512;
    const steps = 12 + Math.floor(rand() * 14);
    let angle = rand() * Math.PI * 2;

    brCtx.beginPath();
    brHCtx.beginPath();
    brCtx.moveTo(x, y);
    brHCtx.moveTo(x, y);
    for (let s = 0; s < steps; s++) {
      angle += (rand() - 0.5) * 1.45;
      const len = 12 + rand() * 14;
      const nx = x + Math.cos(angle) * len;
      const ny = y + Math.sin(angle) * len;
      brCtx.quadraticCurveTo(x, y, nx, ny);
      brHCtx.quadraticCurveTo(x, y, nx, ny);
      x = nx;
      y = ny;
    }
    brCtx.strokeStyle = 'rgba(105, 48, 46, 0.65)';
    brCtx.lineWidth = 6 + rand() * 4;
    brCtx.lineCap = 'round';
    brCtx.stroke();

    brCtx.strokeStyle = 'rgba(245, 208, 198, 0.45)';
    brCtx.lineWidth = 2.5;
    brCtx.stroke();

    brHCtx.strokeStyle = 'rgba(18, 18, 18, 0.85)';
    brHCtx.lineWidth = 8 + rand() * 4;
    brHCtx.lineCap = 'round';
    brHCtx.stroke();
  }
  // Fine pial capillaries
  for (let i = 0; i < 45; i++) {
    brCtx.strokeStyle = 'rgba(185, 45, 55, 0.25)';
    brCtx.lineWidth = 1;
    brCtx.beginPath();
    const x = rand() * 512;
    const y = rand() * 512;
    brCtx.moveTo(x, y);
    brCtx.bezierCurveTo(x + 30, y - 20, x - 20, y + 40, x + 45, y + 60);
    brCtx.stroke();
  }
  const brainMap = finalizeTexture(brC, true, aniso, 2);
  const brainNormal = heightCanvasToNormalTexture(brHC, 3.2, aniso, 2);

  // 4. Cerebellum Folia
  const [cerHC, cerHCtx] = makeCanvas(512);
  cerHCtx.fillStyle = '#909090';
  cerHCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 5) {
    cerHCtx.fillStyle = (y / 5) % 2 === 0 ? '#e6e6e6' : '#2a2a2a';
    cerHCtx.fillRect(0, y, 512, 2.5);
  }
  const cerebellumNormal = heightCanvasToNormalTexture(cerHC, 3.0, aniso, 2);

  // 5. Lung Pleural Lobules
  const [lgC, lgCtx] = makeCanvas(512);
  const [lgHC, lgHCtx] = makeCanvas(512);
  lgCtx.fillStyle = '#d6898d';
  lgCtx.fillRect(0, 0, 512, 512);
  lgHCtx.fillStyle = '#b0b0b0';
  lgHCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 280; i++) {
    const cx = rand() * 512;
    const cy = rand() * 512;
    const r = 9 + rand() * 16;
    lgCtx.strokeStyle = 'rgba(115, 62, 72, 0.3)';
    lgCtx.lineWidth = 1.4;
    lgCtx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + rand() * 0.2;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (k === 0) lgCtx.moveTo(px, py);
      else lgCtx.lineTo(px, py);
    }
    lgCtx.closePath();
    lgCtx.stroke();

    lgHCtx.strokeStyle = 'rgba(40,40,40,0.4)';
    lgHCtx.lineWidth = 2;
    lgHCtx.beginPath();
    lgHCtx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
    lgHCtx.stroke();
  }
  const lungMap = finalizeTexture(lgC, true, aniso, 2);
  const lungNormal = heightCanvasToNormalTexture(lgHC, 2.0, aniso, 2);

  // 6. Liver, Stomach, Kidney, Bone
  const [lvC, lvCtx] = makeCanvas(512);
  lvCtx.fillStyle = '#792922';
  lvCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 800; i++) {
    lvCtx.fillStyle = rand() > 0.5 ? 'rgba(92, 26, 22, 0.28)' : 'rgba(155, 65, 55, 0.18)';
    lvCtx.beginPath();
    lvCtx.arc(rand() * 512, rand() * 512, 1.5 + rand() * 5, 0, Math.PI * 2);
    lvCtx.fill();
  }
  const liverMap = finalizeTexture(lvC, true, aniso, 2);

  const [stC, stCtx] = makeCanvas(512);
  stCtx.fillStyle = '#cb756a';
  stCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 220; i++) {
    stCtx.strokeStyle = 'rgba(160, 72, 62, 0.24)';
    stCtx.lineWidth = 2 + rand() * 3;
    const x = rand() * 512;
    stCtx.beginPath();
    stCtx.moveTo(x, 0);
    stCtx.bezierCurveTo(x + 25, 170, x - 25, 340, x, 512);
    stCtx.stroke();
  }
  const stomachMap = finalizeTexture(stC, true, aniso, 1);

  const [kdC, kdCtx] = makeCanvas(512);
  kdCtx.fillStyle = '#8b332f';
  kdCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 550; i++) {
    kdCtx.fillStyle = rand() > 0.5 ? 'rgba(110, 34, 30, 0.28)' : 'rgba(170, 75, 65, 0.18)';
    kdCtx.beginPath();
    kdCtx.arc(rand() * 512, rand() * 512, 1.5 + rand() * 4, 0, Math.PI * 2);
    kdCtx.fill();
  }
  const kidneyMap = finalizeTexture(kdC, true, aniso, 1);

  const [bnC, bnCtx] = makeCanvas(512);
  bnCtx.fillStyle = '#e4dccb';
  bnCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 600; i++) {
    bnCtx.fillStyle = rand() > 0.5 ? 'rgba(195, 182, 160, 0.22)' : 'rgba(245, 240, 230, 0.2)';
    bnCtx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 8, 1 + rand() * 2);
  }
  const boneMap = finalizeTexture(bnC, true, aniso, 1);

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
    myocardiumNormal,
    brainMap,
    brainNormal,
    cerebellumNormal,
    lungMap,
    lungNormal,
    liverMap,
    stomachMap,
    kidneyMap,
    boneMap,
    muscleMap,
    muscleNormal,
    contactShadowMap,
    dispose: () => {
      myocardiumMap.dispose();
      myocardiumNormal.dispose();
      brainMap.dispose();
      brainNormal.dispose();
      cerebellumNormal.dispose();
      lungMap.dispose();
      lungNormal.dispose();
      liverMap.dispose();
      stomachMap.dispose();
      kidneyMap.dispose();
      boneMap.dispose();
      muscleMap.dispose();
      muscleNormal.dispose();
      contactShadowMap.dispose();
    },
  };
}
