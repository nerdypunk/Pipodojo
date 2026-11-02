// Draws a static part of the town (a building, the plaza, an island) in a few meshes instead of
// dozens: every mesh inside that shares a look (same material settings) is merged into one.
// Each separate mesh is its own draw call, and tablets feel every one.
//
// Anything that moves on its own must sit in a group marked `userData={DYNAMIC}` (a blinking face,
// rising smoke, a waving flag): those are left exactly as they are. Moving the whole <Static>
// (a building lifting on hover, an island floating) is fine.
//
// The original meshes stay in place but hidden, so pointing at a building still works as before
// (picking ignores visibility); the merged copies don't take clicks themselves.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Mark a group with this (userData={DYNAMIC}) to keep it, and everything in it, out of merging. */
export const DYNAMIC = { dynamic: true } as const;

/** Materials that look the same share a key, so their meshes can be drawn as one. */
function lookOf(material: THREE.Material): string | null {
  const m = material as THREE.MeshStandardMaterial & THREE.MeshBasicMaterial;
  if (m.map || m.alphaMap || m.normalMap) return null;
  return [
    m.type,
    m.color?.getHexString(),
    m.emissive?.getHexString(),
    m.emissiveIntensity,
    m.roughness,
    m.metalness,
    m.flatShading,
    m.transparent,
    m.opacity,
    m.side,
    m.toneMapped,
    m.depthWrite,
    m.vertexColors,
  ].join("|");
}

const noRaycast = () => {};

export function Static({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);
    const toRoot = root.matrixWorld.clone().invert();
    const buckets = new Map<string, { material: THREE.Material; meshes: THREE.Mesh[] }>();

    const visit = (object: THREE.Object3D) => {
      if (object !== root && object.userData["dynamic"]) return;
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && !(mesh as unknown as THREE.InstancedMesh).isInstancedMesh && mesh.visible && !Array.isArray(mesh.material)) {
        const look = lookOf(mesh.material);
        if (look) {
          const bucket = buckets.get(look) ?? { material: mesh.material, meshes: [] };
          bucket.meshes.push(mesh);
          buckets.set(look, bucket);
        }
      }
      for (const child of object.children) visit(child);
    };
    visit(root);

    const added: THREE.Mesh[] = [];
    const hidden: THREE.Mesh[] = [];
    for (const { material, meshes } of buckets.values()) {
      if (meshes.length < 2) continue;
      const parts = meshes.map((mesh) => {
        const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
        for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
        g.morphAttributes = {};
        g.clearGroups();
        return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld));
      });
      const geometry = parts.every((p) => p.attributes["uv"]) ? mergeGeometries(parts, false) : null;
      for (const p of parts) p.dispose();
      if (!geometry) continue;
      const merged = new THREE.Mesh(geometry, material);
      merged.raycast = noRaycast;
      merged.castShadow = meshes.some((m) => m.castShadow);
      merged.receiveShadow = meshes.some((m) => m.receiveShadow);
      root.add(merged);
      added.push(merged);
      for (const mesh of meshes) {
        mesh.visible = false;
        hidden.push(mesh);
      }
    }

    return () => {
      for (const mesh of added) {
        root.remove(mesh);
        mesh.geometry.dispose();
      }
      for (const mesh of hidden) mesh.visible = true;
    };
  }, []);

  return <group ref={group}>{children}</group>;
}
