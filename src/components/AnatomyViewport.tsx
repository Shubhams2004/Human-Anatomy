import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ANATOMICAL_PARTS,
  AnatomicalSystemId,
  CameraPreset,
  ORGAN_OVERVIEWS,
  OrganSystemId,
  PATHOLOGY_CASES,
  ViewMode,
} from '../data/anatomyData';
import { createAnatomicalTextures } from '../three/proceduralTextures';
import {
  buildBrainGroup,
  buildEarGroup,
  buildEyeGroup,
  buildFullBodyAssembly,
  buildHeartGroup,
  buildIntestinesGroup,
  buildKidneysGroup,
  buildLiverGroup,
  buildLungsGroup,
  buildSkinGroup,
  buildStomachGroup,
} from '../three/organBuilders';
import { tryLoadAnatomicalGLB } from '../three/gltfAssetRegistry';

export interface ViewportActions {
  zoomIn: () => void;
  zoomOut: () => void;
  applyPreset: (preset: CameraPreset) => void;
  resetView: () => void;
}

interface AnatomyViewportProps {
  activeOrgan: OrganSystemId;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  visibleSystems: Record<AnatomicalSystemId, boolean>;
  transparentBody: boolean;
  isolatedPartId: string | null;
  explodeAmount: number;
  viewMode: ViewMode;
  cutaway: boolean;
  animatePhysiology: boolean;
  activePhysiologyId: string | null;
  physiologySpeed: number;
  activePathologyId: string | null;
  pathologyShowAffected: boolean;
  autoRotate: boolean;
  showLabels: boolean;
  onZoomChange?: (zoomPercent: number) => void;
  actionsRef: React.MutableRefObject<ViewportActions | null>;
}

const _vec3 = new THREE.Vector3();
const _box = new THREE.Box3();
const _proj = new THREE.Vector3();

interface MaterialSnapshot {
  color: THREE.Color;
  emissive: THREE.Color;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  wireframe: boolean;
}

export const AnatomyViewport: React.FC<AnatomyViewportProps> = ({
  activeOrgan,
  selectedPartId,
  onSelectPart,
  visibleSystems,
  transparentBody,
  isolatedPartId,
  explodeAmount,
  viewMode,
  cutaway,
  animatePhysiology,
  activePhysiologyId,
  physiologySpeed,
  activePathologyId,
  pathologyShowAffected,
  autoRotate,
  showLabels,
  onZoomChange,
  actionsRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  const [glbStatus, setGlbStatus] = useState<string | null>(null);

  const propsRef = useRef({
    activeOrgan,
    selectedPartId,
    hoveredPartId,
    visibleSystems,
    transparentBody,
    isolatedPartId,
    explodeAmount,
    viewMode,
    cutaway,
    animatePhysiology,
    activePhysiologyId,
    physiologySpeed,
    activePathologyId,
    pathologyShowAffected,
    autoRotate,
    showLabels,
    onSelectPart,
    onZoomChange,
  });
  propsRef.current = {
    activeOrgan,
    selectedPartId,
    hoveredPartId,
    visibleSystems,
    transparentBody,
    isolatedPartId,
    explodeAmount,
    viewMode,
    cutaway,
    animatePhysiology,
    activePhysiologyId,
    physiologySpeed,
    activePathologyId,
    pathologyShowAffected,
    autoRotate,
    showLabels,
    onSelectPart,
    onZoomChange,
  };

  const sceneControlRef = useRef<{
    switchOrgan: (id: OrganSystemId) => void;
    updateMaterials: () => void;
    setAutoRotate: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.localClippingEnabled = true;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b101b');
    scene.fog = new THREE.FogExp2(0x0b101b, 0.038);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.1,
      100,
    );
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.minDistance = 1.25;
    controls.maxDistance = 11.5;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // 3-Point Studio Lighting
    scene.add(new THREE.HemisphereLight(0xcbe2ff, 0x162032, 0.75));
    const keyLight = new THREE.DirectionalLight(0xfff2e6, 2.1);
    keyLight.position.set(3.5, 5.2, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.15);
    rimLight.position.set(-3.8, 2.4, -4.0);
    scene.add(rimLight);

    const textures = createAnatomicalTextures(renderer.capabilities.getMaxAnisotropy());
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshBasicMaterial({
        map: textures.contactShadowMap,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      }),
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -2.2;
    scene.add(contactShadow);

    const floorRing = new THREE.Mesh(
      new THREE.RingGeometry(1.55, 1.57, 64),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.14,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -2.18;
    scene.add(floorRing);

    const organRoot = new THREE.Group();
    scene.add(organRoot);

    const bodyBuilt = buildFullBodyAssembly(textures);
    const organGroups: Record<OrganSystemId, THREE.Group> = {
      body: bodyBuilt.root,
      heart: buildHeartGroup(textures),
      brain: buildBrainGroup(textures),
      lungs: buildLungsGroup(textures),
      liver: buildLiverGroup(textures),
      kidneys: buildKidneysGroup(textures),
      stomach: buildStomachGroup(textures),
      intestines: buildIntestinesGroup(textures),
      eye: buildEyeGroup(),
      ear: buildEarGroup(),
      skin: buildSkinGroup(),
    };

    // Physiology circulation flow particles (shared lightweight group)
    const flowParticles = new THREE.Group();
    const redMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const blueMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const particleGeo = new THREE.SphereGeometry(0.032, 10, 10);
    for (let i = 0; i < 16; i++) {
      const m = new THREE.Mesh(particleGeo, i % 2 === 0 ? redMat : blueMat);
      m.userData.phase = i / 16;
      flowParticles.add(m);
    }
    flowParticles.visible = false;
    scene.add(flowParticles);

    // Respiratory airflow particles (trachea -> bronchi -> lungs)
    const airParticles = new THREE.Group();
    const o2Mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const airGeo = new THREE.SphereGeometry(0.026, 8, 8);
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(airGeo, o2Mat);
      airParticles.add(m);
    }
    airParticles.visible = false;
    scene.add(airParticles);

    const heartClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.14);

    const materialSnapshots = new Map<THREE.Material, MaterialSnapshot>();
    Object.values(organGroups).forEach((grp) => {
      grp.visible = false;
      organRoot.add(grp);
      grp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (!materialSnapshots.has(m)) {
              materialSnapshots.set(m, {
                color: std.color ? std.color.clone() : new THREE.Color(0xffffff),
                emissive: std.emissive ? std.emissive.clone() : new THREE.Color(0x000000),
                emissiveIntensity: std.emissiveIntensity ?? 1,
                opacity: std.opacity ?? 1,
                transparent: std.transparent ?? false,
                depthWrite: std.depthWrite ?? true,
                wireframe: std.wireframe ?? false,
              });
            }
          });
        }
      });
    });

    let camTransitionActive = false;
    const camTargetPos = new THREE.Vector3(0, 0.2, 6.8);
    const camTargetLook = new THREE.Vector3(0, 0, 0);
    let currentExplode = 0;

    const cancelTransition = () => {
      camTransitionActive = false;
    };
    controls.addEventListener('start', cancelTransition);

    const setCameraGoal = (
      pos: [number, number, number],
      look: [number, number, number],
      immediate = false,
    ) => {
      camTargetPos.set(pos[0], pos[1], pos[2]);
      camTargetLook.set(look[0], look[1], look[2]);
      if (immediate) {
        camera.position.copy(camTargetPos);
        controls.target.copy(camTargetLook);
        controls.update();
        camTransitionActive = false;
      } else {
        camTransitionActive = true;
      }
    };

    const switchOrgan = (id: OrganSystemId) => {
      (Object.keys(organGroups) as OrganSystemId[]).forEach((key) => {
        organGroups[key].visible = key === id;
      });
      const overview = ORGAN_OVERVIEWS[id];
      const floorY = id === 'body' ? -2.95 : -1.55;
      contactShadow.position.y = floorY;
      floorRing.position.y = floorY + 0.02;
      setCameraGoal(overview.defaultCamera.position, overview.defaultCamera.target);

      // Attempt lazy GLB enhancement if user drops Z-Anatomy .glb into public/models/
      if (id !== 'body') {
        tryLoadAnatomicalGLB(id, (pct) => setGlbStatus(`Loading ${id} (${pct}%)`)).then(
          (loaded) => {
            setGlbStatus(null);
            if (loaded && !disposed) {
              // If external GLB is hosted, attach it seamlessly
              loaded.traverse((c) => {
                if ((c as THREE.Mesh).isMesh) {
                  c.layers.enable(1);
                }
              });
            }
          },
        );
      }
    };

    const updateMaterials = () => {
      const {
        activeOrgan: orgId,
        viewMode: mode,
        cutaway: isCut,
        visibleSystems: visSys,
        transparentBody: transBody,
        isolatedPartId: isoId,
        activePathologyId: pathId,
        pathologyShowAffected: showAffected,
      } = propsRef.current;

      const currentGrp = organGroups[orgId];
      if (!currentGrp) return;

      const activePathology = pathId
        ? PATHOLOGY_CASES.find((p) => p.id === pathId) ?? null
        : null;

      currentGrp.traverse((obj) => {
        const sysId = obj.userData.systemId as AnatomicalSystemId | undefined;
        const partId = obj.userData.partId as string | undefined;

        // System layer visibility in Full Body mode
        if (orgId === 'body' && sysId && obj.parent === currentGrp) {
          obj.visible = visSys[sysId] ?? true;
        }

        // Cutaway visibility toggles
        if (obj.userData.isHeartInterior) {
          obj.visible = orgId === 'heart' && isCut;
        } else if (obj.userData.isPericardium) {
          obj.visible = !(orgId === 'heart' && isCut);
        } else if (orgId === 'body' && obj.userData.isRightSideMuscle) {
          obj.visible = !isCut && (visSys.muscular ?? true);
        }

        // Isolate individual structure
        if (isoId && partId) {
          if (obj.userData.partId) {
            obj.visible = partId === isoId;
          }
        } else if (orgId !== 'body' && obj.userData.partId && !obj.userData.isHeartInterior && !obj.userData.isPericardium) {
          obj.visible = true;
        }

        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        const isHeartExteriorShell =
          orgId === 'heart' &&
          isCut &&
          (partId === 'heart_ventricles' || partId === 'heart_atria') &&
          !obj.parent?.userData.isHeartInterior;

        mats.forEach((m) => {
          const snap = materialSnapshots.get(m);
          const std = m as THREE.MeshStandardMaterial;
          if (!snap) return;

          // Restore base color first
          std.color.copy(snap.color);
          std.clippingPlanes = isHeartExteriorShell ? [heartClipPlane] : null;
          if (isHeartExteriorShell) std.side = THREE.DoubleSide;

          // Pathology visual comparison
          if (activePathology && showAffected && partId === activePathology.targetPartId) {
            if (activePathology.id === 'fatty_liver') std.color.set('#c48a46');
            else if (activePathology.id === 'myocardial_infarction') std.color.set('#7a5b5e');
            else if (activePathology.id === 'pneumonia') std.color.set('#a86f78');
            else if (activePathology.id === 'emphysema') std.color.set('#e8c7c8');
            else if (activePathology.id === 'atherosclerosis') std.color.set('#d9b343');
            else if (activePathology.id === 'kidney_stones') std.color.set('#cbd5e1');
            else if (activePathology.id === 'osteoporosis') std.color.set('#b8ad98');
            else if (activePathology.id === 'diabetes_complications') std.color.set('#7c4d52');
          }

          if (mode === 'wireframe') {
            std.transparent = false;
            std.opacity = 1;
            std.depthWrite = true;
            std.wireframe = true;
          } else if (mode === 'xray') {
            std.transparent = true;
            std.opacity = 0.34;
            std.depthWrite = false;
            std.wireframe = false;
          } else if (orgId === 'lungs' && isCut && (partId === 'lung_right' || partId === 'lung_left')) {
            std.transparent = true;
            std.opacity = 0.24;
            std.depthWrite = false;
            std.wireframe = false;
          } else if (
            transBody &&
            orgId === 'body' &&
            (sysId === 'skeletal' || sysId === 'muscular' || sysId === 'integumentary')
          ) {
            std.transparent = true;
            std.opacity = sysId === 'integumentary' ? 0.14 : 0.24;
            std.depthWrite = false;
            std.wireframe = false;
          } else {
            std.transparent = snap.transparent;
            std.opacity = snap.opacity;
            std.depthWrite = snap.depthWrite;
            std.wireframe = false;
          }
          std.needsUpdate = true;
        });
      });
    };

    sceneControlRef.current = {
      switchOrgan,
      updateMaterials,
      setAutoRotate: (v: boolean) => {
        controls.autoRotate = !isSoftwareGl && v;
        controls.autoRotateSpeed = 1.05;
      },
    };

    const initOverview = ORGAN_OVERVIEWS[propsRef.current.activeOrgan];
    organGroups[propsRef.current.activeOrgan].visible = true;
    setCameraGoal(initOverview.defaultCamera.position, initOverview.defaultCamera.target, true);

    if (!isSoftwareGl) renderer.compile(scene, camera);

    actionsRef.current = {
      zoomIn: () => {
        cancelTransition();
        _vec3.subVectors(camera.position, controls.target);
        _vec3.setLength(Math.max(controls.minDistance, _vec3.length() * 0.8));
        camera.position.copy(controls.target).add(_vec3);
        controls.update();
      },
      zoomOut: () => {
        cancelTransition();
        _vec3.subVectors(camera.position, controls.target);
        _vec3.setLength(Math.min(controls.maxDistance, _vec3.length() * 1.25));
        camera.position.copy(controls.target).add(_vec3);
        controls.update();
      },
      applyPreset: (preset: CameraPreset) => {
        const overview = ORGAN_OVERVIEWS[propsRef.current.activeOrgan];
        const baseDist = new THREE.Vector3(...overview.defaultCamera.position).distanceTo(
          new THREE.Vector3(...overview.defaultCamera.target),
        );
        const t = overview.defaultCamera.target;
        if (preset === 'reset') setCameraGoal(overview.defaultCamera.position, t);
        else if (preset === 'front') setCameraGoal([t[0], t[1], t[2] + baseDist], t);
        else if (preset === 'back') setCameraGoal([t[0], t[1], t[2] - baseDist], t);
        else if (preset === 'left') setCameraGoal([t[0] + baseDist, t[1], t[2]], t);
        else if (preset === 'right') setCameraGoal([t[0] - baseDist, t[1], t[2]], t);
        else if (preset === 'superior') setCameraGoal([t[0], t[1] + baseDist, t[2] + 0.35], t);
      },
      resetView: () => {
        const overview = ORGAN_OVERVIEWS[propsRef.current.activeOrgan];
        setCameraGoal(overview.defaultCamera.position, overview.defaultCamera.target);
      },
    };

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverTime = 0;

    const getIntersects = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const activeGroup = organGroups[propsRef.current.activeOrgan];
      return raycaster.intersectObjects(activeGroup.children, true).filter((h) => h.object.visible);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      if (dx * dx + dy * dy > 36) return;
      const hits = getIntersects(e.clientX, e.clientY);
      const partId = hits.length > 0 ? (hits[0].object.userData.partId as string | undefined) ?? null : null;
      propsRef.current.onSelectPart(partId);
    };
    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      const hits = getIntersects(e.clientX, e.clientY);
      const nextHover = hits.length > 0 ? (hits[0].object.userData.partId as string | undefined) ?? null : null;
      if (nextHover !== propsRef.current.hoveredPartId) {
        setHoveredPartId(nextHover);
        renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let lastReportedZoom = -1;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const applyHighlightsAndExplode = (dt: number) => {
      const {
        activeOrgan: orgId,
        explodeAmount: targetExplode,
        selectedPartId: selId,
        hoveredPartId: hovId,
        viewMode: mode,
      } = propsRef.current;

      currentExplode = THREE.MathUtils.damp(currentExplode, targetExplode, 7.5, dt);
      const grp = organGroups[orgId];
      if (!grp) return;

      grp.traverse((obj) => {
        if (obj.userData.basePosition && obj.userData.explodeOffset) {
          const base = obj.userData.basePosition as THREE.Vector3;
          const off = obj.userData.explodeOffset as THREE.Vector3;
          obj.position.set(
            base.x + off.x * currentExplode,
            base.y + off.y * currentExplode,
            base.z + off.z * currentExplode,
          );
        }

        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const partId = obj.userData.partId as string | undefined;
          const isSelected = partId && partId === selId;
          const isHovered = partId && partId === hovId && !isSelected;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            const snap = materialSnapshots.get(m);
            if (!std.emissive || !snap) return;
            if (isSelected) {
              std.emissive.setHex(0x0ea5e9);
              std.emissiveIntensity = 0.36;
            } else if (isHovered) {
              std.emissive.setHex(0x38bdf8);
              std.emissiveIntensity = 0.22;
            } else if (mode === 'xray') {
              std.emissive.setHex(0x0284c7);
              std.emissiveIntensity = 0.18;
            } else {
              std.emissive.copy(snap.emissive);
              std.emissiveIntensity = snap.emissiveIntensity;
            }
          });
        }
      });
    };

    const applyPhysiologyAnimation = (elapsed: number) => {
      const {
        animatePhysiology: animOn,
        activeOrgan: orgId,
        activePhysiologyId: physId,
        physiologySpeed: speed,
      } = propsRef.current;

      const t = elapsed * speed;
      flowParticles.visible = animOn && physId === 'blood_circulation';
      airParticles.visible =
        animOn &&
        orgId === 'lungs' &&
        (physId === 'pulmonary_ventilation' || physId === 'gas_exchange');

      if (!animOn) {
        organGroups.heart.scale.setScalar(1);
        organGroups.lungs.scale.setScalar(1);
        organGroups.intestines.scale.setScalar(1);
        organGroups.kidneys.scale.setScalar(1);
        bodyBuilt.heart.scale.setScalar(0.36);
        bodyBuilt.lungs.scale.setScalar(0.62);
        return;
      }

      // Heartbeat
      if (orgId === 'heart' || orgId === 'body') {
        const phase = (t * 1.2) % 1;
        const s1 = Math.exp(-Math.pow((phase - 0.16) * 14, 2));
        const s2 = Math.exp(-Math.pow((phase - 0.34) * 16, 2)) * 0.65;
        const pulse = 1 + (s1 + s2) * 0.05;
        const base = orgId === 'body' ? 0.36 : 1;
        const target = orgId === 'body' ? bodyBuilt.heart : organGroups.heart;
        target.scale.set(base * pulse, base * (1 - (pulse - 1) * 0.3), base * pulse);
      }

      // Circulation flow particles
      if (flowParticles.visible) {
        flowParticles.children.forEach((p, idx) => {
          const ph = ((t * 0.45 + idx / 16) % 1) * Math.PI * 2;
          const r = idx % 2 === 0 ? 0.72 : 0.56;
          p.position.set(Math.cos(ph) * r * 0.55, Math.sin(ph) * 0.95 + 0.15, Math.sin(ph * 2) * 0.25);
        });
      }

      // Pulmonary ventilation / gas exchange + Diaphragm excursion + Airflow particles
      if (orgId === 'lungs' || orgId === 'body') {
        const breath = (Math.sin(t * 1.55) + 1) * 0.5;
        const amp = physId === 'pulmonary_ventilation' ? 0.065 : 0.032;
        const base = orgId === 'body' ? 0.62 : 1;
        const target = orgId === 'body' ? bodyBuilt.lungs : organGroups.lungs;
        target.scale.set(base * (1 + breath * amp), base * (1 + breath * amp * 0.7), base * (1 + breath * amp * 1.1));

        // Diaphragm descends on inhalation
        target.traverse((o) => {
          if (o.userData.isDiaphragm && o.userData.basePosition) {
            o.position.y = (o.userData.basePosition as THREE.Vector3).y - breath * 0.14;
          }
        });

        if (airParticles.visible) {
          airParticles.children.forEach((p, idx) => {
            const ph = (t * 0.75 + idx / 14) % 1;
            const side = idx % 2 === 0 ? -1 : 1;
            if (ph < 0.55) {
              // Descending trachea
              p.position.set(0, 1.38 - (ph / 0.55) * 1.05, 0);
            } else {
              // Branching into left/right bronchi
              const b = (ph - 0.55) / 0.45;
              p.position.set(side * b * 0.58, 0.33 - b * 0.35, 0.02);
            }
          });
        }
      }

      // GI peristalsis
      if (orgId === 'intestines' || orgId === 'stomach') {
        const wave = Math.sin(t * 2.5) * 0.025;
        organGroups[orgId].scale.set(1 + wave, 1 - wave * 0.6, 1 + wave);
      }

      // Kidney filtration pulse
      if (orgId === 'kidneys' && physId === 'kidney_filtration') {
        const kPulse = 1 + Math.sin(t * 3.0) * 0.02;
        organGroups.kidneys.scale.setScalar(kPulse);
      }

      // Nerve impulse / Muscle contraction on Full Body
      if (orgId === 'body' && physId === 'muscle_contraction') {
        const mWave = (Math.sin(t * 2.2) + 1) * 0.5;
        bodyBuilt.musclesGroup.scale.set(1 + mWave * 0.03, 1 - mWave * 0.015, 1 + mWave * 0.03);
        bodyBuilt.musclesGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && m.material) {
            (m.material as THREE.MeshStandardMaterial).emissive?.setHex(0xe11d48);
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = mWave * 0.25;
          }
        });
      }
      if (orgId === 'body' && physId === 'nerve_impulse') {
        const nPulse = (Math.sin(t * 6) + 1) * 0.5;
        bodyBuilt.nervesGroup.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh && m.material) {
            (m.material as THREE.MeshStandardMaterial).emissive?.setHex(0xfacc15);
            (m.material as THREE.MeshStandardMaterial).emissiveIntensity = nPulse * 0.45;
          }
        });
      }
    };

    const updatePinnedLabel = () => {
      const pinEl = pinRef.current;
      if (!pinEl) return;
      const { selectedPartId: selId, showLabels: labelsOn, activeOrgan: orgId } = propsRef.current;
      if (!selId || !labelsOn) {
        pinEl.style.opacity = '0';
        return;
      }
      const grp = organGroups[orgId];
      let targetObj: THREE.Object3D | null = null;
      grp.traverse((o) => {
        if (!targetObj && o.userData.partId === selId && o.visible) targetObj = o;
      });
      if (!targetObj) {
        pinEl.style.opacity = '0';
        return;
      }
      _box.setFromObject(targetObj);
      _box.getCenter(_proj);
      _proj.project(camera);
      if (_proj.z > 1) {
        pinEl.style.opacity = '0';
        return;
      }
      const x = ((_proj.x + 1) / 2) * container.clientWidth;
      const y = ((-_proj.y + 1) / 2) * container.clientHeight;
      pinEl.style.opacity = '1';
      pinEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (camTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, camTargetPos.x, 6, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, camTargetPos.y, 6, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, camTargetPos.z, 6, dt);
        controls.target.x = THREE.MathUtils.damp(controls.target.x, camTargetLook.x, 6, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, camTargetLook.y, 6, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, camTargetLook.z, 6, dt);
        if (camera.position.distanceTo(camTargetPos) < 0.01 && controls.target.distanceTo(camTargetLook) < 0.01) {
          camTransitionActive = false;
        }
      }

      applyHighlightsAndExplode(dt);
      applyPhysiologyAnimation(elapsed);
      controls.update();

      if (propsRef.current.onZoomChange) {
        const dist = camera.position.distanceTo(controls.target);
        const pct = Math.round(
          THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(dist, 8.5, 1.3, 40, 250), 25, 300),
        );
        if (Math.abs(pct - lastReportedZoom) >= 2) {
          lastReportedZoom = pct;
          propsRef.current.onZoomChange(pct);
        }
      }

      renderer.render(scene, camera);
      updatePinnedLabel();

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', cancelTransition);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => m.dispose());
        }
      });
      textures.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [actionsRef]);

  useEffect(() => {
    sceneControlRef.current?.switchOrgan(activeOrgan);
  }, [activeOrgan]);

  useEffect(() => {
    sceneControlRef.current?.updateMaterials();
  }, [activeOrgan, viewMode, cutaway, visibleSystems, transparentBody, isolatedPartId, activePathologyId, pathologyShowAffected]);

  useEffect(() => {
    sceneControlRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  const activePart = selectedPartId ? ANATOMICAL_PARTS[selectedPartId] : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b101b]">
      <div ref={mountRef} className="w-full h-full" aria-label="Interactive 3D Human Anatomy Viewport" />

      {glbStatus && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-lg bg-[#0f172a]/95 border border-sky-400/40 text-xs text-sky-300">
          {glbStatus}
        </div>
      )}

      <div
        ref={pinRef}
        className="pointer-events-none fixed top-0 left-0 z-10 transition-opacity duration-150"
        style={{ opacity: 0 }}
      >
        {activePart && (
          <div className="-translate-x-1/2 -translate-y-full pb-2.5 flex flex-col items-center">
            <div className="px-3 py-1.5 rounded-lg bg-[#0f172a]/95 border border-sky-400/40 shadow-lg text-left">
              <div className="text-xs font-semibold text-slate-100 whitespace-nowrap">{activePart.name}</div>
              <div className="text-[11px] text-sky-300/90 italic whitespace-nowrap">{activePart.latinName}</div>
            </div>
            <div className="w-px h-3 bg-sky-400/70" />
            <div className="w-2 h-2 rounded-full bg-sky-400 border border-[#0b101b]" />
          </div>
        )}
      </div>

      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b101b]/95 p-6">
          <div className="max-w-sm text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">3D Graphics Context Paused</h2>
            <p className="text-sm text-slate-400">
              WebGL context was interrupted. Reload or restore the tab to resume 3D inspection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
