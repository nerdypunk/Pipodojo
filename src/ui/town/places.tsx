// The places in Pipodojo Town, in a friendly toy-city style: rounded walls in clear colours,
// slate roofs, brick accents and a little face on every building. Each is built facing +z (its front) at its own origin; the town
// turns and moves it into place.
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BLOSSOM_SCALE, SAKURA_PADS, SAKURA_SIZE, SHRINE_DECK, sakuraBlossoms } from "../../game/townLayout.ts";
import { mergePlaced, type Placed } from "./merge.ts";
import { DYNAMIC } from "./Static.tsx";
import { BRAND, CORAL, Face, INK, Person, Roof } from "./props.tsx";

const GLASS = "#c7e6ff";
const BRICK = "#e2725b";
const MINT = "#9fd7b5";
const SAND = "#f1e6cc";

function Walls({ size, position, color, radius = 0.18 }: { size: [number, number, number]; position: [number, number, number]; color: string; radius?: number }) {
  return (
    <RoundedBox args={size} radius={radius} smoothness={3} position={position}>
      <meshStandardMaterial color={color} roughness={0.85} />
    </RoundedBox>
  );
}

/** A round window with a white frame. */
function Porthole({ position, r = 0.22 }: { position: [number, number, number]; r?: number }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[r, 0.05, 8, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[r, r, 0.03, 24]} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.2} roughness={0.15} />
      </mesh>
    </group>
  );
}

/** An arched door. */
function Door({ position, color, w = 0.5, h = 0.8 }: { position: [number, number, number]; color: string; w?: number; h?: number }) {
  return (
    <group position={position}>
      <mesh position={[0, h / 2 - w / 4, 0]}>
        <boxGeometry args={[w, h - w / 2, 0.06]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, h - w / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[w / 2, w / 2, 0.06, 20, 1, false, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[w * 0.28, h * 0.42, 0.05]}>
        <sphereGeometry args={[0.035, 8, 6]} />
        <meshStandardMaterial color="#ffd166" metalness={0.3} roughness={0.3} />
      </mesh>
    </group>
  );
}

const SAKURA = ["#f7b3c9", "#f29bb8", "#fbc6d6", "#f4a7c1"];
const BARK = "#6b4535";
const STONE = "#cdd2da";
/** Top of the shrine's grassy mound. */
const DECK = SHRINE_DECK;

type V3 = [number, number, number];
/** A tapered piece of wood from one point to another, worked out once: where it sits, which way it points, how long. */
interface Limb {
  mid: THREE.Vector3;
  turn: THREE.Quaternion;
  length: number;
  r0: number;
  r1: number;
}
const UP = new THREE.Vector3(0, 1, 0);
function limb(from: V3, to: V3, r0: number, r1: number): Limb {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  return { mid: a.clone().add(b).multiplyScalar(0.5), turn: new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize()), length: dir.length(), r0, r1 };
}
/** A branch with a gentle upward elbow halfway, so it arcs out rather than running straight. */
function branch(from: V3, to: V3, r0: number, r1: number): Limb[] {
  const elbow: V3 = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2 + 0.3, (from[2] + to[2]) / 2];
  const rMid = (r0 + r1) / 2;
  return [limb(from, elbow, r0, rMid), limb(elbow, to, rMid, r1)];
}

/** The trunk twists as it climbs, like an old sakura: thick at the roots, leaning one way, then the other. */
const TRUNK: V3[] = [
  [0, DECK, 0],
  [0.32, 1.55, 0.12],
  [-0.12, 2.7, -0.05],
  [0.22, 3.75, -0.15],
];
const TRUNK_R = [0.46, 0.36, 0.28, 0.2];
// Blossom pads and clumps come from the town layout, where a test keeps them clear of Pipo's loop.
const PADS = SAKURA_PADS;
const BLOSSOMS = sakuraBlossoms();
const WOOD: Limb[] = [
  ...TRUNK.slice(1).map((p, i) => limb(TRUNK[i]!, p, TRUNK_R[i]!, TRUNK_R[i + 1]!)),
  // Branches from the top of the trunk out under each high pad, and one lower one from the bend.
  ...PADS.slice(0, 5).flatMap(([x, y, z]) => branch(TRUNK[3]!, [x, y - 0.35, z], 0.15, 0.06)),
  ...branch(TRUNK[2]!, [PADS[5]![0], PADS[5]![1] - 0.3, PADS[5]![2]], 0.13, 0.06),
];
const PETALS = 26;

/**
 * The tree's static parts joined into few meshes (see merge.ts): all the wood in one (trunk,
 * branches, the knuckles where the trunk bends, the roots), and the blossom in one per pink.
 */
function sakuraGeometry() {
  const wood: Placed[] = [
    ...WOOD.map((w) => ({ geometry: new THREE.CylinderGeometry(w.r1, w.r0, w.length, 6), position: w.mid.toArray(), quaternion: w.turn })),
    ...TRUNK.slice(1, 3).map((p, i) => ({ geometry: new THREE.DodecahedronGeometry(TRUNK_R[i + 1]! * 1.05, 0), position: p })),
    ...[0.4, 2.0, 3.5, 5.1].map((a) => ({
      geometry: new THREE.ConeGeometry(0.16, 0.7, 5),
      position: [0.42 * Math.cos(a), DECK + 0.1, -0.42 * Math.sin(a)] as V3,
      quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(0, a, 0)).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -1.2))),
    })),
  ];
  const blossom = SAKURA.map((_, shade) =>
    mergePlaced(
      BLOSSOMS.filter((_, i) => i % SAKURA.length === shade).map(([x, y, z, r, spin]) => ({
        geometry: new THREE.IcosahedronGeometry(r, 1),
        position: [x, y, z] as V3,
        rotation: [0, spin, 0] as V3,
        scale: BLOSSOM_SCALE,
      })),
    ),
  );
  return { wood: mergePlaced(wood), blossom };
}

/** The heart of Pipodojo: an old sakura tree in a little shrine, behind a red torii gate. */
export function SakuraShrine({ still }: { still: boolean }) {
  const tree = useMemo(sakuraGeometry, []);
  const petals = useRef<THREE.InstancedMesh>(null);
  // Each petal drifts down from the canopy on its own path, then starts again at the top
  // (in the full-size model's units, like the rest of the tree).
  const drift = useRef(
    Array.from({ length: PETALS }, (_, i) => ({
      a: (i / PETALS) * Math.PI * 2 * 3.7,
      r: 0.6 + ((i * 37) % 19) / 10,
      speed: 0.09 + ((i * 13) % 7) / 100,
      phase: i / PETALS,
    })),
  );
  // Nothing in the shrine takes clicks: the places around it do.
  const root = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    root.current?.traverse((o) => {
      o.raycast = () => {};
    });
  }, []);
  // Two shades of pink across the petals.
  useLayoutEffect(() => {
    const mesh = petals.current;
    if (!mesh) return;
    const pink = new THREE.Color();
    for (let i = 0; i < PETALS; i++) mesh.setColorAt(i, pink.set(SAKURA[i % 2 ? 0 : 3]!));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [still]);
  const petal = useMemo(() => new THREE.Object3D(), []);
  useFrame(({ clock }) => {
    const mesh = petals.current;
    if (!mesh || still) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < PETALS; i++) {
      const d = drift.current[i]!;
      const k = (t * d.speed + d.phase) % 1;
      const a = d.a + k * 1.6;
      const r = d.r + k * 0.9;
      petal.position.set(Math.cos(a) * r + Math.sin(t * 1.3 + i) * 0.15, 4.4 - k * 3.9, Math.sin(a) * r);
      petal.rotation.set(t * 1.7 + i, t * 1.1 + i * 0.5, t * 0.9);
      petal.updateMatrix();
      mesh.setMatrixAt(i, petal.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group ref={root}>
      {/* A grassy mound with a stone rim, stone steps and stepping stones up to the tree */}
      <RoundedBox args={[4.4, DECK - 0.08, 4.4]} radius={0.12} smoothness={3} position={[0, (DECK - 0.08) / 2, 0]}>
        <meshStandardMaterial color="#d5dbe4" roughness={0.9} />
      </RoundedBox>
      <RoundedBox args={[4.15, 0.16, 4.15]} radius={0.07} smoothness={3} position={[0, DECK - 0.08, 0]}>
        <meshStandardMaterial color="#8fd16b" roughness={1} />
      </RoundedBox>
      {[0, 1].map((i) => (
        <RoundedBox key={i} args={[1.6, 0.14, 0.36]} radius={0.05} position={[0, 0.07 + i * 0.13, 2.45 - i * 0.18]}>
          <meshStandardMaterial color="#cfd6df" roughness={0.9} />
        </RoundedBox>
      ))}
      {[1.75, 1.15].map((z, i) => (
        <mesh key={z} position={[i ? -0.08 : 0.06, DECK + 0.01, z]}>
          <cylinderGeometry args={[0.24, 0.26, 0.04, 7]} />
          <meshStandardMaterial color={STONE} roughness={0.95} flatShading />
        </mesh>
      ))}
      {/* The tree is modelled full size, from the mound's top, and drawn smaller (SAKURA_SIZE). */}
      <group position={[0, DECK * (1 - SAKURA_SIZE), 0]} scale={SAKURA_SIZE}>
      {/* Low-poly trunk and branches, faceted like the blossom, with roots over the grass: one mesh */}
      <mesh geometry={tree.wood}>
        <meshStandardMaterial color={BARK} roughness={0.9} flatShading />
      </mesh>
      {/* The blossom: one mesh per shade of pink */}
      {tree.blossom.map((geometry, i) => (
        <mesh key={i} geometry={geometry}>
          <meshStandardMaterial color={SAKURA[i]} roughness={0.8} flatShading />
        </mesh>
      ))}
      {/* Shimenawa: a sacred straw rope round the trunk, with white paper streamers */}
      <group position={[0.18, DECK + 0.75, 0.07]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.43, 0.07, 8, 24]} />
          <meshStandardMaterial color="#e6cf95" roughness={0.9} />
        </mesh>
        {[-0.5, 0, 0.5].map((a) => (
          <group key={a} rotation={[0, a, 0]}>
            <mesh position={[0, -0.22, 0.49]} rotation={[0, 0, 0.15]}>
              <boxGeometry args={[0.07, 0.3, 0.02]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      {/* Falling petals, all drawn in one go */}
      {!still && (
        <instancedMesh ref={petals} args={[undefined, undefined, PETALS]} frustumCulled={false}>
          <planeGeometry args={[0.16, 0.11]} />
          <meshStandardMaterial side={THREE.DoubleSide} />
        </instancedMesh>
      )}
      </group>
      {/* Stone lanterns either side of the path */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 1.35, DECK, 1.55]}>
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.36, 0.12, 0.36]} />
            <meshStandardMaterial color={STONE} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.36, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.5, 8]} />
            <meshStandardMaterial color={STONE} roughness={0.95} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <boxGeometry args={[0.3, 0.24, 0.3]} />
            <meshStandardMaterial color="#fff2c4" emissive="#ffc96b" emissiveIntensity={0.8} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.94, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.32, 0.22, 4]} />
            <meshStandardMaterial color={STONE} roughness={0.95} />
          </mesh>
          <mesh position={[0, 1.09, 0]}>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshStandardMaterial color={STONE} roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* Torii gate in front, with round ends. It stands just past the steps, inside the circle
          the strollers walk (3.3 out), so they pass outside its posts rather than through them. */}
      <group position={[0, 0, 2.8]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.9, 0.8, 0]}>
            <capsuleGeometry args={[0.1, 1.4, 4, 10]} />
            <meshStandardMaterial color={CORAL} roughness={0.6} />
          </mesh>
        ))}
        <RoundedBox args={[2.4, 0.16, 0.22]} radius={0.07} position={[0, 1.62, 0]}>
          <meshStandardMaterial color={CORAL} roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[1.9, 0.1, 0.14]} radius={0.04} position={[0, 1.36, 0]}>
          <meshStandardMaterial color={CORAL} roughness={0.6} />
        </RoundedBox>
      </group>
    </group>
  );
}

/** The busy parent's home, with a barbecue going in the front yard. */
export function House({ still }: { still: boolean }) {
  const smoke = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!smoke.current || still) return;
    smoke.current.children.forEach((puff, i) => {
      const t = (clock.elapsedTime * 0.5 + i / 3) % 1;
      puff.position.y = t * 1.1;
      puff.scale.setScalar(0.4 + t * 0.8);
      ((puff as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - t);
    });
  });
  return (
    <group>
      <mesh position={[0, 0.02, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 40]} />
        <meshStandardMaterial color="#a8d98a" roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, 1.75]}>
        <boxGeometry args={[0.55, 0.02, 1.3]} />
        <meshStandardMaterial color="#d9dee5" roughness={1} />
      </mesh>
      <Walls size={[2.5, 1.6, 2.0]} position={[0, 0.82, -0.5]} color="#9cc3ea" />
      <group position={[0, 1.6, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <Roof width={2.5} height={1.0} depth={2.9} color={BRAND[400]} />
      </group>
      <RoundedBox args={[0.3, 0.7, 0.3]} radius={0.08} position={[0.75, 2.2, -0.9]}>
        <meshStandardMaterial color={CORAL} roughness={0.9} />
      </RoundedBox>
      <Door position={[0, 0.02, 0.51]} color={CORAL} />
      <Porthole position={[-0.8, 1.0, 0.51]} />
      <Porthole position={[0.8, 1.0, 0.51]} />
      <Face position={[0, 1.33, 0.51]} scale={0.8} blink={!still} />
      {/* Barbecue grill with smoke */}
      <group position={[1.3, 0, 1.3]}>
        <mesh position={[0, 0.55, 0]}>
          <sphereGeometry args={[0.28, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
          <meshStandardMaterial color={INK} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        {[-0.15, 0.15].map((x) => (
          <mesh key={x} position={[x, 0.25, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.5, 6]} />
            <meshStandardMaterial color={INK} />
          </mesh>
        ))}
        <group ref={smoke} position={[0, 0.7, 0]} userData={DYNAMIC}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={1} />
            </mesh>
          ))}
        </group>
      </group>
      <Person
        style={{ skin: "#8d5524", hair: "#2b1d16", shirt: "#e8655a", pants: "#3b3a5a", extra: "spatula" }}
        position={[0.6, 0, 1.5]}
        turn={0.5}
        still={still}
      />
      {/* A low, rounded picket fence across the front of the yard */}
      {[-1.8, -1.35, -0.9, 0.9, 1.35, 1.8].map((x) => (
        <mesh key={x} position={[x, 0.2, 2.35]}>
          <capsuleGeometry args={[0.05, 0.28, 4, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 1.35, 0.26, 2.35]}>
          <boxGeometry args={[0.95, 0.05, 0.04]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

/** The college, with columns, a clock tower and a flag. */
export function College({ still }: { still: boolean }) {
  const flag = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!flag.current || still) return;
    flag.current.rotation.y = Math.sin(clock.elapsedTime * 3) * 0.25;
  });
  return (
    <group>
      {/* The lawn stays inside the hover ring (3.0 out), or it would cover the ring when the college lifts */}
      <mesh position={[0, 0.02, 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.8, 40]} />
        <meshStandardMaterial color="#a8d98a" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <RoundedBox key={i} args={[2.4, 0.16, 0.5]} radius={0.05} position={[0, 0.08 + i * 0.12, 1.55 - i * 0.22]}>
          <meshStandardMaterial color="#e6e9ee" roughness={0.9} />
        </RoundedBox>
      ))}
      <Walls size={[4.2, 2.0, 2.2]} position={[0, 1.2, -0.4]} color={SAND} radius={0.2} />
      {[-1.05, -0.35, 0.35, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.25, 1.0]}>
          <capsuleGeometry args={[0.14, 1.45, 4, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      ))}
      <RoundedBox args={[2.7, 0.2, 1.3]} radius={0.08} position={[0, 2.18, 0.55]}>
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </RoundedBox>
      <Roof width={2.8} height={0.6} depth={1.3} color={BRAND[400]} position={[0, 2.27, 0.55]} />
      <RoundedBox args={[4.4, 0.16, 2.4]} radius={0.07} position={[0, 2.25, -0.4]}>
        <meshStandardMaterial color={BRAND[500]} roughness={0.7} />
      </RoundedBox>
      <Porthole position={[-1.6, 1.25, 0.71]} r={0.28} />
      <Porthole position={[1.6, 1.25, 0.71]} r={0.28} />
      {/* Clock tower with a face */}
      <Walls size={[1.0, 1.3, 1.0]} position={[0, 2.9, -0.6]} color={SAND} radius={0.14} />
      <mesh position={[0, 3.2, -0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 3.24, -0.06]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.03, 0.16, 0.02]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <Face position={[0, 2.62, -0.09]} scale={0.75} blink={!still} />
      <mesh position={[0, 3.85, -0.6]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.85, 0.8, 4]} />
        <meshStandardMaterial color={BRICK} roughness={0.55} />
      </mesh>
      <mesh position={[1.7, 2.9, -1.2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={flag} position={[1.7, 3.4, -1.2]} userData={DYNAMIC}>
        <boxGeometry args={[0.02, 0.32, 0.55]} />
        <meshStandardMaterial color={CORAL} roughness={0.6} />
      </mesh>
      <Person
        style={{ skin: "#f1c27d", hair: "#6b3e26", shirt: "#5aa0e0", pants: "#3e4a5e", extra: "backpack" }}
        position={[0.9, 0.36, 1.65]}
        turn={0.3}
        still={still}
      />
    </group>
  );
}

/** The café, with a striped awning, a big smiling cup on the roof and tables outside. */
export function Cafe({ still }: { still: boolean }) {
  const steam = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!steam.current || still) return;
    steam.current.children.forEach((puff, i) => {
      const t = (clock.elapsedTime * 0.4 + i / 2) % 1;
      puff.position.y = t * 0.7;
      ((puff as THREE.Mesh).material as THREE.MeshStandardMaterial).opacity = 0.8 * (1 - t);
    });
  });
  const stripes = 8;
  return (
    <group>
      <RoundedBox args={[4.4, 0.06, 3.6]} radius={0.03} position={[0, 0.03, 0.6]}>
        <meshStandardMaterial color="#e4e8ee" roughness={1} />
      </RoundedBox>
      <Walls size={[3.2, 1.9, 2.2]} position={[0, 0.95, -0.5]} color="#a6d9a0" />
      <RoundedBox args={[3.4, 0.16, 2.4]} radius={0.07} position={[0, 1.95, -0.5]}>
        <meshStandardMaterial color={BRAND[500]} roughness={0.7} />
      </RoundedBox>
      <RoundedBox args={[1.5, 0.9, 0.06]} radius={0.12} position={[-0.55, 0.85, 0.61]}>
        <meshStandardMaterial color={GLASS} emissive="#ffd8a8" emissiveIntensity={0.25} roughness={0.15} />
      </RoundedBox>
      <Door position={[0.9, 0.02, 0.61]} color={BRAND[600]} w={0.55} h={1.15} />
      {Array.from({ length: stripes }, (_, i) => (
        <mesh key={i} position={[-1.4 + (i + 0.5) * (2.8 / stripes), 1.55, 0.85]} rotation={[0.55, 0, 0]}>
          <capsuleGeometry args={[0.16, 0.38, 4, 8]} />
          <meshStandardMaterial color={i % 2 ? "#ffffff" : BRICK} roughness={0.7} />
        </mesh>
      ))}
      {/* The big cup, smiling */}
      <group position={[0, 2.38, -0.5]}>
        <mesh>
          <cylinderGeometry args={[0.46, 0.36, 0.75, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.45} />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.03, 24]} />
          <meshStandardMaterial color="#a0673f" roughness={0.6} />
        </mesh>
        <mesh position={[0.5, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.16, 0.055, 8, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.45} />
        </mesh>
        <Face position={[0, 0, 0.42]} scale={0.85} blink={!still} />
        <group ref={steam} position={[0, 0.45, 0]} userData={DYNAMIC}>
          {[-0.1, 0.12].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      {[-1.3, 1.4].map((x) => (
        <group key={x} position={[x, 0, 1.75]}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.2, 6]} />
            <meshStandardMaterial color={INK} />
          </mesh>
          <mesh position={[0, 1.2, 0]} scale={[1, 0.45, 1]}>
            <sphereGeometry args={[0.6, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color={x < 0 ? "#f6c945" : "#5aa0e0"} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <Person
        style={{ skin: "#e0ac69", hair: "#1f1b2e", shirt: "#4fae6a", pants: "#2d2a3e", extra: "apron" }}
        position={[0.1, 0, 1.35]}
        turn={-0.3}
        still={still}
      />
    </group>
  );
}

/** The young coder's home: a mint cottage with a puffy roof, a treehouse and a glowing laptop. */
export function KidHouse({ still }: { still: boolean }) {
  const star = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!star.current || still) return;
    star.current.rotation.y = clock.elapsedTime;
    star.current.position.y = 3.25 + Math.sin(clock.elapsedTime * 2) * 0.08;
  });
  return (
    <group>
      <mesh position={[0, 0.02, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.7, 40]} />
        <meshStandardMaterial color="#a8d98a" roughness={1} />
      </mesh>
      <Walls size={[2.2, 1.5, 1.9]} position={[-0.3, 0.77, -0.4]} color={MINT} radius={0.24} />
      {/* A big round mushroom-style roof */}
      <mesh position={[-0.3, 1.5, -0.4]} scale={[1.55, 0.85, 1.4]}>
        <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={BRICK} roughness={0.55} />
      </mesh>
      {[
        [-0.9, 1.95, 0.3],
        [0.2, 2.15, 0.1],
        [-0.4, 2.2, -0.9],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x!, y!, z!]} scale={[1, 0.5, 1]}>
          <sphereGeometry args={[0.16, 12, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
      <Door position={[-0.3, 0.02, 0.56]} color="#7cc8ff" w={0.5} h={0.8} />
      <Porthole position={[-1.0, 0.95, 0.56]} r={0.2} />
      <Face position={[0.4, 1.0, 0.56]} scale={0.7} blink={!still} />
      {/* Treehouse */}
      <mesh position={[1.4, 0.9, -0.9]}>
        <cylinderGeometry args={[0.14, 0.2, 1.8, 8]} />
        <meshStandardMaterial color="#b07a52" roughness={0.9} />
      </mesh>
      <mesh position={[1.4, 2.3, -0.9]}>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial color="#8edb8a" roughness={0.8} />
      </mesh>
      <RoundedBox args={[0.8, 0.6, 0.7]} radius={0.1} position={[1.4, 1.75, -0.4]}>
        <meshStandardMaterial color="#c9935f" roughness={0.8} />
      </RoundedBox>
      <Porthole position={[1.4, 1.78, -0.04]} r={0.13} />
      <mesh ref={star} position={[1.4, 3.25, -0.9]} userData={DYNAMIC}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {/* The kid, out front with a laptop */}
      <Person
        style={{ skin: "#c68642", hair: "#3b2416", shirt: "#f6c945", pants: "#5f6f8a", extra: "laptop" }}
        position={[0.7, 0, 1.25]}
        turn={-0.2}
        still={still}
      />
    </group>
  );
}

const FLOORS = 3;

/** The busy executive's office tower: glass floors, a smiling sign over the door and a blinking aerial. */
export function OfficeTower({ still }: { still: boolean }) {
  const beacon = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!beacon.current || still) return;
    ((beacon.current.material as THREE.MeshStandardMaterial).emissiveIntensity = Math.sin(clock.elapsedTime * 3) > 0.3 ? 2 : 0.2);
  });
  return (
    <group>
      <RoundedBox args={[3.2, 0.08, 3.0]} radius={0.04} position={[0, 0.04, 0.25]}>
        <meshStandardMaterial color="#dfe4ea" roughness={0.95} />
      </RoundedBox>
      <Walls size={[2.1, 3.3, 1.8]} position={[0, 1.7, -0.2]} color="#eef2f8" radius={0.16} />
      {/* A band of glass round each floor */}
      {Array.from({ length: FLOORS }, (_, i) => (
        <RoundedBox key={i} args={[2.16, 0.42, 1.86]} radius={0.06} position={[0, 1.6 + i * 0.7, -0.2]}>
          <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.25} roughness={0.15} />
        </RoundedBox>
      ))}
      {/* Entrance: glass doors under a canopy, with the sign and its face above */}
      <mesh position={[0, 0.5, 0.71]}>
        <boxGeometry args={[0.8, 0.85, 0.05]} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.3} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0.5, 0.74]}>
        <boxGeometry args={[0.03, 0.85, 0.02]} />
        <meshStandardMaterial color={BRAND[700]} />
      </mesh>
      <RoundedBox args={[1.2, 0.08, 0.5]} radius={0.03} position={[0, 1.0, 0.92]}>
        <meshStandardMaterial color={BRAND[600]} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.42, 0.06]} radius={0.05} position={[0, 1.12, 0.72]}>
        <meshStandardMaterial color="#fff8f0" roughness={0.8} />
      </RoundedBox>
      <Face position={[0, 1.12, 0.76]} scale={0.7} blink={!still} />
      {/* Potted trees either side of the door */}
      {[-0.85, 0.85].map((x) => (
        <group key={x} position={[x, 0, 1.15]}>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.14, 0.11, 0.24, 10]} />
            <meshStandardMaterial color={CORAL} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.48, 0]}>
            <sphereGeometry args={[0.24, 12, 10]} />
            <meshStandardMaterial color="#68b84f" roughness={0.9} />
          </mesh>
        </group>
      ))}
      {/* Rooftop: a plant room and an aerial with a blinking light */}
      <Walls size={[1.2, 0.45, 1.0]} position={[-0.3, 3.58, -0.35]} color="#d5dbe4" radius={0.08} />
      <mesh position={[0.55, 3.7, -0.45]}>
        <cylinderGeometry args={[0.025, 0.035, 0.7, 6]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={beacon} position={[0.55, 4.1, -0.45]} userData={DYNAMIC}>
        <sphereGeometry args={[0.07, 10, 8]} />
        <meshStandardMaterial color="#ff6b5b" emissive="#ff3b2f" emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Pipo's garage: where you change how your Pipo looks. */
export function Garage({ still }: { still: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshStandardMaterial color="#dfe4ea" roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.15, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.07, 8, 32]} />
        <meshStandardMaterial color={BRAND[400]} />
      </mesh>
      <RoundedBox args={[0.9, 0.84, 0.3]} radius={0.1} position={[0, 0.42, 1.0]}>
        <meshStandardMaterial color={BRAND[500]} roughness={0.6} />
      </RoundedBox>
      <Face position={[0, 0.58, 1.16]} scale={0.6} blink={!still} />
      <group position={[0, 1.35, 0]} rotation={[0, 0, 0.6]}>
        <mesh>
          <capsuleGeometry args={[0.07, 0.5, 4, 8]} />
          <meshStandardMaterial color={CORAL} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.36, 0]}>
          <torusGeometry args={[0.12, 0.05, 8, 16, Math.PI * 1.5]} />
          <meshStandardMaterial color={CORAL} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
