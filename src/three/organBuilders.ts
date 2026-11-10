import * as THREE from 'three';
import { ProceduralTextureSet } from './proceduralTextures';
import { AnatomicalSystemId, OrganSystemId } from '../data/anatomyData';

function registerPart(
  obj: THREE.Object3D,
  partId: string,
  organId: Exclude<OrganSystemId, 'body'>,
  explodeOffset: THREE.Vector3,
  systemId?: AnatomicalSystemId,
) {
  obj.userData.partId = partId;
  obj.userData.organId = organId;
  if (systemId) obj.userData.systemId = systemId;
  obj.userData.basePosition = obj.position.clone();
  obj.userData.explodeOffset = explodeOffset;
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.layers.enable(1);
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.partId = partId;
      child.userData.organId = organId;
      if (systemId) child.userData.systemId = systemId;
    }
  });
}

function tagSystem(obj: THREE.Object3D, systemId: AnatomicalSystemId) {
  obj.userData.systemId = systemId;
  obj.traverse((child) => {
    child.userData.systemId = systemId;
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
// 1. HEART
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
    clearcoat: 0.55,
    clearcoatRoughness: 0.25,
  });
  const atriaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9c2839'),
    map: tex.myocardiumMap,
    roughness: 0.5,
    clearcoat: 0.4,
  });
  const aortaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#d14348'),
    roughness: 0.38,
    clearcoat: 0.45,
  });
  const pulmonaryMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#5a6ea8'),
    roughness: 0.44,
    clearcoat: 0.35,
  });
  const venaCavaMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#445b96'),
    roughness: 0.48,
    clearcoat: 0.3,
  });
  const coronaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#e03b43'),
    roughness: 0.32,
  });

  const ventGeo = sculptGeometry(new THREE.SphereGeometry(0.68, 48, 40), (v) => {
    const ny = v.y / 0.68;
    const taper = ny < 0 ? 1 - Math.pow(-ny, 1.35) * 0.58 : 1 - ny * 0.14;
    v.x *= taper * 0.96;
    v.z *= taper * 0.84;
    v.y *= 1.24;
    if (ny < 0) {
      v.x += Math.pow(-ny, 1.4) * 0.28;
      v.z += Math.pow(-ny, 1.5) * 0.12;
    }
    const groove = Math.exp(-Math.pow(v.x - 0.08, 2) * 18) * (v.z > 0 ? 0.04 : 0.02);
    v.z -= Math.sign(v.z) * groove;
  });
  const ventricles = new THREE.Mesh(ventGeo, muscleMat);
  ventricles.position.set(0.05, -0.18, 0);
  registerPart(ventricles, 'heart_ventricles', 'heart', new THREE.Vector3(0, -0.45, 0.25), 'cardiovascular');
  group.add(ventricles);

  const atriaGroup = new THREE.Group();
  const rightAtrium = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.35, 32, 24), (v) => {
      v.y *= 1.08;
      v.x *= 0.92;
    }),
    atriaMat,
  );
  rightAtrium.position.set(-0.34, 0.42, 0.02);
  const leftAtrium = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.33, 32, 24), (v) => {
      v.x *= 1.05;
      v.z *= 0.88;
    }),
    atriaMat,
  );
  leftAtrium.position.set(0.28, 0.44, -0.14);
  atriaGroup.add(rightAtrium, leftAtrium);
  registerPart(atriaGroup, 'heart_atria', 'heart', new THREE.Vector3(0, 0.35, -0.25), 'cardiovascular');
  group.add(atriaGroup);

  const aortaGroup = new THREE.Group();
  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.02, 0.28, 0.04),
    new THREE.Vector3(0.0, 0.78, 0.06),
    new THREE.Vector3(0.18, 1.04, -0.04),
    new THREE.Vector3(0.32, 0.86, -0.24),
    new THREE.Vector3(0.24, 0.12, -0.34),
    new THREE.Vector3(0.18, -0.78, -0.32),
  ]);
  aortaGroup.add(new THREE.Mesh(new THREE.TubeGeometry(aortaCurve, 48, 0.145, 20, false), aortaMat));
  const branches: [THREE.Vector3, THREE.Vector3, number][] = [
    [new THREE.Vector3(-0.02, 0.96, 0.03), new THREE.Vector3(-0.14, 1.32, 0.04), 0.055],
    [new THREE.Vector3(0.11, 1.05, -0.02), new THREE.Vector3(0.1, 1.38, -0.02), 0.045],
    [new THREE.Vector3(0.23, 1.0, -0.1), new THREE.Vector3(0.32, 1.34, -0.12), 0.045],
  ];
  branches.forEach(([start, end, r]) => {
    const mid = start.clone().lerp(end, 0.5).add(new THREE.Vector3(0, 0.04, 0));
    aortaGroup.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3([start, mid, end]), 16, r, 12, false),
        aortaMat,
      ),
    );
  });
  registerPart(aortaGroup, 'heart_aorta', 'heart', new THREE.Vector3(0.15, 0.65, 0.15), 'cardiovascular');
  group.add(aortaGroup);

  const pulmGroup = new THREE.Group();
  pulmGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.12, 0.25, 0.24),
          new THREE.Vector3(-0.04, 0.62, 0.22),
          new THREE.Vector3(0.08, 0.76, 0.06),
        ]),
        24,
        0.12,
        16,
        false,
      ),
      pulmonaryMat,
    ),
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.06, 0.74, 0.06),
          new THREE.Vector3(0.38, 0.76, -0.02),
          new THREE.Vector3(0.62, 0.7, -0.08),
        ]),
        18,
        0.085,
        14,
        false,
      ),
      pulmonaryMat,
    ),
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.06, 0.74, 0.06),
          new THREE.Vector3(-0.28, 0.72, -0.06),
          new THREE.Vector3(-0.58, 0.66, -0.12),
        ]),
        18,
        0.085,
        14,
        false,
      ),
      pulmonaryMat,
    ),
  );
  registerPart(pulmGroup, 'heart_pulmonary', 'heart', new THREE.Vector3(-0.15, 0.45, 0.45), 'cardiovascular');
  group.add(pulmGroup);

  const vcGroup = new THREE.Group();
  vcGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.38, 0.48, -0.02),
          new THREE.Vector3(-0.4, 0.92, -0.04),
          new THREE.Vector3(-0.42, 1.28, -0.04),
        ]),
        20,
        0.11,
        16,
        false,
      ),
      venaCavaMat,
    ),
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.36, 0.25, -0.12),
          new THREE.Vector3(-0.36, -0.35, -0.16),
          new THREE.Vector3(-0.36, -0.82, -0.18),
        ]),
        20,
        0.12,
        16,
        false,
      ),
      venaCavaMat,
    ),
  );
  registerPart(vcGroup, 'heart_vena_cava', 'heart', new THREE.Vector3(-0.55, 0.1, -0.15), 'cardiovascular');
  group.add(vcGroup);

  const corGroup = new THREE.Group();
  corGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0.02, 0.25, 0.48),
          new THREE.Vector3(0.12, -0.05, 0.56),
          new THREE.Vector3(0.22, -0.45, 0.46),
          new THREE.Vector3(0.28, -0.82, 0.26),
        ]),
        24,
        0.024,
        10,
        false,
      ),
      coronaryMat,
    ),
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-0.12, 0.26, 0.42),
          new THREE.Vector3(-0.38, 0.08, 0.36),
          new THREE.Vector3(-0.44, -0.24, 0.12),
          new THREE.Vector3(-0.22, -0.58, -0.12),
        ]),
        24,
        0.022,
        10,
        false,
      ),
      coronaryMat,
    ),
  );
  registerPart(corGroup, 'heart_coronary', 'heart', new THREE.Vector3(0.05, -0.15, 0.6), 'cardiovascular');
  group.add(corGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 2. BRAIN (Exploded Lobes + Corpus Callosum + Thalamus + Cerebellum + Stem)
// ---------------------------------------------------------------------------
export function buildBrainGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'brain';

  const makeLobeMat = (hex: string) =>
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(hex),
      map: tex.brainMap,
      bumpMap: tex.brainBump,
      bumpScale: 0.045,
      roughness: 0.5,
      clearcoat: 0.28,
    });

  // Frontal Lobes (paired)
  const frontalGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const geo = sculptGeometry(new THREE.SphereGeometry(0.45, 36, 28), (v) => {
      v.z *= 1.15;
      v.x *= 0.72;
      v.y *= 0.92;
      if (side === 1 && v.x < 0) v.x *= 0.15;
      if (side === -1 && v.x > 0) v.x *= 0.15;
    });
    const m = new THREE.Mesh(geo, makeLobeMat('#e4a698'));
    m.position.set(side * 0.24, 0.32, 0.44);
    frontalGroup.add(m);
  });
  registerPart(frontalGroup, 'brain_frontal', 'brain', new THREE.Vector3(0, 0.25, 0.55), 'nervous');
  group.add(frontalGroup);

  // Parietal Lobes
  const parietalGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const geo = sculptGeometry(new THREE.SphereGeometry(0.43, 36, 28), (v) => {
      v.z *= 1.05;
      v.x *= 0.74;
      v.y *= 0.88;
      if (side === 1 && v.x < 0) v.x *= 0.15;
      if (side === -1 && v.x > 0) v.x *= 0.15;
    });
    const m = new THREE.Mesh(geo, makeLobeMat('#c8b4dc'));
    m.position.set(side * 0.24, 0.44, -0.18);
    parietalGroup.add(m);
  });
  registerPart(parietalGroup, 'brain_parietal', 'brain', new THREE.Vector3(0, 0.55, -0.12), 'nervous');
  group.add(parietalGroup);

  // Temporal Lobes
  const temporalGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const geo = sculptGeometry(new THREE.SphereGeometry(0.32, 32, 24), (v) => {
      v.z *= 1.45;
      v.x *= 0.65;
      v.y *= 0.72;
    });
    const m = new THREE.Mesh(geo, makeLobeMat('#c4cfa2'));
    m.position.set(side * 0.46, 0.04, 0.05);
    temporalGroup.add(m);
  });
  registerPart(temporalGroup, 'brain_temporal', 'brain', new THREE.Vector3(0, -0.05, 0.2), 'nervous');
  group.add(temporalGroup);

  // Occipital Lobes
  const occGroup = new THREE.Group();
  [-1, 1].forEach((side) => {
    const geo = sculptGeometry(new THREE.SphereGeometry(0.35, 32, 24), (v) => {
      v.z *= 0.92;
      v.x *= 0.72;
      v.y *= 0.84;
      if (side === 1 && v.x < 0) v.x *= 0.18;
      if (side === -1 && v.x > 0) v.x *= 0.18;
    });
    const m = new THREE.Mesh(geo, makeLobeMat('#d6a8cc'));
    m.position.set(side * 0.2, 0.18, -0.64);
    occGroup.add(m);
  });
  registerPart(occGroup, 'brain_occipital', 'brain', new THREE.Vector3(0, 0.15, -0.65), 'nervous');
  group.add(occGroup);

  // Corpus Callosum
  const ccGeo = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.12, 0.34),
      new THREE.Vector3(0, 0.28, 0.16),
      new THREE.Vector3(0, 0.3, -0.08),
      new THREE.Vector3(0, 0.2, -0.3),
    ]),
    28,
    0.085,
    14,
    false,
  );
  ccGeo.scale(1.5, 0.75, 1);
  const ccMesh = new THREE.Mesh(
    ccGeo,
    new THREE.MeshPhysicalMaterial({ color: 0xede3d8, roughness: 0.42, clearcoat: 0.3 }),
  );
  registerPart(ccMesh, 'brain_corpus_callosum', 'brain', new THREE.Vector3(0, 0.0, 0), 'nervous');
  group.add(ccMesh);

  // Thalamus & Hypothalamus
  const thalGroup = new THREE.Group();
  const thalMat = new THREE.MeshPhysicalMaterial({ color: 0xd98f76, roughness: 0.45 });
  [-1, 1].forEach((side) => {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), thalMat);
    t.scale.set(0.85, 0.9, 1.3);
    t.position.set(side * 0.1, 0.08, -0.02);
    thalGroup.add(t);
  });
  const hypo = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 16, 14),
    new THREE.MeshPhysicalMaterial({ color: 0xe6b85c, roughness: 0.4 }),
  );
  hypo.position.set(0, -0.05, 0.12);
  thalGroup.add(hypo);
  registerPart(thalGroup, 'brain_thalamus', 'brain', new THREE.Vector3(0, -0.22, 0.12), 'nervous');
  group.add(thalGroup);

  // Cerebellum
  const cerebGroup = new THREE.Group();
  const cerebMat = new THREE.MeshPhysicalMaterial({
    color: 0xc88a7e,
    map: tex.brainMap,
    bumpMap: tex.cerebellumBump,
    bumpScale: 0.035,
    roughness: 0.6,
  });
  [-1, 1].forEach((side) => {
    const lobe = new THREE.Mesh(
      sculptGeometry(new THREE.SphereGeometry(0.3, 32, 24), (v) => {
        v.x *= 0.92;
        v.y *= 0.74;
        v.z *= 0.88;
      }),
      cerebMat,
    );
    lobe.position.set(side * 0.23, -0.34, -0.44);
    cerebGroup.add(lobe);
  });
  registerPart(cerebGroup, 'brain_cerebellum', 'brain', new THREE.Vector3(0, -0.45, -0.45), 'nervous');
  group.add(cerebGroup);

  // Brainstem
  const stemGroup = new THREE.Group();
  const stemMat = new THREE.MeshPhysicalMaterial({ color: 0xe0cfc2, roughness: 0.48 });
  stemGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0.04, -0.04),
          new THREE.Vector3(0, -0.24, -0.1),
          new THREE.Vector3(0, -0.62, -0.18),
          new THREE.Vector3(0, -0.92, -0.22),
        ]),
        24,
        0.12,
        16,
        false,
      ),
      stemMat,
    ),
  );
  const pons = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), stemMat);
  pons.position.set(0, -0.22, -0.06);
  stemGroup.add(pons);
  registerPart(stemGroup, 'brain_brainstem', 'brain', new THREE.Vector3(0, -0.65, 0.05), 'nervous');
  group.add(stemGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 3. LUNGS & TRACHEA
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
    sheen: 0.35,
    sheenColor: new THREE.Color('#f7c6c8'),
  });
  const cartilageMat = new THREE.MeshPhysicalMaterial({ color: 0xdce5ee, roughness: 0.38 });
  const bronchiMat = new THREE.MeshStandardMaterial({ color: 0xc7b8be, roughness: 0.55 });
  const diaphragmMat = new THREE.MeshPhysicalMaterial({ color: 0xa64246, roughness: 0.52, side: THREE.DoubleSide });

  const tracheaGroup = new THREE.Group();
  const tracheaTube = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.11, 1.15, 24), bronchiMat);
  tracheaTube.position.set(0, 0.85, 0);
  tracheaGroup.add(tracheaTube);
  const ringInst = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.112, 0.017, 10, 24, Math.PI * 1.65),
    cartilageMat,
    14,
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 14; i++) {
    dummy.position.set(0, 0.36 + i * 0.072, 0);
    dummy.rotation.set(Math.PI / 2, 0, -Math.PI * 0.32);
    dummy.updateMatrix();
    ringInst.setMatrixAt(i, dummy.matrix);
  }
  ringInst.instanceMatrix.needsUpdate = true;
  ringInst.computeBoundingSphere();
  tracheaGroup.add(ringInst);
  registerPart(tracheaGroup, 'lung_trachea', 'lungs', new THREE.Vector3(0, 0.55, 0), 'respiratory');
  group.add(tracheaGroup);

  const bronchiGroup = new THREE.Group();
  bronchiGroup.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(-0.24, 0.16, 0), new THREE.Vector3(-0.52, 0, 0.02)]),
        18,
        0.075,
        14,
        false,
      ),
      bronchiMat,
    ),
    new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.28, 0.14, 0), new THREE.Vector3(0.56, -0.02, 0.02)]),
        18,
        0.07,
        14,
        false,
      ),
      bronchiMat,
    ),
  );
  registerPart(bronchiGroup, 'lung_bronchi', 'lungs', new THREE.Vector3(0, 0.25, -0.25), 'respiratory');
  group.add(bronchiGroup);

  const rightLung = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.68, 44, 36), (v) => {
      const ny = v.y / 0.68;
      v.y *= 1.48;
      v.z *= 0.88;
      v.x *= (ny > 0 ? 1 - ny * 0.45 : 1 + -ny * 0.16) * 0.82;
      if (v.x > 0.05) v.x *= 0.38;
      if (v.y < -0.75) v.y += Math.exp(-(v.x * v.x + v.z * v.z) * 3) * 0.18;
    }),
    lungMat,
  );
  rightLung.position.set(-0.58, -0.08, 0);
  registerPart(rightLung, 'lung_right', 'lungs', new THREE.Vector3(-0.55, 0, 0.1), 'respiratory');
  group.add(rightLung);

  const leftLung = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.66, 44, 36), (v) => {
      const ny = v.y / 0.66;
      v.y *= 1.48;
      v.z *= 0.88;
      v.x *= (ny > 0 ? 1 - ny * 0.45 : 1 + -ny * 0.14) * 0.78;
      if (v.x < -0.05) v.x *= 0.36;
      if (v.x < 0 && v.y < 0.1 && v.y > -0.75 && v.z > -0.1) {
        v.x += 0.16 * Math.exp(-Math.pow(v.y + 0.3, 2) * 6);
      }
      if (v.y < -0.75) v.y += Math.exp(-(v.x * v.x + v.z * v.z) * 3) * 0.18;
    }),
    lungMat,
  );
  leftLung.position.set(0.58, -0.08, 0);
  registerPart(leftLung, 'lung_left', 'lungs', new THREE.Vector3(0.55, 0, 0.1), 'respiratory');
  group.add(leftLung);

  const diaphragm = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(1.15, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), (v) => {
      v.y *= 0.45;
      v.z *= 0.66;
      if (v.x < 0) v.y += 0.06;
    }),
    diaphragmMat,
  );
  diaphragm.position.set(0, -1.06, 0);
  registerPart(diaphragm, 'lung_diaphragm', 'lungs', new THREE.Vector3(0, -0.55, 0), 'muscular');
  group.add(diaphragm);

  return group;
}

// ---------------------------------------------------------------------------
// 4. LIVER
// ---------------------------------------------------------------------------
export function buildLiverGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'liver';

  const liverMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#862c24'),
    map: tex.liverMap,
    roughness: 0.34,
    clearcoat: 0.6,
  });
  const gbMat = new THREE.MeshPhysicalMaterial({ color: 0x3b7a4c, roughness: 0.38, clearcoat: 0.55 });

  const liverRight = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.68, 40, 32), (v) => {
      v.x *= 1.18;
      v.y *= 0.85;
      v.z *= 0.82;
      if (v.y < 0) v.z *= 0.72;
      if (v.x > 0.2) v.y *= 0.78;
    }),
    liverMat,
  );
  liverRight.position.set(-0.36, 0.12, 0);
  registerPart(liverRight, 'liver_right_lobe', 'liver', new THREE.Vector3(-0.4, 0.2, 0.15), 'digestive');
  group.add(liverRight);

  const liverLeft = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.45, 32, 24), (v) => {
      v.x *= 1.35;
      v.y *= 0.62;
      v.z *= 0.68;
      if (v.x > 0) {
        v.y *= 1 - (v.x / 0.65) * 0.45;
        v.z *= 1 - (v.x / 0.65) * 0.35;
      }
    }),
    liverMat,
  );
  liverLeft.position.set(0.26, 0.18, 0.08);
  registerPart(liverLeft, 'liver_left_lobe', 'liver', new THREE.Vector3(0.35, 0.25, 0.15), 'digestive');
  group.add(liverLeft);

  const gallbladder = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.16, 24, 18), (v) => {
      v.y *= 1.75;
      if (v.y > 0) {
        v.x *= 0.55;
        v.z *= 0.55;
      }
    }),
    gbMat,
  );
  gallbladder.position.set(-0.22, -0.3, 0.18);
  gallbladder.rotation.z = -0.35;
  registerPart(gallbladder, 'gallbladder', 'liver', new THREE.Vector3(-0.2, -0.45, 0.35), 'digestive');
  group.add(gallbladder);

  return group;
}

// ---------------------------------------------------------------------------
// 5. STOMACH
// ---------------------------------------------------------------------------
export function buildStomachGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stomach';

  const stomachMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#cc7268'),
    map: tex.stomachMap,
    roughness: 0.46,
    clearcoat: 0.35,
  });

  const esophagus = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.08, 1.05, -0.06),
        new THREE.Vector3(-0.04, 0.62, -0.04),
        new THREE.Vector3(0.02, 0.26, 0),
      ]),
      20,
      0.085,
      14,
      false,
    ),
    stomachMat,
  );
  registerPart(esophagus, 'stomach_esophagus', 'stomach', new THREE.Vector3(0, 0.45, -0.15), 'digestive');
  group.add(esophagus);

  const stomach = new THREE.Mesh(
    sculptGeometry(new THREE.SphereGeometry(0.52, 40, 32), (v) => {
      v.y *= 1.32;
      v.x *= 0.92;
      v.z *= 0.72;
      if (v.y < 0) {
        v.x -= Math.pow(-v.y / 0.65, 1.6) * 0.48;
        v.x *= 0.85;
      }
    }),
    stomachMat,
  );
  stomach.position.set(0.24, -0.12, 0);
  stomach.rotation.z = 0.25;
  registerPart(stomach, 'stomach_body', 'stomach', new THREE.Vector3(0.25, -0.1, 0.25), 'digestive');
  group.add(stomach);

  const duodenum = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.15, -0.48, 0.02),
        new THREE.Vector3(-0.42, -0.55, -0.04),
        new THREE.Vector3(-0.46, -0.82, -0.06),
        new THREE.Vector3(-0.15, -0.92, -0.04),
        new THREE.Vector3(0.15, -0.86, 0),
      ]),
      28,
      0.1,
      16,
      false,
    ),
    stomachMat,
  );
  registerPart(duodenum, 'duodenum', 'stomach', new THREE.Vector3(-0.25, -0.45, 0.1), 'digestive');
  group.add(duodenum);

  return group;
}

// ---------------------------------------------------------------------------
// 6. INTESTINES (Small Intestine + Haustrated Colon + Appendix)
// ---------------------------------------------------------------------------
export function buildIntestinesGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'intestines';

  const smallMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#dfa082'),
    map: tex.stomachMap,
    roughness: 0.46,
    clearcoat: 0.35,
  });
  const colonMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#b66a5e'),
    map: tex.stomachMap,
    roughness: 0.52,
    clearcoat: 0.28,
  });

  // Coiled Small Intestine
  const smallPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 48; i++) {
    const t = i / 48;
    const y = 0.42 - t * 0.92;
    const x = Math.sin(t * Math.PI * 9.5) * 0.44 * (1 - Math.abs(t - 0.5) * 0.25);
    const z = Math.cos(t * Math.PI * 11) * 0.18;
    smallPts.push(new THREE.Vector3(x, y, z));
  }
  const smallIntestine = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(smallPts), 140, 0.095, 14, false),
    smallMat,
  );
  registerPart(smallIntestine, 'intestine_small', 'intestines', new THREE.Vector3(0, 0, 0.45), 'digestive');
  group.add(smallIntestine);

  // Large Intestine (Ascending -> Transverse -> Descending -> Sigmoid)
  const colonCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.62, -0.58, 0.05),
    new THREE.Vector3(-0.66, 0.05, 0.02),
    new THREE.Vector3(-0.62, 0.62, 0.06),
    new THREE.Vector3(0.0, 0.54, 0.16),
    new THREE.Vector3(0.62, 0.65, 0.06),
    new THREE.Vector3(0.65, 0.0, 0.02),
    new THREE.Vector3(0.6, -0.56, 0.04),
    new THREE.Vector3(0.22, -0.78, -0.04),
    new THREE.Vector3(0.02, -1.04, -0.1),
  ]);
  const colon = new THREE.Mesh(new THREE.TubeGeometry(colonCurve, 80, 0.145, 16, false), colonMat);
  registerPart(colon, 'intestine_colon', 'intestines', new THREE.Vector3(0, 0.15, -0.35), 'digestive');
  group.add(colon);

  // Appendix
  const appendix = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.62, -0.62, 0.05),
        new THREE.Vector3(-0.58, -0.8, 0.12),
        new THREE.Vector3(-0.46, -0.88, 0.08),
      ]),
      14,
      0.035,
      10,
      false,
    ),
    colonMat,
  );
  registerPart(appendix, 'intestine_appendix', 'intestines', new THREE.Vector3(-0.35, -0.35, 0.25), 'digestive');
  group.add(appendix);

  return group;
}

// ---------------------------------------------------------------------------
// 7. KIDNEYS
// ---------------------------------------------------------------------------
export function buildKidneysGroup(tex: ProceduralTextureSet): THREE.Group {
  const group = new THREE.Group();
  group.name = 'kidneys';

  const kidneyMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#963834'),
    map: tex.kidneyMap,
    roughness: 0.38,
    clearcoat: 0.55,
  });
  const adrenalMat = new THREE.MeshPhysicalMaterial({ color: 0xd8a84e, roughness: 0.52 });
  const aortaMat = new THREE.MeshPhysicalMaterial({ color: 0xc8353c, roughness: 0.4, clearcoat: 0.4 });
  const ivcMat = new THREE.MeshPhysicalMaterial({ color: 0x425a96, roughness: 0.45, clearcoat: 0.35 });
  const ureterMat = new THREE.MeshStandardMaterial({ color: 0xd8b698, roughness: 0.5 });

  const makeBean = (side: -1 | 1) =>
    new THREE.Mesh(
      sculptGeometry(new THREE.SphereGeometry(0.36, 36, 28), (v) => {
        v.y *= 1.48;
        v.x *= 0.86;
        v.z *= 0.62;
        const hilum = Math.exp(-v.y * v.y * 6);
        if (side === 1 && v.x < 0) v.x += hilum * 0.14;
        if (side === -1 && v.x > 0) v.x -= hilum * 0.14;
      }),
      kidneyMat,
    );

  const leftKidney = makeBean(1);
  leftKidney.position.set(0.58, 0.24, 0);
  leftKidney.rotation.z = -0.1;
  registerPart(leftKidney, 'kidney_left', 'kidneys', new THREE.Vector3(0.45, 0.1, 0), 'urinary');
  group.add(leftKidney);

  const rightKidney = makeBean(-1);
  rightKidney.position.set(-0.58, 0.1, 0);
  rightKidney.rotation.z = 0.1;
  registerPart(rightKidney, 'kidney_right', 'kidneys', new THREE.Vector3(-0.45, 0.1, 0), 'urinary');
  group.add(rightKidney);

  const adrGroup = new THREE.Group();
  const adrL = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 18), adrenalMat);
  adrL.position.set(0.5, 0.78, 0.02);
  const adrR = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.18, 18), adrenalMat);
  adrR.position.set(-0.5, 0.64, 0.02);
  adrGroup.add(adrL, adrR);
  registerPart(adrGroup, 'adrenal_glands', 'kidneys', new THREE.Vector3(0, 0.45, 0), 'endocrine');
  group.add(adrGroup);

  const vGroup = new THREE.Group();
  const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.09, 1.75, 20), aortaMat);
  aorta.position.set(0.08, 0.02, -0.02);
  const ivc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.105, 1.75, 20), ivcMat);
  ivc.position.set(-0.12, 0.02, 0.04);
  vGroup.add(
    aorta,
    ivc,
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.08, 0.24, -0.02), new THREE.Vector3(0.46, 0.24, -0.02)]), 12, 0.036, 12, false), aortaMat),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.08, 0.14, -0.02), new THREE.Vector3(-0.46, 0.12, -0.02)]), 12, 0.036, 12, false), aortaMat),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, 0.2, 0.04), new THREE.Vector3(0.46, 0.2, 0.04)]), 12, 0.044, 12, false), ivcMat),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.12, 0.1, 0.04), new THREE.Vector3(-0.46, 0.08, 0.04)]), 12, 0.044, 12, false), ivcMat),
  );
  registerPart(vGroup, 'renal_vessels', 'kidneys', new THREE.Vector3(0, 0, -0.35), 'cardiovascular');
  group.add(vGroup);

  const uGroup = new THREE.Group();
  uGroup.add(
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.44, 0.16, 0), new THREE.Vector3(0.32, -0.32, 0.02), new THREE.Vector3(0.24, -0.95, 0.06)]), 20, 0.026, 10, false), ureterMat),
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.44, 0.02, 0), new THREE.Vector3(-0.32, -0.4, 0.02), new THREE.Vector3(-0.24, -0.95, 0.06)]), 20, 0.026, 10, false), ureterMat),
  );
  registerPart(uGroup, 'ureters', 'kidneys', new THREE.Vector3(0, -0.38, 0.25), 'urinary');
  group.add(uGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 8. HUMAN EYE
// ---------------------------------------------------------------------------
export function buildEyeGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'eye';

  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 40, 32, 0, Math.PI * 2, 0.35, Math.PI - 0.35),
    new THREE.MeshPhysicalMaterial({ color: 0xf4f0ea, roughness: 0.28, clearcoat: 0.7, side: THREE.DoubleSide }),
  );
  sclera.rotation.x = Math.PI / 2;
  registerPart(sclera, 'eye_sclera', 'eye', new THREE.Vector3(0, 0, -0.25), 'nervous');
  group.add(sclera);

  const frontGroup = new THREE.Group();
  const iris = new THREE.Mesh(
    new THREE.RingGeometry(0.14, 0.38, 36),
    new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.45, side: THREE.DoubleSide }),
  );
  iris.position.z = 0.78;
  const pupil = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 24),
    new THREE.MeshBasicMaterial({ color: 0x05070d }),
  );
  pupil.position.z = 0.79;
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.35,
      roughness: 0.05,
      clearcoat: 1,
      depthWrite: false,
    }),
  );
  cornea.rotation.x = Math.PI / 2;
  cornea.position.z = 0.56;
  frontGroup.add(iris, pupil, cornea);
  registerPart(frontGroup, 'eye_cornea_iris', 'eye', new THREE.Vector3(0, 0, 0.65), 'nervous');
  group.add(frontGroup);

  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 28, 20),
    new THREE.MeshPhysicalMaterial({ color: 0xdbeafe, transparent: true, opacity: 0.65, roughness: 0.1, clearcoat: 0.9 }),
  );
  lens.scale.set(1, 1, 0.55);
  lens.position.set(0, 0, 0.55);
  registerPart(lens, 'eye_lens', 'eye', new THREE.Vector3(0, 0, 0.32), 'nervous');
  group.add(lens);

  const retina = new THREE.Mesh(
    new THREE.SphereGeometry(0.77, 36, 28, 0, Math.PI * 2, 0.7, Math.PI - 0.7),
    new THREE.MeshPhysicalMaterial({ color: 0xd96b43, roughness: 0.45, side: THREE.BackSide }),
  );
  retina.rotation.x = Math.PI / 2;
  registerPart(retina, 'eye_retina', 'eye', new THREE.Vector3(0, 0, -0.45), 'nervous');
  group.add(retina);

  const opticNerve = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(-0.15, -0.05, -0.78), new THREE.Vector3(-0.22, -0.08, -1.45)]),
      16,
      0.13,
      16,
      false,
    ),
    new THREE.MeshPhysicalMaterial({ color: 0xe8d5b7, roughness: 0.48 }),
  );
  registerPart(opticNerve, 'eye_optic_nerve', 'eye', new THREE.Vector3(-0.25, 0, -0.75), 'nervous');
  group.add(opticNerve);

  return group;
}

// ---------------------------------------------------------------------------
// 9. HUMAN EAR
// ---------------------------------------------------------------------------
export function buildEarGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ear';

  const skinMat = new THREE.MeshPhysicalMaterial({ color: 0xdba98c, roughness: 0.55 });
  const boneMat = new THREE.MeshPhysicalMaterial({ color: 0xeae2d3, roughness: 0.4 });
  const innerMat = new THREE.MeshPhysicalMaterial({ color: 0x93c5fd, roughness: 0.35, clearcoat: 0.5 });

  // Pinna + Auditory Canal
  const outerGroup = new THREE.Group();
  const pinna = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.14, 16, 32, Math.PI * 1.45), skinMat);
  pinna.position.set(-0.95, 0.08, 0);
  pinna.rotation.z = Math.PI * 0.32;
  pinna.scale.set(0.65, 1.15, 0.6);
  const canal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.9, 20), skinMat);
  canal.rotation.z = Math.PI / 2;
  canal.position.set(-0.48, 0, 0);
  outerGroup.add(pinna, canal);
  registerPart(outerGroup, 'ear_pinna_canal', 'ear', new THREE.Vector3(-0.55, 0, 0), 'nervous');
  group.add(outerGroup);

  // Tympanic Membrane + Ossicles
  const midGroup = new THREE.Group();
  const eardrum = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 24),
    new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
  );
  eardrum.rotation.y = Math.PI / 2;
  eardrum.position.set(-0.02, 0, 0);
  const malleus = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.22, 10), boneMat);
  malleus.position.set(0.06, 0.05, 0);
  malleus.rotation.z = -0.35;
  const incus = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), boneMat);
  incus.position.set(0.16, 0.08, 0);
  const stapes = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.015, 8, 16), boneMat);
  stapes.position.set(0.26, 0.02, 0);
  midGroup.add(eardrum, malleus, incus, stapes);
  registerPart(midGroup, 'ear_tympanic_ossicles', 'ear', new THREE.Vector3(0, 0.35, 0.25), 'nervous');
  group.add(midGroup);

  // Spiral Cochlea (2.5 turns)
  const cochPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 70; i++) {
    const t = i / 70;
    const angle = t * Math.PI * 5;
    const r = 0.32 * (1 - t * 0.72);
    cochPts.push(new THREE.Vector3(0.55 + Math.cos(angle) * r, -0.15 + t * 0.24, Math.sin(angle) * r));
  }
  const cochlea = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cochPts), 80, 0.045, 12, false),
    innerMat,
  );
  registerPart(cochlea, 'ear_cochlea', 'ear', new THREE.Vector3(0.45, -0.25, 0.25), 'nervous');
  group.add(cochlea);

  // 3 Orthogonal Semicircular Canals
  const semiGroup = new THREE.Group();
  const c1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.032, 12, 28, Math.PI * 1.4), innerMat);
  c1.position.set(0.45, 0.32, -0.12);
  const c2 = c1.clone();
  c2.rotation.y = Math.PI / 2;
  const c3 = c1.clone();
  c3.rotation.x = Math.PI / 2;
  semiGroup.add(c1, c2, c3);
  registerPart(semiGroup, 'ear_semicircular', 'ear', new THREE.Vector3(0.45, 0.45, -0.25), 'nervous');
  group.add(semiGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 10. SKIN CROSS-SECTION
// ---------------------------------------------------------------------------
export function buildSkinGroup(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'skin';

  const epi = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.24, 1.5),
    new THREE.MeshPhysicalMaterial({ color: 0xe2ae8c, roughness: 0.55 }),
  );
  epi.position.set(0, 0.65, 0);
  registerPart(epi, 'skin_epidermis', 'skin', new THREE.Vector3(0, 0.55, 0), 'integumentary');
  group.add(epi);

  const dermis = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.65, 1.5),
    new THREE.MeshPhysicalMaterial({ color: 0xd47874, roughness: 0.48, clearcoat: 0.2 }),
  );
  dermis.position.set(0, 0.2, 0);
  registerPart(dermis, 'skin_dermis', 'skin', new THREE.Vector3(0, 0.1, 0), 'integumentary');
  group.add(dermis);

  const hypo = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.55, 1.5),
    new THREE.MeshPhysicalMaterial({ color: 0xeac458, roughness: 0.42, clearcoat: 0.35 }),
  );
  hypo.position.set(0, -0.4, 0);
  registerPart(hypo, 'skin_hypodermis', 'skin', new THREE.Vector3(0, -0.45, 0), 'integumentary');
  group.add(hypo);

  const appGroup = new THREE.Group();
  const hair = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.06, 1.45, 14),
    new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.6 }),
  );
  hair.position.set(-0.35, 0.45, 0.25);
  hair.rotation.z = -0.14;
  const sweat = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.11, 0.025, 48, 8, 2, 3),
    new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.35 }),
  );
  sweat.position.set(0.45, -0.05, 0.25);
  appGroup.add(hair, sweat);
  registerPart(appGroup, 'skin_follicle_gland', 'skin', new THREE.Vector3(0, 0.35, 0.45), 'integumentary');
  group.add(appGroup);

  return group;
}

// ---------------------------------------------------------------------------
// 11. FULL HUMAN BODY (All 10 Anatomical Systems)
// ---------------------------------------------------------------------------
export function buildFullBodyAssembly(tex: ProceduralTextureSet): {
  root: THREE.Group;
  heart: THREE.Group;
  lungs: THREE.Group;
  digestiveGroup: THREE.Group;
  kidneys: THREE.Group;
  nervesGroup: THREE.Group;
  musclesGroup: THREE.Group;
} {
  const root = new THREE.Group();
  root.name = 'body';

  // 1. SKELETAL SYSTEM
  const skelGroup = new THREE.Group();
  const boneMat = new THREE.MeshPhysicalMaterial({ color: 0xe4dccb, roughness: 0.48 });

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 24), boneMat);
  cranium.scale.set(0.86, 1.05, 0.96);
  cranium.position.set(0, 2.55, 0);
  registerPart(cranium, 'skeletal_cranium', 'brain', new THREE.Vector3(0, 0.6, 0), 'skeletal');
  skelGroup.add(cranium);

  const thoraxGroup = new THREE.Group();
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.0, 14), boneMat);
  spine.position.set(0, 0.4, -0.45);
  thoraxGroup.add(spine);
  for (let i = 0; i < 9; i++) {
    const y = 1.45 - i * 0.16;
    const rx = 0.72 + Math.sin((i / 8) * Math.PI) * 0.25;
    const rz = 0.48 + Math.sin((i / 8) * Math.PI) * 0.12;
    const ribR = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(0, y, -rz), new THREE.Vector3(rx, y - 0.05, 0), new THREE.Vector3(0.18, y - 0.1, rz)]),
        20,
        0.025,
        8,
        false,
      ),
      boneMat,
    );
    const ribL = ribR.clone();
    ribL.scale.x = -1;
    thoraxGroup.add(ribR, ribL);
  }
  const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.12, 12, 28, Math.PI * 1.25), boneMat);
  pelvis.rotation.set(Math.PI / 2, 0, -Math.PI * 0.12);
  pelvis.position.set(0, -1.12, -0.05);
  thoraxGroup.add(pelvis);
  // Femurs & Humeri
  [-1, 1].forEach((side) => {
    const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 1.3, 12), boneMat);
    humerus.position.set(side * 1.15, 0.85, -0.05);
    humerus.rotation.z = side * 0.08;
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 1.7, 12), boneMat);
    femur.position.set(side * 0.42, -2.05, 0);
    thoraxGroup.add(humerus, femur);
  });
  registerPart(thoraxGroup, 'skeletal_thorax', 'lungs', new THREE.Vector3(0, 0, -0.45), 'skeletal');
  skelGroup.add(thoraxGroup);
  tagSystem(skelGroup, 'skeletal');
  root.add(skelGroup);

  // 2. MUSCULAR SYSTEM
  const musclesGroup = new THREE.Group();
  const muscMat = new THREE.MeshPhysicalMaterial({ color: 0xb04141, roughness: 0.52, clearcoat: 0.15 });
  [-1, 1].forEach((side) => {
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 18), muscMat);
    pec.scale.set(1.05, 0.68, 0.45);
    pec.position.set(side * 0.36, 1.25, 0.44);
    const delt = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), muscMat);
    delt.scale.set(0.85, 1.25, 0.85);
    delt.position.set(side * 1.12, 1.38, 0.02);
    const quad = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 1.5, 16), muscMat);
    quad.position.set(side * 0.44, -2.0, 0.06);
    musclesGroup.add(pec, delt, quad);
  });
  registerPart(musclesGroup, 'muscular_pectoral', 'heart', new THREE.Vector3(0, 0, 0.55), 'muscular');
  tagSystem(musclesGroup, 'muscular');
  root.add(musclesGroup);

  // 3. NERVOUS SYSTEM
  const nervesGroup = new THREE.Group();
  const nerveMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.4 });
  const brain = buildBrainGroup(tex);
  brain.position.set(0, 2.55, 0);
  brain.scale.setScalar(0.36);
  nervesGroup.add(brain);
  const spinalCord = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 2.8, 12), nerveMat);
  spinalCord.position.set(0, 0.4, -0.4);
  nervesGroup.add(spinalCord);
  [-1, 1].forEach((side) => {
    const sciatic = new THREE.Mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([new THREE.Vector3(side * 0.12, -1.0, -0.25), new THREE.Vector3(side * 0.4, -1.8, -0.1), new THREE.Vector3(side * 0.42, -2.7, -0.08)]),
        20,
        0.022,
        8,
        false,
      ),
      nerveMat,
    );
    nervesGroup.add(sciatic);
  });
  tagSystem(nervesGroup, 'nervous');
  root.add(nervesGroup);

  // 4. CARDIOVASCULAR SYSTEM
  const heart = buildHeartGroup(tex);
  heart.position.set(0.12, 1.02, 0.14);
  heart.scale.setScalar(0.36);
  tagSystem(heart, 'cardiovascular');
  root.add(heart);

  // 5. RESPIRATORY SYSTEM
  const lungs = buildLungsGroup(tex);
  lungs.position.set(0, 1.08, 0);
  lungs.scale.setScalar(0.62);
  tagSystem(lungs, 'respiratory');
  root.add(lungs);

  // 6. DIGESTIVE SYSTEM
  const digestiveGroup = new THREE.Group();
  const liver = buildLiverGroup(tex);
  liver.position.set(0.0, 0.28, 0.15);
  liver.scale.setScalar(0.62);
  const stomach = buildStomachGroup(tex);
  stomach.position.set(0.2, 0.16, 0.08);
  stomach.scale.setScalar(0.55);
  const intestines = buildIntestinesGroup(tex);
  intestines.position.set(0, -0.5, 0.12);
  intestines.scale.setScalar(0.68);
  digestiveGroup.add(liver, stomach, intestines);
  tagSystem(digestiveGroup, 'digestive');
  root.add(digestiveGroup);

  // 7. URINARY SYSTEM
  const kidneys = buildKidneysGroup(tex);
  kidneys.position.set(0, -0.1, -0.22);
  kidneys.scale.setScalar(0.55);
  tagSystem(kidneys, 'urinary');
  root.add(kidneys);

  // 8. REPRODUCTIVE SYSTEM (Pelvic Gonads)
  const reproGroup = new THREE.Group();
  const reproMat = new THREE.MeshPhysicalMaterial({ color: 0xec4899, roughness: 0.45 });
  const pelvicOrgan = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), reproMat);
  pelvicOrgan.scale.set(0.9, 1.15, 0.7);
  pelvicOrgan.position.set(0, -1.18, 0.08);
  reproGroup.add(pelvicOrgan);
  tagSystem(reproGroup, 'reproductive');
  root.add(reproGroup);

  // 9. ENDOCRINE SYSTEM (Thyroid + Pancreas)
  const endoGroup = new THREE.Group();
  const endoMat = new THREE.MeshPhysicalMaterial({ color: 0x14b8a6, roughness: 0.45 });
  const thyroid = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.04, 12, 24, Math.PI * 1.2), endoMat);
  thyroid.position.set(0, 1.72, 0.12);
  thyroid.rotation.x = Math.PI / 2;
  registerPart(thyroid, 'endocrine_thyroid', 'lungs', new THREE.Vector3(0, 0.25, 0.35), 'endocrine');
  endoGroup.add(thyroid);
  tagSystem(endoGroup, 'endocrine');
  root.add(endoGroup);

  // 10. INTEGUMENTARY SYSTEM (Translucent Body Silhouette Envelope)
  const integGroup = new THREE.Group();
  const skinEnvMat = new THREE.MeshPhysicalMaterial({
    color: 0xdba98c,
    roughness: 0.5,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  const torsoShell = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.74, 2.8, 28), skinEnvMat);
  torsoShell.scale.set(1.12, 1, 0.68);
  torsoShell.position.set(0, 0.35, 0);
  const headShell = new THREE.Mesh(new THREE.SphereGeometry(0.46, 24, 20), skinEnvMat);
  headShell.scale.set(0.88, 1.08, 0.98);
  headShell.position.set(0, 2.55, 0);
  integGroup.add(torsoShell, headShell);
  integGroup.userData.isIntegumentaryShell = true;
  tagSystem(integGroup, 'integumentary');
  root.add(integGroup);

  return { root, heart, lungs, digestiveGroup, kidneys, nervesGroup, musclesGroup };
}
