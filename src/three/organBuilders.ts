import * as THREE from 'three';
import { ProceduralTextureSet } from './proceduralTextures';
import { OrganSystemId } from '../data/anatomyData';

function registerPart(
  obj: THREE.Object3D,
  partId: string,
  organId: Exclude<OrganSystemId, 'torso'>,
  explodeOffset: THREE.Vector3,
) {
  obj.userData.partId = partId;
  obj.userData.organId = organId;
  obj.userData.basePosition = obj.position.clone();
  obj.userData.explodeOffset = explodeOffset;
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.layers.enable(1);
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.partId = partId;
      child.userData.organId = organId;
    }
  });
}

function sculptGeometry(
  geo: THREE.BufferGeometry,
  fn: (v: THREE.Vector3) => void,
): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    fn(v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  return geo;
}

// ---------------------------------------------------------------------------
// 1. HEART (9+ distinct parts)
// ---------------------------------------------------------------------------
export function buildHeartGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'heart';

  const muscleMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#b8333f'),
    map: tex.myocardiumMap,
    bumpMap: tex.myocardiumBump,
    bumpScale: 0.025,
    roughness: 0.42,
    metalness: 0.02,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });

  const atriaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9c2839'),
    map: tex.myocardiumMap,
    roughness: 0.5,
    clearcoat: 0.4,
    clearcoatRoughness: 0.3,
  });

  const aortaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d14348'),
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
  });

  const pulmonaryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#5a6ea8'),
    roughness: 0.44,
    clearcoat: 0.35,
    clearcoatRoughness: 0.32,
  });

  const venaCavaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#445b96'),
    roughness: 0.48,
    clearcoat: 0.3,
    clearcoatRoughness: 0.35,
  });

  const coronaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e03b43'),
    roughness: 0.32,
    metalness: 0.05,
  });

  // A. Ventricular Myocardium (asymmetrical conical apex pointing down-left-anterior)
  const ventGeo = sculptGeometry(new THREE.SphereGeometry(0.68, 48, 40), (v) => {
    const ny = v.y / 0.68; // -1 to +1
    // Taper towards apex at bottom
    const taper = ny < 0 ? 1 - Math.pow(-ny, 1.35) * 0.58 : 1 - ny * 0.14;
    v.x *= taper * 0.96;
    v.z *= taper * 0.84;
    v.y *= 1.24;
    // Tilt apex slightly to anatomical left (+X in viewer's right / patient's left)
    if (ny < 0) {
      v.x += Math.pow(-ny, 1.4) * 0.28;
      v.z += Math.pow(-ny, 1.5) * 0.12;
    }
    // Subtle interventricular groove
    const groove = Math.exp(-Math.pow(v.x - 0.08, 2) * 18) * (v.z > 0 ? 0.04 : 0.02);
    v.z -= Math.sign(v.z) * groove;
  });
  const ventricles = new THREE.Mesh(ventGeo, muscleMat);
  ventricles.position.set(0.05, -0.18, 0);
  ventricles.name = 'heart_ventricles_mesh';
  registerPart(ventricles, 'heart_ventricles', 'heart', new THREE.Vector3(0, -0.45, 0.25));
  group.add(ventricles);

  // B. Atria & Auricles
  const atriaGroup = new THREE.Group();
  const rightAtriumGeo = sculptGeometry(new THREE.SphereGeometry(0.35, 32, 24), (v) => {
    v.y *= 1.08;
    v.x *= 0.92;
  });
  const rightAtrium = new THREE.Mesh(rightAtriumGeo, atriaMat);
  rightAtrium.position.set(-0.34, 0.42, 0.02);
  atriaGroup.add(rightAtrium);

  const leftAtriumGeo = sculptGeometry(new THREE.SphereGeometry(0.33, 32, 24), (v) => {
    v.x *= 1.05;
    v.z *= 0.88;
  });
  const leftAtrium = new THREE.Mesh(leftAtriumGeo, atriaMat);
  leftAtrium.position.set(0.28, 0.44, -0.14);
  atriaGroup.add(leftAtrium);

  registerPart(atriaGroup, 'heart_atria', 'heart', new THREE.Vector3(0, 0.35, -0.25));
  group.add(atriaGroup);

  // C. Aortic Arch + 3 Superior Branches
  const aortaGroup = new THREE.Group();
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0.28, 0.04),
    new THREE.Vector3(0.0, 0.78, 0.06),
    new THREE.Vector3(0.18, 1.04, -0.04),
    new THREE.Vector3(0.32, 0.86, -0.24),
    new THREE.Vector3(0.24, 0.12, -0.34),
    new THREE.Vector3(0.18, -0.78, -0.32),
  ]);
  const aortaMesh = new THREE.Mesh(
    new THREE.TubeGeometry(aortaCurve, 48, 0.145, 20, false),
    aortaMat,
  );
  aortaGroup.add(aortaMesh);

  // 3 branches from arch
  const branches: [THREE.Vector3, THREE.Vector3, number][] = [
    [new THREE.Vector3(-0.02, 0.96, 0.03), new THREE.Vector3(-0.14, 1.32, 0.04), 0.055],
    [new THREE.Vector3(0.11, 1.05, -0.02), new THREE.Vector3(0.1, 1.38, -0.02), 0.045],
    [new THREE.Vector3(0.23, 1.0, -0.1), new THREE.Vector3(0.32, 1.34, -0.12), 0.045],
  ];
  branches.forEach(([start, end, r]) => {
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.04, 0));
    const curve = new THREE.CatmullRomCurve3([start, mid, end]);
    const bMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, r, 12, false), aortaMat);
    aortaGroup.add(bMesh);
  });

  registerPart(aortaGroup, 'heart_aorta', 'heart', new THREE.Vector3(0.15, 0.65, 0.15));
  group.add(aortaGroup);

  // D. Pulmonary Trunk & Bifurcation
  const pulmGroup = new THREE.Group();
  const pulmTrunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0.25, 0.24),
    new THREE.Vector3(-0.04, 0.62, 0.22),
    new THREE.Vector3(0.08, 0.76, 0.06),
  ]);
  pulmGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(pulmTrunkCurve, 24, 0.12, 16, false), pulmonaryMat),
  );
  // Left pulmonary artery
  const lpaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.74, 0.06),
    new THREE.Vector3(0.38, 0.76, -0.02),
    new THREE.Vector3(0.62, 0.7, -0.08),
  ]);
  pulmGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(lpaCurve, 18, 0.085, 14, false), pulmonaryMat),
  );
  // Right pulmonary artery
  const rpaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.06, 0.74, 0.06),
    new THREE.Vector3(-0.28, 0.72, -0.06),
    new THREE.Vector3(-0.58, 0.66, -0.12),
  ]);
  pulmGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(rpaCurve, 18, 0.085, 14, false), pulmonaryMat),
  );
  registerPart(pulmGroup, 'heart_pulmonary', 'heart', new THREE.Vector3(-0.15, 0.45, 0.45));
  group.add(pulmGroup);

  // E. Superior & Inferior Vena Cava
  const vcGroup = new THREE.Group();
  const svcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.38, 0.48, -0.02),
    new THREE.Vector3(-0.4, 0.92, -0.04),
    new THREE.Vector3(-0.42, 1.28, -0.04),
  ]);
  vcGroup.add(new THREE.Mesh(new THREE.TubeGeometry(svcCurve, 20, 0.11, 16, false), venaCavaMat));

  const ivcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.36, 0.25, -0.12),
    new THREE.Vector3(-0.36, -0.35, -0.16),
    new THREE.Vector3(-0.36, -0.82, -0.18),
  ]);
  vcGroup.add(new THREE.Mesh(new THREE.TubeGeometry(ivcCurve, 20, 0.12, 16, false), venaCavaMat));
  registerPart(vcGroup, 'heart_vena_cava', 'heart', new THREE.Vector3(-0.55, 0.1, -0.15));
  group.add(vcGroup);

  // F. Coronary Arteries (LAD & Right Coronary)
  const corGroup = new THREE.Group();
  const ladCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0.25, 0.48),
    new THREE.Vector3(0.12, -0.05, 0.56),
    new THREE.Vector3(0.22, -0.45, 0.46),
    new THREE.Vector3(0.28, -0.82, 0.26),
  ]);
  corGroup.add(new THREE.Mesh(new THREE.TubeGeometry(ladCurve, 24, 0.024, 10, false), coronaryMat));

  const rcaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0.26, 0.42),
    new THREE.Vector3(-0.38, 0.08, 0.36),
    new THREE.Vector3(-0.44, -0.24, 0.12),
    new THREE.Vector3(-0.22, -0.58, -0.12),
  ]);
  corGroup.add(new THREE.Mesh(new THREE.TubeGeometry(rcaCurve, 24, 0.022, 10, false), coronaryMat));
  registerPart(corGroup, 'heart_coronary', 'heart', new THREE.Vector3(0.05, -0.15, 0.6));
  group.add(corGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 2. BRAIN (5+ distinct parts)
// ---------------------------------------------------------------------------
export function buildBrainGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'brain';

  const cortexMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dfa99d'),
    map: tex.brainMap,
    bumpMap: tex.brainBump,
    bumpScale: 0.045,
    roughness: 0.52,
    metalness: 0.0,
    clearcoat: 0.28,
    clearcoatRoughness: 0.42,
  });

  const cerebellumMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#c88a7e'),
    map: tex.brainMap,
    bumpMap: tex.cerebellumBump,
    bumpScale: 0.035,
    roughness: 0.6,
    clearcoat: 0.2,
  });

  const whiteMatterMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#ebe0d6'),
    roughness: 0.42,
    clearcoat: 0.3,
  });

  const stemMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e0cfc2'),
    roughness: 0.48,
    clearcoat: 0.25,
  });

  const buildHemisphere = (side: -1 | 1) => {
    const geo = sculptGeometry(new THREE.SphereGeometry(0.68, 48, 40), (v) => {
      // Elongate front-to-back (Z), flatten medial wall
      v.z *= 1.32;
      v.y *= 0.92;
      v.x *= 0.72;
      // Flatten medial longitudinal fissure face
      if (side === 1 && v.x < 0.02) v.x *= 0.14;
      if (side === -1 && v.x > -0.02) v.x *= 0.14;
      // Temporal lobe bulge inferior-laterally
      if (v.y < -0.05 && v.z > -0.2 && v.z < 0.45) {
        v.x += side * 0.08 * Math.exp(-Math.pow(v.y + 0.25, 2) * 8);
      }
      // Subtle occipital taper
      if (v.z < -0.3) {
        v.y += 0.06;
      }
    });
    const mesh = new THREE.Mesh(geo, cortexMat);
    mesh.position.set(side * 0.3, 0.22, 0.0);
    return mesh;
  };

  const leftHemi = buildHemisphere(1);
  registerPart(leftHemi, 'brain_cerebrum_left', 'brain', new THREE.Vector3(0.45, 0.12, 0));
  group.add(leftHemi);

  const rightHemi = buildHemisphere(-1);
  registerPart(rightHemi, 'brain_cerebrum_right', 'brain', new THREE.Vector3(-0.45, 0.12, 0));
  group.add(rightHemi);

  // Corpus Callosum (C-shaped white matter commissure)
  const ccCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, 0.34),
    new THREE.Vector3(0, 0.28, 0.18),
    new THREE.Vector3(0, 0.32, -0.05),
    new THREE.Vector3(0, 0.22, -0.28),
    new THREE.Vector3(0, 0.12, -0.36),
  ]);
  const ccGeo = new THREE.TubeGeometry(ccCurve, 28, 0.09, 14, false);
  ccGeo.scale(1.6, 0.75, 1);
  const corpusCallosum = new THREE.Mesh(ccGeo, whiteMatterMat);
  registerPart(corpusCallosum, 'brain_corpus_callosum', 'brain', new THREE.Vector3(0, 0.45, 0));
  group.add(corpusCallosum);

  // Cerebellum (bilobed)
  const cerebGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const lobeGeo = sculptGeometry(new THREE.SphereGeometry(0.32, 32, 24), (v) => {
      v.x *= 0.92;
      v.y *= 0.74;
      v.z *= 0.88;
    });
    const lobe = new THREE.Mesh(lobeGeo, cerebellumMat);
    lobe.position.set(side * 0.24, -0.34, -0.44);
    cerebGroup.add(lobe);
  });
  registerPart(cerebGroup, 'brain_cerebellum', 'brain', new THREE.Vector3(0, -0.28, -0.45));
  group.add(cerebGroup);

  // Brainstem (Pons bulge + Medulla stalk)
  const stemGroup = new THREE.Group();
  const stemCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.04, -0.04),
    new THREE.Vector3(0, -0.22, -0.1),
    new THREE.Vector3(0, -0.58, -0.18),
    new THREE.Vector3(0, -0.92, -0.22),
  ]);
  const stemMesh = new THREE.Mesh(
    new THREE.TubeGeometry(stemCurve, 24, 0.125, 16, false),
    stemMat,
  );
  stemGroup.add(stemMesh);
  const pons = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 18), stemMat);
  pons.scale.set(1.1, 0.9, 1.0);
  pons.position.set(0, -0.2, -0.06);
  stemGroup.add(pons);

  registerPart(stemGroup, 'brain_brainstem', 'brain', new THREE.Vector3(0, -0.52, 0.1));
  group.add(stemGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 3. LUNGS & TRACHEA (5+ distinct parts)
// ---------------------------------------------------------------------------
export function buildLungsGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'lungs';

  const lungMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d9888b'),
    map: tex.lungMap,
    bumpMap: tex.lungBump,
    bumpScale: 0.028,
    roughness: 0.56,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    sheen: 0.35,
    sheenColor: new THREE.Color('#f7c6c8'),
  });

  const cartilageMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dce5ee'),
    roughness: 0.38,
    clearcoat: 0.3,
  });

  const bronchiMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c7b8be'),
    roughness: 0.55,
  });

  const diaphragmMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#a64246'),
    roughness: 0.52,
    clearcoat: 0.22,
  });

  // Trachea + C-rings (InstancedMesh)
  const tracheaGroup = new THREE.Group();
  const tracheaTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.11, 1.15, 24),
    bronchiMat,
  );
  tracheaTube.position.set(0, 0.85, 0);
  tracheaGroup.add(tracheaTube);

  const ringCount = 14;
  const ringGeo = new THREE.TorusGeometry(0.112, 0.017, 10, 24, Math.PI * 1.65);
  const ringInst = new THREE.InstancedMesh(ringGeo, cartilageMat, ringCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < ringCount; i++) {
    dummy.position.set(0, 0.36 + i * 0.072, 0);
    dummy.rotation.set(Math.PI / 2, 0, -Math.PI * 0.32);
    dummy.updateMatrix();
    ringInst.setMatrixAt(i, dummy.matrix);
  }
  ringInst.instanceMatrix.needsUpdate = true;
  ringInst.computeBoundingSphere();
  tracheaGroup.add(ringInst);

  registerPart(tracheaGroup, 'lung_trachea', 'lungs', new THREE.Vector3(0, 0.55, 0));
  group.add(tracheaGroup);

  // Bronchial Tree
  const bronchiGroup = new THREE.Group();
  const rightBronch = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(-0.24, 0.16, 0),
    new THREE.Vector3(-0.52, 0.0, 0.02),
  ]);
  const leftBronch = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(0.28, 0.14, 0),
    new THREE.Vector3(0.56, -0.02, 0.02),
  ]);
  bronchiGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(rightBronch, 18, 0.075, 14, false), bronchiMat),
    new THREE.Mesh(new THREE.TubeGeometry(leftBronch, 18, 0.07, 14, false), bronchiMat),
  );
  registerPart(bronchiGroup, 'lung_bronchi', 'lungs', new THREE.Vector3(0, 0.25, -0.25));
  group.add(bronchiGroup);

  // Right Lung (patient's right = -X)
  const rightLungGeo = sculptGeometry(new THREE.SphereGeometry(0.68, 44, 36), (v) => {
    const ny = v.y / 0.68;
    v.y *= 1.48;
    v.z *= 0.88;
    // Taper apex, broaden base
    const w = ny > 0 ? 1 - ny * 0.45 : 1 + (-ny) * 0.16;
    v.x *= w * 0.82;
    // Flatten medial mediastinal surface (+X side of right lung)
    if (v.x > 0.05) v.x *= 0.38;
    // Concave diaphragmatic base
    if (v.y < -0.75) {
      v.y += Math.exp(-(v.x * v.x + v.z * v.z) * 3) * 0.18;
    }
  });
  const rightLung = new THREE.Mesh(rightLungGeo, lungMat);
  rightLung.position.set(-0.58, -0.08, 0);
  rightLung.name = 'lung_right_mesh';
  registerPart(rightLung, 'lung_right', 'lungs', new THREE.Vector3(-0.55, 0, 0.1));
  group.add(rightLung);

  // Left Lung (patient's left = +X, with cardiac notch)
  const leftLungGeo = sculptGeometry(new THREE.SphereGeometry(0.66, 44, 36), (v) => {
    const ny = v.y / 0.66;
    v.y *= 1.48;
    v.z *= 0.88;
    const w = ny > 0 ? 1 - ny * 0.45 : 1 + (-ny) * 0.14;
    v.x *= w * 0.78;
    // Flatten medial surface (-X side of left lung) + cardiac notch
    if (v.x < -0.05) v.x *= 0.36;
    if (v.x < 0.0 && v.y < 0.1 && v.y > -0.75 && v.z > -0.1) {
      v.x += 0.16 * Math.exp(-Math.pow(v.y + 0.3, 2) * 6);
    }
    if (v.y < -0.75) {
      v.y += Math.exp(-(v.x * v.x + v.z * v.z) * 3) * 0.18;
    }
  });
  const leftLung = new THREE.Mesh(leftLungGeo, lungMat);
  leftLung.position.set(0.58, -0.08, 0);
  leftLung.name = 'lung_left_mesh';
  registerPart(leftLung, 'lung_left', 'lungs', new THREE.Vector3(0.55, 0, 0.1));
  group.add(leftLung);

  // Diaphragm Dome
  const diaphGeo = sculptGeometry(new THREE.SphereGeometry(1.15, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), (v) => {
    v.y *= 0.45;
    v.z *= 0.66;
    // Right dome slightly higher for liver
    if (v.x < 0) v.y += 0.06;
  });
  const diaphragm = new THREE.Mesh(diaphGeo, diaphragmMat);
  diaphragm.material.side = THREE.DoubleSide;
  diaphragm.position.set(0, -1.06, 0);
  diaphragm.name = 'lung_diaphragm_mesh';
  registerPart(diaphragm, 'lung_diaphragm', 'lungs', new THREE.Vector3(0, -0.55, 0));
  group.add(diaphragm);

  return group;
}

// ---------------------------------------------------------------------------
// 4. LIVER, GALLBLADDER & STOMACH (6+ distinct parts)
// ---------------------------------------------------------------------------
export function buildDigestiveGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'digestive';

  const liverMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#862c24'),
    map: tex.liverMap,
    roughness: 0.34,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });

  const gallbladderMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#3b7a4c'),
    roughness: 0.38,
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });

  const stomachMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cc7268'),
    map: tex.stomachMap,
    roughness: 0.48,
    clearcoat: 0.35,
    clearcoatRoughness: 0.3,
  });

  // Liver Right Lobe (-X anatomical right)
  const rLobeGeo = sculptGeometry(new THREE.SphereGeometry(0.65, 40, 32), (v) => {
    v.x *= 1.15;
    v.y *= 0.85;
    v.z *= 0.82;
    // Wedge taper inferiorly
    if (v.y < 0) v.z *= 0.72;
    if (v.x > 0.2) v.y *= 0.78;
  });
  const liverRight = new THREE.Mesh(rLobeGeo, liverMat);
  liverRight.position.set(-0.42, 0.26, 0.14);
  registerPart(liverRight, 'liver_right_lobe', 'digestive', new THREE.Vector3(-0.45, 0.3, 0.2));
  group.add(liverRight);

  // Liver Left Lobe
  const lLobeGeo = sculptGeometry(new THREE.SphereGeometry(0.42, 32, 24), (v) => {
    v.x *= 1.35;
    v.y *= 0.62;
    v.z *= 0.68;
    if (v.x > 0) {
      v.y *= 1 - (v.x / 0.6) * 0.45;
      v.z *= 1 - (v.x / 0.6) * 0.35;
    }
  });
  const liverLeft = new THREE.Mesh(lLobeGeo, liverMat);
  liverLeft.position.set(0.18, 0.32, 0.22);
  registerPart(liverLeft, 'liver_left_lobe', 'digestive', new THREE.Vector3(0.25, 0.4, 0.25));
  group.add(liverLeft);

  // Gallbladder
  const gbGeo = sculptGeometry(new THREE.SphereGeometry(0.14, 24, 18), (v) => {
    v.y *= 1.75;
    if (v.y > 0) {
      v.x *= 0.55;
      v.z *= 0.55;
    }
  });
  const gallbladder = new THREE.Mesh(gbGeo, gallbladderMat);
  gallbladder.position.set(-0.28, -0.14, 0.26);
  gallbladder.rotation.z = -0.35;
  registerPart(gallbladder, 'gallbladder', 'digestive', new THREE.Vector3(-0.3, -0.35, 0.45));
  group.add(gallbladder);

  // Esophagus
  const esoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.14, 1.15, -0.12),
    new THREE.Vector3(0.16, 0.68, -0.1),
    new THREE.Vector3(0.22, 0.28, -0.05),
  ]);
  const esophagus = new THREE.Mesh(
    new THREE.TubeGeometry(esoCurve, 20, 0.08, 14, false),
    stomachMat,
  );
  registerPart(esophagus, 'stomach_esophagus', 'digestive', new THREE.Vector3(0.1, 0.55, -0.25));
  group.add(esophagus);

  // Stomach (J-shaped via sculpted curve + variable radius or sculpted ellipsoid)
  const stomGeo = sculptGeometry(new THREE.SphereGeometry(0.46, 40, 32), (v) => {
    v.y *= 1.32;
    v.x *= 0.92;
    v.z *= 0.72;
    // J-curve bend toward pylorus (-X) at bottom
    if (v.y < 0) {
      v.x -= Math.pow(-v.y / 0.6, 1.6) * 0.45;
      v.x *= 0.85;
    }
  });
  const stomach = new THREE.Mesh(stomGeo, stomachMat);
  stomach.position.set(0.42, -0.12, -0.04);
  stomach.rotation.z = 0.25;
  registerPart(stomach, 'stomach_body', 'digestive', new THREE.Vector3(0.45, -0.15, -0.15));
  group.add(stomach);

  // Duodenum C-loop
  const duoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, -0.45, -0.02),
    new THREE.Vector3(-0.18, -0.52, -0.06),
    new THREE.Vector3(-0.22, -0.78, -0.08),
    new THREE.Vector3(0.05, -0.88, -0.06),
    new THREE.Vector3(0.32, -0.82, -0.02),
  ]);
  const duodenum = new THREE.Mesh(
    new THREE.TubeGeometry(duoCurve, 28, 0.095, 16, false),
    stomachMat,
  );
  registerPart(duodenum, 'duodenum', 'digestive', new THREE.Vector3(0, -0.55, 0.1));
  group.add(duodenum);

  return group;
}

// ---------------------------------------------------------------------------
// 5. KIDNEYS & RENAL SYSTEM (5+ distinct parts)
// ---------------------------------------------------------------------------
export function buildKidneysGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'kidneys';

  const kidneyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#963834'),
    map: tex.kidneyMap,
    roughness: 0.38,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22,
  });

  const adrenalMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d8a84e'),
    roughness: 0.52,
    clearcoat: 0.25,
  });

  const aortaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#c8353c'),
    roughness: 0.4,
    clearcoat: 0.4,
  });

  const ivcMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#425a96'),
    roughness: 0.45,
    clearcoat: 0.35,
  });

  const ureterMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#d8b698'),
    roughness: 0.5,
  });

  const makeBeanKidney = (side: -1 | 1) => {
    const geo = sculptGeometry(new THREE.SphereGeometry(0.36, 36, 28), (v) => {
      v.y *= 1.48;
      v.x *= 0.86;
      v.z *= 0.62;
      // Concave renal hilum facing midline
      const hilum = Math.exp(-v.y * v.y * 6);
      if (side === 1 && v.x < 0) v.x += hilum * 0.14;
      if (side === -1 && v.x > 0) v.x -= hilum * 0.14;
    });
    return new THREE.Mesh(geo, kidneyMat);
  };

  // Left kidney (+X, slightly higher)
  const leftKidney = makeBeanKidney(1);
  leftKidney.position.set(0.58, 0.24, 0);
  leftKidney.rotation.z = -0.1;
  registerPart(leftKidney, 'kidney_left', 'kidneys', new THREE.Vector3(0.45, 0.1, 0));
  group.add(leftKidney);

  // Right kidney (-X, slightly lower)
  const rightKidney = makeBeanKidney(-1);
  rightKidney.position.set(-0.58, 0.1, 0);
  rightKidney.rotation.z = 0.1;
  registerPart(rightKidney, 'kidney_right', 'kidneys', new THREE.Vector3(-0.45, 0.1, 0));
  group.add(rightKidney);

  // Adrenal Glands
  const adrenalGroup = new THREE.Group();
  const adrGeo = new THREE.ConeGeometry(0.14, 0.18, 18);
  const adrL = new THREE.Mesh(adrGeo, adrenalMat);
  adrL.position.set(0.5, 0.78, 0.02);
  adrL.rotation.z = 0.2;
  const adrR = new THREE.Mesh(adrGeo, adrenalMat);
  adrR.position.set(-0.5, 0.64, 0.02);
  adrR.rotation.z = -0.2;
  adrenalGroup.add(adrL, adrR);
  registerPart(adrenalGroup, 'adrenal_glands', 'kidneys', new THREE.Vector3(0, 0.45, 0));
  group.add(adrenalGroup);

  // Abdominal Aorta + IVC + Renal Pedicles
  const vesselGroup = new THREE.Group();
  const aortaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 1.75, 20), aortaMat);
  aortaStem.position.set(0.08, 0.02, -0.02);
  const ivcStem = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.105, 1.75, 20), ivcMat);
  ivcStem.position.set(-0.12, 0.02, 0.04);
  vesselGroup.add(aortaStem, ivcStem);

  // Renal arteries & veins
  const lRenalArt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.24, -0.02),
    new THREE.Vector3(0.46, 0.24, -0.02),
  ]);
  const rRenalArt = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.08, 0.14, -0.02),
    new THREE.Vector3(-0.46, 0.12, -0.02),
  ]);
  const lRenalVein = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0.2, 0.04),
    new THREE.Vector3(0.46, 0.2, 0.04),
  ]);
  const rRenalVein = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0.1, 0.04),
    new THREE.Vector3(-0.46, 0.08, 0.04),
  ]);
  vesselGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(lRenalArt, 12, 0.036, 12, false), aortaMat),
    new THREE.Mesh(new THREE.TubeGeometry(rRenalArt, 12, 0.036, 12, false), aortaMat),
    new THREE.Mesh(new THREE.TubeGeometry(lRenalVein, 12, 0.044, 12, false), ivcMat),
    new THREE.Mesh(new THREE.TubeGeometry(rRenalVein, 12, 0.044, 12, false), ivcMat),
  );
  registerPart(vesselGroup, 'renal_vessels', 'kidneys', new THREE.Vector3(0, 0, -0.35));
  group.add(vesselGroup);

  // Ureters
  const ureterGroup = new THREE.Group();
  const lUreter = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.44, 0.16, 0),
    new THREE.Vector3(0.32, -0.32, 0.02),
    new THREE.Vector3(0.24, -0.95, 0.06),
  ]);
  const rUreter = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.44, 0.02, 0),
    new THREE.Vector3(-0.32, -0.4, 0.02),
    new THREE.Vector3(-0.24, -0.95, 0.06),
  ]);
  ureterGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(lUreter, 20, 0.026, 10, false), ureterMat),
    new THREE.Mesh(new THREE.TubeGeometry(rUreter, 20, 0.026, 10, false), ureterMat),
  );
  registerPart(ureterGroup, 'ureters', 'kidneys', new THREE.Vector3(0, -0.38, 0.25));
  group.add(ureterGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 6. FULL TORSO ASSEMBLY (All Organs + Translucent Ribcage Reference)
// ---------------------------------------------------------------------------
export function buildTorsoAssembly(tex: ProceduralTextureSet): {
  root: THREE.Group;
  heart: THREE.Group;
  lungs: THREE.Group;
  digestive: THREE.Group;
  kidneys: THREE.Group;
} {
  const root = new THREE.Group();
  root.name = 'torso';

  // Subtle translucent thoracic ribcage reference (non-raycasted)
  const ribMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#94a3b8'),
    roughness: 0.45,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  });
  const ribFrame = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const y = 1.25 - i * 0.22;
    const rx = 1.12 + Math.sin((i / 7) * Math.PI) * 0.35;
    const rz = 0.72 + Math.sin((i / 7) * Math.PI) * 0.2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, y, -rz),
      new THREE.Vector3(rx, y - 0.06, 0),
      new THREE.Vector3(0.28, y - 0.14, rz),
    ]);
    const ribR = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.028, 8, false), ribMat);
    const ribL = ribR.clone();
    ribL.scale.x = -1;
    ribFrame.add(ribR, ribL);
  }
  // Sternum & Spine reference
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 16), ribMat);
  spine.position.set(0, -0.05, -0.82);
  ribFrame.add(spine);
  ribFrame.userData.isReferenceFrame = true;
  root.add(ribFrame);

  // Lungs
  const lungs = buildLungsGroup(tex);
  lungs.position.set(0, 0.65, 0);
  lungs.scale.setScalar(0.92);
  root.add(lungs);

  // Heart (tucked slightly left-anterior inside cardiac notch)
  const heart = buildHeartGroup(tex);
  heart.position.set(0.16, 0.56, 0.22);
  heart.scale.setScalar(0.52);
  root.add(heart);

  // Liver & Stomach
  const digestive = buildDigestiveGroup(tex);
  digestive.position.set(0, -0.48, 0.12);
  digestive.scale.setScalar(0.84);
  root.add(digestive);

  // Kidneys (retroperitoneal, posterior)
  const kidneys = buildKidneysGroup(tex);
  kidneys.position.set(0, -0.78, -0.35);
  kidneys.scale.setScalar(0.75);
  root.add(kidneys);

  return { root, heart, lungs, digestive, kidneys };
}
