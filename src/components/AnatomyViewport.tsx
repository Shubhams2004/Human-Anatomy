import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ANATOMICAL_PARTS,
  CameraPreset,
  ORGAN_OVERVIEWS,
  OrganSystemId,
  ViewMode,
} from '../data/anatomyData';
import { createAnatomicalTextures } from '../three/proceduralTextures';
import {
  buildBrainGroup,
  buildDigestiveGroup,
  buildHeartGroup,
  buildKidneysGroup,
  buildLungsGroup,
  buildTorsoAssembly,
} from '../three/organBuilders';

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
  explodeAmount: number;
  viewMode: ViewMode;
  animatePhysiology: boolean;
  autoRotate: boolean;
  showLabels: boolean;
  onZoomChange?: (zoomPercent: number) => void;
  actionsRef: React.MutableRefObject<ViewportActions | null>;
}

// Pre-allocated math helpers (zero GC in render loop)
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
  roughness: number;
}

export const AnatomyViewport: React.FC<AnatomyViewportProps> = ({
  activeOrgan,
  selectedPartId,
  onSelectPart,
  explodeAmount,
  viewMode,
  animatePhysiology,
  autoRotate,
  showLabels,
  onZoomChange,
  actionsRef,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  // Mutable refs for latest props inside animation loop without re-creating scene
  const propsRef = useRef({
    activeOrgan,
    selectedPartId,
    hoveredPartId,
    explodeAmount,
    viewMode,
    animatePhysiology,
    autoRotate,
    showLabels,
    onSelectPart,
    onZoomChange,
  });
  propsRef.current = {
    activeOrgan,
    selectedPartId,
    hoveredPartId,
    explodeAmount,
    viewMode,
    animatePhysiology,
    autoRotate,
    showLabels,
    onSelectPart,
    onZoomChange,
  };

  // Internal scene refs for organ switching
  const sceneControlRef = useRef<{
    switchOrgan: (id: OrganSystemId) => void;
    updateViewMode: (mode: ViewMode) => void;
    setAutoRotate: (v: boolean) => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection (GPU renderer string, never user-agent)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer Setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    // WebGL context loss/restore handlers
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener(
      'webglcontextrestored',
      handleContextRestored,
    );

    // 3. Scene, Environment & Horizon Fog
    const scene = new THREE.Scene();
    const bgColor = new THREE.Color('#0b101b');
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2(0x0b101b, 0.042);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    // 4. Camera & OrbitControls (with Pinch-to-Zoom & Rotational Inspection)
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
    controls.rotateSpeed = 0.85;
    controls.zoomSpeed = 1.05;
    controls.panSpeed = 0.75;
    controls.minDistance = 1.35;
    controls.maxDistance = 10.5;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    // 5. 3-Point Studio Lighting Rig (Warm Key + Cool Hemisphere + Rim Backlight)
    const hemiLight = new THREE.HemisphereLight(0xcbe2ff, 0x162032, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff2e6, 2.1);
    keyLight.position.set(3.5, 5.2, 4.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    const d = 3.2;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.15);
    rimLight.position.set(-3.8, 2.4, -4.0);
    scene.add(rimLight);

    // 6. Procedural Textures & Contact Shadow Grounding
    const textures = createAnatomicalTextures(
      renderer.capabilities.getMaxAnisotropy(),
    );

    const shadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: textures.contactShadowMap,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -2.05;
    scene.add(contactShadow);

    // Subtle studio floor grid ring for spatial orientation
    const ringGeo = new THREE.RingGeometry(1.55, 1.57, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const floorRing = new THREE.Mesh(ringGeo, ringMat);
    floorRing.rotation.x = -Math.PI / 2;
    floorRing.position.y = -2.03;
    scene.add(floorRing);

    // 7. Build All Anatomical Groups & Snapshot Original Materials
    const organRoot = new THREE.Group();
    scene.add(organRoot);

    const torsoBuilt = buildTorsoAssembly(textures);
    const organGroups: Record<OrganSystemId, THREE.Group> = {
      torso: torsoBuilt.root,
      heart: buildHeartGroup(textures),
      brain: buildBrainGroup(textures),
      lungs: buildLungsGroup(textures),
      digestive: buildDigestiveGroup(textures),
      kidneys: buildKidneysGroup(textures),
    };

    const materialSnapshots = new Map<THREE.Material, MaterialSnapshot>();
    Object.values(organGroups).forEach((grp) => {
      grp.visible = false;
      organRoot.add(grp);
      grp.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          mats.forEach((m) => {
            const std = m as THREE.MeshStandardMaterial;
            if (!materialSnapshots.has(m)) {
              materialSnapshots.set(m, {
                color: std.color ? std.color.clone() : new THREE.Color(0xffffff),
                emissive: std.emissive
                  ? std.emissive.clone()
                  : new THREE.Color(0x000000),
                emissiveIntensity: std.emissiveIntensity ?? 1,
                opacity: std.opacity ?? 1,
                transparent: std.transparent ?? false,
                depthWrite: std.depthWrite ?? true,
                wireframe: std.wireframe ?? false,
                roughness: std.roughness ?? 0.5,
              });
            }
          });
        }
      });
    });

    // Camera transition state
    let camTransitionActive = false;
    const camTargetPos = new THREE.Vector3(0, 0.3, 6.2);
    const camTargetLook = new THREE.Vector3(0, 0.05, 0);
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
      contactShadow.position.y = id === 'torso' ? -2.05 : -1.55;
      floorRing.position.y = id === 'torso' ? -2.03 : -1.53;
      setCameraGoal(
        overview.defaultCamera.position,
        overview.defaultCamera.target,
      );
    };

    const updateViewMode = (mode: ViewMode) => {
      const currentGrp = organGroups[propsRef.current.activeOrgan];
      if (!currentGrp) return;

      currentGrp.traverse((obj) => {
        if (obj.userData.isReferenceFrame) return;
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh || !mesh.material) return;
        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];
        mats.forEach((m) => {
          const snap = materialSnapshots.get(m);
          const std = m as THREE.MeshStandardMaterial;
          if (!snap) return;

          if (mode === 'anatomical') {
            std.transparent = snap.transparent;
            std.opacity = snap.opacity;
            std.depthWrite = snap.depthWrite;
            std.wireframe = false;
          } else if (mode === 'xray') {
            std.transparent = true;
            std.opacity = 0.34;
            std.depthWrite = false;
            std.wireframe = false;
          } else if (mode === 'wireframe') {
            std.transparent = false;
            std.opacity = 1;
            std.depthWrite = true;
            std.wireframe = true;
          }
          std.needsUpdate = true;
        });
      });
    };

    sceneControlRef.current = {
      switchOrgan,
      updateViewMode,
      setAutoRotate: (v: boolean) => {
        controls.autoRotate = !isSoftwareGl && v;
        controls.autoRotateSpeed = 1.1;
      },
    };

    // Initialize default organ
    const initOverview = ORGAN_OVERVIEWS[propsRef.current.activeOrgan];
    organGroups[propsRef.current.activeOrgan].visible = true;
    setCameraGoal(
      initOverview.defaultCamera.position,
      initOverview.defaultCamera.target,
      true,
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Expose imperative actions (zoom buttons, camera presets)
    actionsRef.current = {
      zoomIn: () => {
        cancelTransition();
        _vec3.subVectors(camera.position, controls.target);
        const dist = _vec3.length();
        const nextDist = Math.max(controls.minDistance, dist * 0.8);
        _vec3.setLength(nextDist);
        camera.position.copy(controls.target).add(_vec3);
        controls.update();
      },
      zoomOut: () => {
        cancelTransition();
        _vec3.subVectors(camera.position, controls.target);
        const dist = _vec3.length();
        const nextDist = Math.min(controls.maxDistance, dist * 1.25);
        _vec3.setLength(nextDist);
        camera.position.copy(controls.target).add(_vec3);
        controls.update();
      },
      applyPreset: (preset: CameraPreset) => {
        const overview = ORGAN_OVERVIEWS[propsRef.current.activeOrgan];
        const baseDist = new THREE.Vector3(
          ...overview.defaultCamera.position,
        ).distanceTo(new THREE.Vector3(...overview.defaultCamera.target));
        const t = overview.defaultCamera.target;
        if (preset === 'reset') {
          setCameraGoal(
            overview.defaultCamera.position,
            overview.defaultCamera.target,
          );
        } else if (preset === 'front') {
          setCameraGoal([t[0], t[1], t[2] + baseDist], t);
        } else if (preset === 'left') {
          setCameraGoal([t[0] + baseDist, t[1], t[2]], t);
        } else if (preset === 'right') {
          setCameraGoal([t[0] - baseDist, t[1], t[2]], t);
        } else if (preset === 'superior') {
          setCameraGoal([t[0], t[1] + baseDist, t[2] + 0.35], t);
        }
      },
      resetView: () => {
        const overview = ORGAN_OVERVIEWS[propsRef.current.activeOrgan];
        setCameraGoal(
          overview.defaultCamera.position,
          overview.defaultCamera.target,
        );
      },
    };

    // 8. Raycasting (Layer 1 only, throttled hover, click-to-select)
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
      return raycaster.intersectObjects(activeGroup.children, true);
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dx = e.clientX - pointerDownPos.x;
      const dy = e.clientY - pointerDownPos.y;
      // Only treat as click if pointer didn't drag (orbiting/pinching)
      if (dx * dx + dy * dy > 36) return;

      const hits = getIntersects(e.clientX, e.clientY);
      if (hits.length > 0) {
        const partId = hits[0].object.userData.partId as string | undefined;
        if (partId) {
          propsRef.current.onSelectPart(partId);
        }
      } else {
        propsRef.current.onSelectPart(null);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;

      const hits = getIntersects(e.clientX, e.clientY);
      const nextHover =
        hits.length > 0
          ? ((hits[0].object.userData.partId as string | undefined) ?? null)
          : null;
      if (nextHover !== propsRef.current.hoveredPartId) {
        setHoveredPartId(nextHover);
        renderer.domElement.style.cursor = nextHover ? 'pointer' : 'grab';
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    // 9. Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 10. Animation Loop (Software-WebGL paced via afterDraw)
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

      currentExplode = THREE.MathUtils.damp(
        currentExplode,
        targetExplode,
        7.5,
        dt,
      );

      const grp = organGroups[orgId];
      if (!grp) return;

      grp.traverse((obj) => {
        // Exploded-view layer separation
        if (obj.userData.basePosition && obj.userData.explodeOffset) {
          const base = obj.userData.basePosition as THREE.Vector3;
          const off = obj.userData.explodeOffset as THREE.Vector3;
          obj.position.set(
            base.x + off.x * currentExplode,
            base.y + off.y * currentExplode,
            base.z + off.z * currentExplode,
          );
        }

        // Hover & Selection emissive highlight
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.material && !obj.userData.isReferenceFrame) {
          const partId = obj.userData.partId as string | undefined;
          const isSelected = partId && partId === selId;
          const isHovered = partId && partId === hovId && !isSelected;

          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
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
      const { animatePhysiology: animOn, activeOrgan: orgId } =
        propsRef.current;

      // Reset scales smoothly when paused
      const heartTargets = [organGroups.heart, torsoBuilt.heart];
      const lungTargets = [organGroups.lungs, torsoBuilt.lungs];

      if (!animOn) {
        heartTargets.forEach((h) => h.scale.setScalar(h === torsoBuilt.heart ? 0.52 : 1));
        lungTargets.forEach((l) => l.scale.setScalar(l === torsoBuilt.lungs ? 0.92 : 1));
        return;
      }

      // Cardiac "lub-dub" double-beat cycle (~72 bpm => 0.83s period)
      if (orgId === 'heart' || orgId === 'torso') {
        const phase = (elapsed * 1.2) % 1;
        const systole1 = Math.exp(-Math.pow((phase - 0.16) * 14, 2));
        const systole2 = Math.exp(-Math.pow((phase - 0.34) * 16, 2)) * 0.65;
        const pulse = 1 + (systole1 + systole2) * 0.045;
        const baseScale = orgId === 'torso' ? 0.52 : 1;
        const target = orgId === 'torso' ? torsoBuilt.heart : organGroups.heart;
        target.scale.set(
          baseScale * pulse,
          baseScale * (1 - (pulse - 1) * 0.35),
          baseScale * pulse,
        );
      }

      // Respiratory tidal breathing (~15 breaths/min => 4.0s period)
      if (orgId === 'lungs' || orgId === 'torso') {
        const breath = (Math.sin(elapsed * 1.55) + 1) * 0.5;
        const baseScale = orgId === 'torso' ? 0.92 : 1;
        const target = orgId === 'torso' ? torsoBuilt.lungs : organGroups.lungs;
        target.scale.set(
          baseScale * (1 + breath * 0.032),
          baseScale * (1 + breath * 0.022),
          baseScale * (1 + breath * 0.038),
        );
      }
    };

    const updatePinnedLabel = () => {
      const pinEl = pinRef.current;
      if (!pinEl) return;
      const { selectedPartId: selId, showLabels: labelsOn, activeOrgan: orgId } =
        propsRef.current;

      if (!selId || !labelsOn) {
        pinEl.style.opacity = '0';
        return;
      }

      const grp = organGroups[orgId];
      let targetObj: THREE.Object3D | null = null;
      grp.traverse((o) => {
        if (!targetObj && o.userData.partId === selId) {
          targetObj = o;
        }
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

      const w = container.clientWidth;
      const h = container.clientHeight;
      const x = ((_proj.x + 1) / 2) * w;
      const y = ((-_proj.y + 1) / 2) * h;

      pinEl.style.opacity = '1';
      pinEl.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    };

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      if (camTransitionActive) {
        camera.position.x = THREE.MathUtils.damp(
          camera.position.x,
          camTargetPos.x,
          6,
          dt,
        );
        camera.position.y = THREE.MathUtils.damp(
          camera.position.y,
          camTargetPos.y,
          6,
          dt,
        );
        camera.position.z = THREE.MathUtils.damp(
          camera.position.z,
          camTargetPos.z,
          6,
          dt,
        );
        controls.target.x = THREE.MathUtils.damp(
          controls.target.x,
          camTargetLook.x,
          6,
          dt,
        );
        controls.target.y = THREE.MathUtils.damp(
          controls.target.y,
          camTargetLook.y,
          6,
          dt,
        );
        controls.target.z = THREE.MathUtils.damp(
          controls.target.z,
          camTargetLook.z,
          6,
          dt,
        );
        if (
          camera.position.distanceTo(camTargetPos) < 0.01 &&
          controls.target.distanceTo(camTargetLook) < 0.01
        ) {
          camTransitionActive = false;
        }
      }

      applyHighlightsAndExplode(dt);
      applyPhysiologyAnimation(elapsed);
      controls.update();

      // Report zoom percentage for HUD readout
      if (propsRef.current.onZoomChange) {
        const dist = camera.position.distanceTo(controls.target);
        const pct = Math.round(
          THREE.MathUtils.clamp(
            THREE.MathUtils.mapLinear(dist, 8.0, 1.4, 40, 250),
            25,
            300,
          ),
        );
        if (Math.abs(pct - lastReportedZoom) >= 2) {
          lastReportedZoom = pct;
          propsRef.current.onZoomChange(pct);
        }
      }

      renderer.render(scene, camera);
      updatePinnedLabel();

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
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
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost,
      );
      renderer.domElement.removeEventListener(
        'webglcontextrestored',
        handleContextRestored,
      );
      controls.dispose();

      // Dispose all geometries & materials
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
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

  // React to organ switch
  useEffect(() => {
    sceneControlRef.current?.switchOrgan(activeOrgan);
    sceneControlRef.current?.updateViewMode(viewMode);
  }, [activeOrgan, viewMode]);

  // React to auto-rotate toggle
  useEffect(() => {
    sceneControlRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  const activePart = selectedPartId ? ANATOMICAL_PARTS[selectedPartId] : null;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0b101b]">
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="Interactive 3D Human Anatomy Viewport"
      />

      {/* 3D Projected Anatomical Callout Pin */}
      <div
        ref={pinRef}
        className="pointer-events-none fixed top-0 left-0 z-10 transition-opacity duration-150"
        style={{ opacity: 0 }}
      >
        {activePart && (
          <div className="-translate-x-1/2 -translate-y-full pb-2.5 flex flex-col items-center">
            <div className="px-3 py-1.5 rounded-lg bg-[#0f172a]/95 border border-sky-400/40 shadow-lg text-left">
              <div className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                {activePart.name}
              </div>
              <div className="text-[11px] text-sky-300/90 italic whitespace-nowrap">
                {activePart.latinName}
              </div>
            </div>
            <div className="w-px h-3 bg-sky-400/70" />
            <div className="w-2 h-2 rounded-full bg-sky-400 border border-[#0b101b]" />
          </div>
        )}
      </div>

      {/* Graceful WebGL Context Loss Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0b101b]/95 p-6">
          <div className="max-w-sm text-center space-y-2">
            <h2 className="text-lg font-semibold text-slate-100">
              3D Graphics Context Paused
            </h2>
            <p className="text-sm text-slate-400">
              The WebGL context was interrupted by your browser. Reload or
              restore the tab to resume 3D anatomical inspection.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
