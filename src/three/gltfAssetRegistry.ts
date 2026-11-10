import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export interface AnatomicalAssetEntry {
  id: string;
  source: 'Z-Anatomy' | 'Procedural-Anatomical';
  license: 'CC BY-SA 4.0' | 'Apache-2.0';
  attribution: string;
  glbPath: string;
}

/**
 * Registry of Z-Anatomy (CC BY-SA 4.0) compatible GLB integration points.
 * Place optimized Draco-compressed .glb files in `public/models/<id>.glb`
 * and the loader will progressively stream them on demand.
 */
export const ANATOMICAL_GLB_REGISTRY: Record<string, AnatomicalAssetEntry> = {
  heart: {
    id: 'heart',
    source: 'Z-Anatomy',
    license: 'CC BY-SA 4.0',
    attribution: 'Z-Anatomy Open Source Atlas (CC BY-SA 4.0)',
    glbPath: './models/heart.glb',
  },
  brain: {
    id: 'brain',
    source: 'Z-Anatomy',
    license: 'CC BY-SA 4.0',
    attribution: 'Z-Anatomy Open Source Atlas (CC BY-SA 4.0)',
    glbPath: './models/brain.glb',
  },
  lungs: {
    id: 'lungs',
    source: 'Z-Anatomy',
    license: 'CC BY-SA 4.0',
    attribution: 'Z-Anatomy Open Source Atlas (CC BY-SA 4.0)',
    glbPath: './models/lungs.glb',
  },
  liver: {
    id: 'liver',
    source: 'Z-Anatomy',
    license: 'CC BY-SA 4.0',
    attribution: 'Z-Anatomy Open Source Atlas (CC BY-SA 4.0)',
    glbPath: './models/liver.glb',
  },
  kidneys: {
    id: 'kidneys',
    source: 'Z-Anatomy',
    license: 'CC BY-SA 4.0',
    attribution: 'Z-Anatomy Open Source Atlas (CC BY-SA 4.0)',
    glbPath: './models/kidneys.glb',
  },
};

let sharedLoader: GLTFLoader | null = null;

function getGltfLoader(): GLTFLoader {
  if (!sharedLoader) {
    sharedLoader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    sharedLoader.setDRACOLoader(draco);
  }
  return sharedLoader;
}

/**
 * Attempts to lazy-load an external GLB model if hosted in `public/models/`.
 * Returns null gracefully if not present so the built-in anatomical model renders without errors.
 */
export async function tryLoadAnatomicalGLB(
  organId: string,
  onProgress?: (pct: number) => void,
): Promise<THREE.Group | null> {
  const entry = ANATOMICAL_GLB_REGISTRY[organId];
  if (!entry) return null;

  try {
    const head = await fetch(entry.glbPath, { method: 'HEAD' });
    const contentType = head.headers.get('content-type') ?? '';
    if (!head.ok || contentType.includes('text/html')) {
      return null;
    }

    const loader = getGltfLoader();
    return await new Promise<THREE.Group | null>((resolve) => {
      loader.load(
        entry.glbPath,
        (gltf) => {
          resolve(gltf.scene);
        },
        (evt) => {
          if (evt.total > 0 && onProgress) {
            onProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
        () => resolve(null),
      );
    });
  } catch {
    return null;
  }
}
