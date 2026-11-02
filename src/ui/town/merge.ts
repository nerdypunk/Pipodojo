// Many small static shapes that share a material are drawn far faster as one: each separate mesh
// is its own draw call, and tablets feel every one. These helpers place copies of shapes and
// join them into a single geometry. Only for parts that never move on their own.
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type V3 = readonly [number, number, number];

export interface Placed {
  geometry: THREE.BufferGeometry;
  position?: V3;
  /** Euler rotation in radians (XYZ), or a quaternion. */
  rotation?: V3;
  quaternion?: THREE.Quaternion;
  scale?: number | V3;
}

const matrix = new THREE.Matrix4();
const euler = new THREE.Euler();
const turn = new THREE.Quaternion();
const at = new THREE.Vector3();
const size = new THREE.Vector3();

/**
 * One geometry from many placed shapes. Every part is copied, moved into place and made
 * non-indexed (box and sphere shapes are indexed, polyhedra aren't, and they can only be joined
 * when they match). The source geometries are disposed: pass fresh ones.
 */
export function mergePlaced(parts: readonly Placed[]): THREE.BufferGeometry {
  const ready = parts.map(({ geometry, position = [0, 0, 0], rotation, quaternion, scale = 1 }) => {
    if (quaternion) turn.copy(quaternion);
    else turn.setFromEuler(euler.set(...(rotation ?? [0, 0, 0])));
    at.set(...position);
    if (typeof scale === "number") size.setScalar(scale);
    else size.set(...scale);
    const placed = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(matrix.compose(at, turn, size));
    geometry.dispose();
    return placed;
  });
  const merged = mergeGeometries(ready, false);
  for (const g of ready) g.dispose();
  if (!merged) throw new Error("Shapes to merge must have the same attributes");
  return merged;
}
