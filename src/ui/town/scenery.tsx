// The town's scenery: the floating island with its cliffs and clouds below, the forest and
// flowers (instanced, so hundreds of them stay cheap), the pond with its waterfall over the
// edge, plaza details, and a little life: people strolling round the dojo and birds overhead.
import { Instance, Instances } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ISLAND_RADIUS, POND, RING, scatterFlowers, scatterTrees, seeded, type TreeSpot } from "../../game/townLayout.ts";
import { Blob, BRAND, INK, LEAF, ORANGE, Person, type PersonStyle } from "./props.tsx";

const BLOSSOM = ["#f9b8d6", "#d8b4fe", "#fbcfe8"];
const FLOWER = ["#ff8fb8", "#ffd166", "#ffffff", "#b9a7ff"];
const WATER = "#7cc8ff";
const ROCK = ["#b7a2ea", "#a28fe0", "#c4b5f4"];
const noRaycast = () => null;

/** Grows from nothing to full size with a little overshoot, starting `delay` seconds in. */
export function grow(elapsed: number, delay: number, still: boolean): number {
  if (still) return 1;
  const t = Math.min(1, Math.max(0, (elapsed - delay) / 0.55));
  const c = 1.9;
  return t === 0 ? 0.001 : 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

export function IslandBase({ still }: { still: boolean }) {
  const rocks = useMemo(() => {
    const rand = seeded(23);
    return Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + rand() * 0.2;
      const r = ISLAND_RADIUS - 0.5 + rand() * 0.6;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: -1.1 - rand() * 1.6, s: 0.55 + rand() * 0.6, c: ROCK[i % 3]! };
    });
  }, []);
  return (
    <group>
      {/* Grass top with a darker lip. Only the top catches shadows; nothing down here casts them. */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <cylinderGeometry args={[ISLAND_RADIUS, ISLAND_RADIUS, 0.4, 72]} />
        <meshStandardMaterial color="#9edb93" roughness={1} />
      </mesh>
      <mesh position={[0, -0.42, 0]}>
        <cylinderGeometry args={[ISLAND_RADIUS + 0.06, ISLAND_RADIUS - 0.05, 0.16, 72]} />
        <meshStandardMaterial color="#7fc679" roughness={1} />
      </mesh>
      {/* Lavender cliffs, faceted like rock */}
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[ISLAND_RADIUS - 0.05, ISLAND_RADIUS - 0.8, 1.8, 22]} />
        <meshStandardMaterial color="#b7a2ea" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, -5.3, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[ISLAND_RADIUS - 0.8, 6, 11]} />
        <meshStandardMaterial color="#9583dc" roughness={1} flatShading />
      </mesh>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, r.y, r.z]} scale={r.s} rotation={[i, i * 2, 0]}>
          <dodecahedronGeometry args={[0.8, 0]} />
          <meshStandardMaterial color={r.c} roughness={1} flatShading />
        </mesh>
      ))}
      {/* Little rocks floating nearby */}
      <FloatingRock position={[-15, -4, 5]} size={1.1} still={still} phase={0} />
      <FloatingRock position={[14.5, -5, -4]} size={0.8} still={still} phase={2} />
      <FloatingRock position={[-6, -7.5, 15]} size={0.6} still={still} phase={4} />
      {/* A bank of clouds under the island */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => {
        const a = (i / 9) * Math.PI * 2 + 0.3;
        return <CloudPuff key={i} position={[Math.cos(a) * 11.5, -5.2 - (i % 3) * 0.6, Math.sin(a) * 11.5]} scale={2 + (i % 3) * 0.5} still={still} phase={i} />;
      })}
    </group>
  );
}

function FloatingRock({ position, size, still, phase }: { position: [number, number, number]; size: number; still: boolean; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !still) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.7 + phase) * 0.35;
  });
  return (
    <group ref={ref} position={position} scale={size}>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1, 1, 0.3, 10]} />
        <meshStandardMaterial color="#9edb93" roughness={1} />
      </mesh>
      <mesh position={[0, -0.8, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[1, 1.6, 7]} />
        <meshStandardMaterial color="#a28fe0" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.2, 0.6, 0]}>
        <coneGeometry args={[0.35, 0.8, 6]} />
        <meshStandardMaterial color={LEAF[1]} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

function CloudPuff({ position, scale, still, phase }: { position: [number, number, number]; scale: number; still: boolean; phase: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current && !still) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.4 + phase) * 0.25;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      {[
        [0, 0, 0, 0.9],
        [0.9, -0.15, 0.2, 0.65],
        [-0.85, -0.2, 0.1, 0.6],
        [0.2, 0.25, -0.4, 0.7],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x!, y!, z!]} raycast={noRaycast}>
          <sphereGeometry args={[r!, 14, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Every tree in town, drawn as a few instanced meshes. Grows in at the start. */
export function Forest({ still }: { still: boolean }) {
  const trees = useMemo(() => scatterTrees(58), []);
  const group = useRef<THREE.Group>(null);
  const crowns = useRef<(THREE.Object3D | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) group.current.scale.set(1, grow(t, 0.9, still), 1);
    if (still) return;
    crowns.current.forEach((crown, i) => {
      if (crown) crown.rotation.z = Math.sin(t * 1.2 + i * 0.7) * 0.04;
    });
  });

  const round = trees.filter((t) => t.kind !== "pine");
  const pine = trees.filter((t) => t.kind === "pine");
  const tint = (t: TreeSpot, i: number) => (t.kind === "blossom" ? BLOSSOM[i % BLOSSOM.length]! : LEAF[i % LEAF.length]!);
  let crown = 0;
  const keep = () => {
    const index = crown++;
    return (o: THREE.Object3D | null) => {
      crowns.current[index] = o;
    };
  };

  return (
    <group ref={group}>
      <Instances limit={trees.length} raycast={noRaycast}>
        <cylinderGeometry args={[0.08, 0.12, 0.6, 6]} />
        <meshStandardMaterial color="#9a6b4f" roughness={0.9} />
        {trees.map((t, i) => (
          <Instance key={i} position={[t.x, 0.3 * t.scale, t.z]} scale={t.scale} />
        ))}
      </Instances>
      <Instances limit={round.length * 2} raycast={noRaycast}>
        <icosahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial roughness={0.8} flatShading />
        {round.flatMap((t, i) => [
          <Instance key={`a${i}`} ref={keep()} position={[t.x, 0.9 * t.scale, t.z]} scale={t.scale} color={tint(t, i)} />,
          <Instance
            key={`b${i}`}
            ref={keep()}
            position={[t.x + 0.18 * t.scale, 1.17 * t.scale, t.z + 0.05]}
            scale={t.scale * 0.6}
            color={tint(t, i + 1)}
          />,
        ])}
      </Instances>
      <Instances limit={pine.length * 2} raycast={noRaycast}>
        <coneGeometry args={[0.45, 0.8, 6]} />
        <meshStandardMaterial roughness={0.8} flatShading />
        {pine.flatMap((t, i) => [
          <Instance key={`a${i}`} ref={keep()} position={[t.x, 0.9 * t.scale, t.z]} scale={t.scale} color={LEAF[(i + 1) % LEAF.length]!} />,
          <Instance key={`b${i}`} ref={keep()} position={[t.x, 1.35 * t.scale, t.z]} scale={t.scale * 0.72} color={LEAF[(i + 1) % LEAF.length]!} />,
        ])}
      </Instances>
    </group>
  );
}

export function Flowers({ still }: { still: boolean }) {
  const flowers = useMemo(() => scatterFlowers(46), []);
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.scale.setScalar(grow(clock.elapsedTime, 1.1, still));
  });
  return (
    <group ref={group}>
      <Instances limit={flowers.length} raycast={noRaycast}>
        <sphereGeometry args={[0.07, 8, 6]} />
        <meshStandardMaterial roughness={0.6} />
        {flowers.map((f, i) => (
          <Instance key={i} position={[f.x, 0.09, f.z]} color={FLOWER[f.color]!} />
        ))}
      </Instances>
    </group>
  );
}

/** The pond, two ducks, and a stream that spills over the edge of the island. */
export function Pond({ still }: { still: boolean }) {
  const ducks = useRef<THREE.Group>(null);
  const drops = useRef<THREE.Group>(null);
  const [px, pz] = POND.at;
  // Where the stream meets the edge, and which way is "out".
  const edgeZ = Math.sqrt(ISLAND_RADIUS ** 2 - px ** 2);
  const out = Math.atan2(px, edgeZ);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ducks.current && !still) ducks.current.rotation.y = t * 0.35;
    drops.current?.children.forEach((d, i) => {
      const k = still ? i / 8 : (t * 0.6 + i / 8) % 1;
      d.position.y = -0.3 - k * 6.2;
    });
  });
  return (
    <group>
      <group position={[px, 0, pz]}>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[POND.radius, 40]} />
          <meshStandardMaterial color={WATER} roughness={0.15} emissive={WATER} emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[POND.radius + 0.05, 0.1, 6, 40]} />
          <meshStandardMaterial color="#e4defa" roughness={0.9} />
        </mesh>
        {[
          [0.5, -0.4],
          [-0.6, 0.2],
          [0.1, 0.7],
        ].map(([x, z]) => (
          <mesh key={`${x}${z}`} position={[x!, 0.05, z!]}>
            <cylinderGeometry args={[0.18, 0.18, 0.02, 12, 1, false, 0.4, Math.PI * 1.8]} />
            <meshStandardMaterial color="#5fbf74" />
          </mesh>
        ))}
        <group ref={ducks}>
          {[0, Math.PI].map((a) => (
            <group key={a} position={[Math.cos(a) * 0.75, 0.08, Math.sin(a) * 0.75]} rotation={[0, -a, 0]}>
              <mesh scale={[1, 0.7, 1.3]}>
                <sphereGeometry args={[0.12, 12, 10]} />
                <meshStandardMaterial color="#ffe066" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.12, 0.1]}>
                <sphereGeometry args={[0.07, 10, 8]} />
                <meshStandardMaterial color="#ffe066" roughness={0.6} />
              </mesh>
              <mesh position={[0, 0.11, 0.18]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.03, 0.07, 6]} />
                <meshStandardMaterial color={ORANGE} />
              </mesh>
            </group>
          ))}
        </group>
      </group>
      {/* The stream out to the edge */}
      <mesh position={[px, 0.03, (pz + POND.radius + edgeZ) / 2 - 0.1]}>
        <boxGeometry args={[0.55, 0.02, edgeZ - pz - POND.radius + 0.4]} />
        <meshStandardMaterial color={WATER} roughness={0.15} emissive={WATER} emissiveIntensity={0.1} />
      </mesh>
      {/* The waterfall down the cliff */}
      <group position={[px + Math.sin(out) * 0.2, 0, edgeZ + Math.cos(out) * 0.2]} rotation={[0, out, 0]}>
        <mesh position={[0, -3.2, 0]} raycast={noRaycast}>
          <boxGeometry args={[0.55, 6.4, 0.08]} />
          <meshStandardMaterial color="#a5dcff" transparent opacity={0.75} roughness={0.1} emissive={WATER} emissiveIntensity={0.2} />
        </mesh>
        <group ref={drops}>
          {Array.from({ length: 8 }, (_, i) => (
            <mesh key={i} position={[(i % 3) * 0.15 - 0.15, 0, 0.08]} raycast={noRaycast}>
              <boxGeometry args={[0.05, 0.35, 0.02]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
}

/** Lamps and benches round the dojo. */
export function Plaza() {
  const corner = RING.half - 1.3;
  return (
    <group>
      {[
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ].map(([sx, sz]) => (
        <group key={`${sx}${sz}`}>
          {/* Lamp post */}
          <group position={[sx! * (corner + 0.15), 0, sz! * (corner + 0.15)]}>
            <mesh position={[0, 0.6, 0]}>
              <cylinderGeometry args={[0.04, 0.05, 1.2, 8]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh position={[0, 1.25, 0]}>
              <sphereGeometry args={[0.13, 12, 10]} />
              <meshStandardMaterial color="#fff2c4" emissive="#ffd88a" emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
          </group>
          {/* Bench facing the dojo */}
          <group position={[sx! * (corner - 0.5), 0, sz! * (corner - 0.5)]} rotation={[0, Math.atan2(-sx!, -sz!), 0]}>
            <mesh position={[0, 0.22, 0]}>
              <boxGeometry args={[0.8, 0.06, 0.26]} />
              <meshStandardMaterial color="#c98b62" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.38, -0.12]}>
              <boxGeometry args={[0.8, 0.22, 0.05]} />
              <meshStandardMaterial color="#c98b62" roughness={0.8} />
            </mesh>
            {[-0.32, 0.32].map((x) => (
              <mesh key={x} position={[x, 0.1, 0]}>
                <boxGeometry args={[0.05, 0.2, 0.22]} />
                <meshStandardMaterial color={INK} />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}

/** Two neighbours out for a stroll round the dojo. */
export function Strollers({ still }: { still: boolean }) {
  return (
    <>
      <Stroller style={{ skin: "#f6d0b1", hair: "#e9b949", shirt: "#4fb6ff", pants: BRAND[900] }} radius={3.3} speed={0.12} offset={0} still={still} />
      <Stroller style={{ skin: "#6f4a32", hair: INK, shirt: "#ffb84d", pants: "#3b3a5a" }} radius={3.3} speed={-0.1} offset={2.4} still={still} />
    </>
  );
}

function Stroller({ style, radius, speed, offset, still }: { style: PersonStyle; radius: number; speed: number; offset: number; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = offset + (still ? 0 : clock.elapsedTime * speed);
    ref.current.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius);
    // Face along the circle, the way they're walking.
    ref.current.rotation.y = -a + (speed > 0 ? 0 : Math.PI);
  });
  return (
    <group ref={ref}>
      <Blob size={0.3} />
      <Person style={style} position={[0, 0, 0]} walking still={still} />
    </group>
  );
}

/** A few birds circling high over town. */
export function Birds({ still }: { still: boolean }) {
  const flock = useRef<THREE.Group>(null);
  const wings = useRef<(THREE.Group | null)[]>([]);
  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime;
    if (flock.current) flock.current.rotation.y = -t * 0.12;
    wings.current.forEach((w, i) => {
      if (w) w.children.forEach((wing, side) => (wing.rotation.x = (side ? 1 : -1) * (0.25 + Math.sin(t * 9 + i) * 0.45)));
    });
  });
  return (
    <group ref={flock}>
      {[
        [10, 8.5, 0],
        [10.8, 8.9, -0.8],
        [9.4, 9.1, -1.1],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x!, y!, z!]} rotation={[0, Math.PI, 0]}>
          <group ref={(g) => void (wings.current[i] = g)}>
            {[-1, 1].map((side) => (
              <mesh key={side} position={[0, 0, side * 0.18]} raycast={noRaycast}>
                <boxGeometry args={[0.16, 0.03, 0.36]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            ))}
          </group>
        </group>
      ))}
    </group>
  );
}
