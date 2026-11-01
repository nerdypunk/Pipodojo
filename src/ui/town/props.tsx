// Small building blocks for Pipodojo Town: roofs, trees, people, cars, clouds and a balloon.
// Everything is made of simple shapes in a soft toy style; nothing is loaded from outside.
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RING, ringPoint } from "../../game/townLayout.ts";

type V3 = [number, number, number];

// A friendly toy-city palette: slate roofs and roads, light grey paving, natural greens and
// buildings in clear, not-too-bright colours. Pipo keeps its orange. (BRAND here is the slate scale.)
/** Soft plum grey for small dark details (poles, legs, wheels). */
export const INK = "#4a5163";
/** Eyes and smiles on the kawaii faces. */
export const EYES = "#2b2f3a";
export const BRAND = { 300: "#c9d3e3", 400: "#9fb0c8", 500: "#8496b3", 600: "#71839f", 700: "#5f708c", 900: "#3e4a5e" };
export const ORANGE = "#ff7a1a";
/** Brick red for chimneys, doors, the dojo gate and other warm accents. */
export const CORAL = "#e2725b";
export const LEAF = ["#7cc95c", "#68b84f", "#8fd16b", "#5fae4a"];

/** A puffy gable roof: a soft-edged triangle pushed out along z. Width and depth include the overhang. */
export function Roof({ width, height, depth, color, position }: { width: number; height: number; depth: number; color: string; position?: V3 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const bevel = Math.min(0.12, height * 0.15);
    const g = new THREE.ExtrudeGeometry(shape, { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3 });
    g.translate(0, 0, -(depth - bevel * 2) / 2);
    return g;
  }, [width, height, depth]);
  return (
    <mesh geometry={geometry} position={position}>
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  );
}

/** A soft round shadow on the ground, for things that move (real shadows are baked once). */
export function Blob({ size, position = [0, 0.03, 0] }: { size: number; position?: V3 }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <circleGeometry args={[size, 20]} />
      <meshBasicMaterial color="#2d2470" transparent opacity={0.18} depthWrite={false} />
    </mesh>
  );
}

/** A little kawaii face: shiny eyes, pink cheeks and a small smile. Faces +z. */
export function Face({ position, scale = 1, blink = false }: { position: V3; scale?: number; blink?: boolean }) {
  const eyes = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!eyes.current || !blink) return;
    // A quick blink every few seconds.
    const t = (clock.elapsedTime + position[0]) % 4;
    eyes.current.scale.y = t < 0.12 ? 0.15 : 1;
  });
  return (
    <group position={position} scale={scale}>
      <group ref={eyes}>
        {[-0.16, 0.16].map((x) => (
          <group key={x} position={[x, 0.04, 0]}>
            <mesh scale={[1, 1.25, 0.5]}>
              <sphereGeometry args={[0.065, 12, 10]} />
              <meshStandardMaterial color={EYES} roughness={0.3} />
            </mesh>
            <mesh position={[0.02, 0.03, 0.03]}>
              <sphereGeometry args={[0.02, 8, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
      </group>
      {[-0.28, 0.28].map((x) => (
        <mesh key={x} position={[x, -0.06, 0]} scale={[1.4, 0.8, 0.3]}>
          <sphereGeometry args={[0.06, 10, 8]} />
          <meshBasicMaterial color="#f2a48a" transparent opacity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, -0.05, 0]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.06, 0.018, 6, 12, Math.PI]} />
        <meshStandardMaterial color={EYES} />
      </mesh>
    </group>
  );
}

export interface PersonStyle {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  /** Something extra they carry or wear. */
  extra?: "apron" | "backpack" | "spatula" | "laptop";
}

/** A chunky little townsperson who waves now and then, or strolls along when `walking`. */
export function Person({
  style,
  position,
  turn = 0,
  walking = false,
  still,
}: {
  style: PersonStyle;
  position: V3;
  turn?: number;
  walking?: boolean;
  still: boolean;
}) {
  const arm = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Group | null)[]>([]);
  const phase = useMemo(() => position[0] * 2.1, [position]);
  useFrame(({ clock }) => {
    if (still) return;
    const t = clock.elapsedTime + phase;
    if (walking) {
      const swing = Math.sin(t * 7) * 0.5;
      legs.current.forEach((leg, i) => leg && (leg.rotation.x = i ? swing : -swing));
      if (arm.current) arm.current.rotation.x = swing;
      if (body.current) body.current.position.y = Math.abs(Math.cos(t * 7)) * 0.03;
      return;
    }
    // A wave every few seconds, a little bounce in between.
    const waving = Math.sin(t * 0.9) > 0.55;
    if (arm.current) arm.current.rotation.z = waving ? 2.5 + Math.sin(t * 9) * 0.35 : 0.25;
    if (body.current) body.current.position.y = Math.abs(Math.sin(t * 2.2)) * 0.04;
  });
  return (
    <group position={position} rotation={[0, turn, 0]} scale={1.25}>
      <group ref={body}>
        {/* Legs */}
        {[-0.09, 0.09].map((x, i) => (
          <group key={x} ref={(g) => void (legs.current[i] = g)} position={[x, 0.33, 0]}>
            <mesh position={[0, -0.15, 0]}>
              <capsuleGeometry args={[0.07, 0.22, 4, 8]} />
              <meshStandardMaterial color={style.pants} roughness={0.8} />
            </mesh>
          </group>
        ))}
        {/* Body */}
        <mesh position={[0, 0.55, 0]}>
          <capsuleGeometry args={[0.19, 0.28, 6, 12]} />
          <meshStandardMaterial color={style.shirt} roughness={0.7} />
        </mesh>
        {style.extra === "apron" && (
          <mesh position={[0, 0.5, 0.15]}>
            <boxGeometry args={[0.26, 0.34, 0.06]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
          </mesh>
        )}
        {style.extra === "laptop" && (
          <group position={[0, 0.55, 0.26]} rotation={[0.2, 0, 0]}>
            <mesh>
              <boxGeometry args={[0.36, 0.03, 0.24]} />
              <meshStandardMaterial color="#c9c3e6" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.12, -0.12]} rotation={[-0.35, 0, 0]}>
              <boxGeometry args={[0.36, 0.24, 0.02]} />
              <meshStandardMaterial color="#9cf3ff" emissive="#7dd3fc" emissiveIntensity={0.9} toneMapped={false} />
            </mesh>
          </group>
        )}
        {style.extra === "backpack" && (
          <mesh position={[0, 0.58, -0.2]}>
            <boxGeometry args={[0.28, 0.32, 0.14]} />
            <meshStandardMaterial color={ORANGE} roughness={0.7} />
          </mesh>
        )}
        {/* Head and hair */}
        <mesh position={[0, 0.98, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color={style.skin} roughness={0.7} />
        </mesh>
        <mesh position={[0, 1.03, -0.02]}>
          <sphereGeometry args={[0.215, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <meshStandardMaterial color={style.hair} roughness={0.8} />
        </mesh>
        {/* Eyes */}
        {[-0.07, 0.07].map((x) => (
          <mesh key={x} position={[x, 0.98, 0.18]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color={EYES} />
          </mesh>
        ))}
        {/* Arms: the right one waves */}
        <group position={[-0.24, 0.7, 0]} rotation={[0, 0, -0.25]}>
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            <meshStandardMaterial color={style.shirt} roughness={0.7} />
          </mesh>
        </group>
        <group ref={arm} position={[0.24, 0.7, 0]} rotation={[0, 0, 0.25]}>
          <mesh position={[0, -0.16, 0]}>
            <capsuleGeometry args={[0.055, 0.22, 4, 8]} />
            <meshStandardMaterial color={style.shirt} roughness={0.7} />
          </mesh>
          {style.extra === "spatula" && (
            <mesh position={[0, -0.36, 0.05]}>
              <boxGeometry args={[0.1, 0.16, 0.02]} />
              <meshStandardMaterial color="#c0c4d6" metalness={0.4} roughness={0.4} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
}

/** A little round car that drives the ring road. */
export function Car({ color, offset, speed, still }: { color: string; offset: number; speed: number; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const p = ringPoint(offset + (still ? 0 : clock.elapsedTime * speed));
    if (!ref.current) return;
    // Keep to the outer lane (the road is RING.width wide; a car is about half that).
    const side = 0.27;
    const alongX = Math.abs(Math.abs(p.z) - RING.half) < 1e-6;
    const nx = alongX ? 0 : Math.sign(p.x);
    const nz = alongX ? Math.sign(p.z) : 0;
    ref.current.position.set(p.x + nx * side, 0, p.z + nz * side);
    ref.current.rotation.y = p.heading;
  });
  return (
    <group ref={ref}>
      <group scale={CAR_SCALE}>
      <Blob size={0.42} />
      <RoundedBox args={[0.72, 0.26, 0.42]} radius={0.1} smoothness={3} position={[0, 0.22, 0]}>
        <meshStandardMaterial color={color} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[0.4, 0.2, 0.36]} radius={0.08} smoothness={3} position={[-0.04, 0.4, 0]}>
        <meshStandardMaterial color="#eef4ff" roughness={0.3} />
      </RoundedBox>
      {[
        [-0.22, 0.2],
        [0.22, 0.2],
        [-0.22, -0.2],
        [0.22, -0.2],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 0.09, z!]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.09, 0.09, 0.06, 10]} />
          <meshStandardMaterial color={INK} roughness={0.8} />
        </mesh>
      ))}
      </group>
    </group>
  );
}

/** How much bigger the cars are than their parts as drawn, so they read clearly from the town view. */
const CAR_SCALE = 1.3;

/** A soft cloud drifting across, wrapping round to the other side. */
export function Cloud({ position, scale, speed, still }: { position: V3; scale: number; speed: number; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || still) return;
    const span = 34;
    ref.current.position.x = ((position[0] + clock.elapsedTime * speed + span / 2) % span) - span / 2;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      {[
        [0, 0, 0, 0.7],
        [0.65, -0.1, 0.1, 0.5],
        [-0.6, -0.12, 0, 0.5],
        [0.25, 0.3, -0.1, 0.45],
      ].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x!, y!, z!]}>
          <sphereGeometry args={[r!, 14, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} />
        </mesh>
      ))}
    </group>
  );
}

/** A hot air balloon bobbing near the edge of town. */
export function Balloon({ position, still }: { position: V3; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current || still) return;
    ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 0.6) * 0.4;
    ref.current.rotation.y = clock.elapsedTime * 0.15;
  });
  const stripes = ["#5aa0e0", "#ffffff", CORAL, "#ffffff", "#f6c945", "#ffffff"];
  return (
    <group ref={ref} position={position}>
      {stripes.map((color, i) => (
        <mesh key={i} rotation={[0, (i * Math.PI * 2) / stripes.length, 0]}>
          <sphereGeometry args={[1, 16, 16, 0, (Math.PI * 2) / stripes.length]} />
          <meshStandardMaterial color={color} roughness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, -1.55, 0]}>
        <boxGeometry args={[0.45, 0.32, 0.45]} />
        <meshStandardMaterial color="#b07a52" roughness={0.9} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, -1.15, 0]}>
          <boxGeometry args={[0.02, 0.6, 0.02]} />
          <meshStandardMaterial color={INK} />
        </mesh>
      ))}
    </group>
  );
}

interface AirplaneProps {
  /** Middle of the loop (x, z) and its size; the loop is level, `height` above the grass. */
  center: [number, number];
  radius: number;
  height: number;
  /** Radians per second round the loop. */
  speed: number;
  still: boolean;
}

/**
 * A little propeller plane with Pipo at the controls, looping round the island and leaning into
 * the turn. A soft shadow follows it on the ground so it reads as flying, not parked.
 */
export function Airplane({ center, radius, height, speed, still }: AirplaneProps) {
  const ref = useRef<THREE.Group>(null);
  const prop = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);
  // It flies over the places, so it must never catch a click meant for them.
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      o.raycast = () => {};
    });
  }, []);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    // Parked on the left of the loop when motion is reduced.
    const t = still ? 0 : clock.elapsedTime;
    const a = still ? 2.4 : t * speed;
    const x = center[0] + Math.cos(a) * radius;
    const z = center[1] + Math.sin(a) * radius;
    g.position.set(x, height + Math.sin(t * 0.9) * 0.25, z);
    // Nose along the loop, banked in toward the middle. (Local +x then points out of the loop,
    // so a positive roll lifts the outer wing; a negative pitch lifts the nose as it bobs up.)
    g.rotation.set(-Math.cos(t * 0.9) * 0.06, -a, 0.35, "YXZ");
    shadow.current?.position.set(x, 0.06, z);
    if (prop.current && !still) prop.current.rotation.z = t * 40;
  });
  const white = "#f6f7fb";
  return (
    <>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.7, 1]} raycast={() => null}>
        <circleGeometry args={[0.75, 20]} />
        <meshBasicMaterial color="#2d2470" transparent opacity={0.14} depthWrite={false} />
      </mesh>
      <group ref={ref} scale={0.8}>
        {/* Body, tapering to the tail */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.26, 0.14, 1.7, 14]} />
          <meshStandardMaterial color={white} roughness={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.18]}>
          <cylinderGeometry args={[0.235, 0.225, 0.16, 14]} />
          <meshStandardMaterial color="#5aa0e0" roughness={0.5} />
        </mesh>
        {/* Nose and propeller */}
        <mesh position={[0, 0, 0.9]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.26, 0.2, 14]} />
          <meshStandardMaterial color={CORAL} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, 1.03]}>
          <sphereGeometry args={[0.08, 10, 8]} />
          <meshStandardMaterial color="#f6c945" />
        </mesh>
        <group ref={prop} position={[0, 0, 1.06]}>
          {[0, Math.PI / 2].map((r) => (
            <mesh key={r} rotation={[0, 0, r]}>
              <boxGeometry args={[0.75, 0.07, 0.02]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          ))}
        </group>
        {/* Wings and tail */}
        <RoundedBox args={[2.4, 0.07, 0.48]} radius={0.03} smoothness={2} position={[0, -0.04, 0.25]}>
          <meshStandardMaterial color={CORAL} roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.9, 0.05, 0.26]} radius={0.02} smoothness={2} position={[0, 0.02, -0.72]}>
          <meshStandardMaterial color={CORAL} roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.05, 0.42, 0.32]} radius={0.02} smoothness={2} position={[0, 0.22, -0.72]}>
          <meshStandardMaterial color="#5aa0e0" roughness={0.5} />
        </RoundedBox>
        {/* Pipo in the open cockpit */}
        <mesh position={[0, 0.27, 0.32]}>
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshStandardMaterial color={ORANGE} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.29, 0.43]} scale={[1, 0.6, 0.5]}>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color={INK} roughness={0.3} />
        </mesh>
        {/* Windscreen */}
        <mesh position={[0, 0.25, 0.52]} rotation={[-0.5, 0, 0]}>
          <boxGeometry args={[0.3, 0.14, 0.02]} />
          <meshStandardMaterial color="#cfe9ff" transparent opacity={0.7} />
        </mesh>
      </group>
    </>
  );
}
