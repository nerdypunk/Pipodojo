// Small building blocks for Pipodojo Town: roofs, trees, people, cars, clouds and a balloon.
// Everything is made of simple shapes in a soft toy style; nothing is loaded from outside.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { RING, ringPoint } from "../../game/townLayout.ts";

type V3 = [number, number, number];

export const INK = "#26233a";
export const BRAND = { 300: "#b2a9ff", 400: "#8c7dfb", 500: "#6e5cf2", 600: "#5a46e0", 700: "#4936bd", 900: "#2d2470" };
export const ORANGE = "#ff7a1a";
export const LEAF = ["#7fd38a", "#5fbf74", "#9be0a0", "#4fae6a"];

/** A gable roof: a triangle pushed out along z. Width and depth include the overhang. */
export function Roof({ width, height, depth, color, position }: { width: number; height: number; depth: number; color: string; position?: V3 }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, 0);
    shape.lineTo(width / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
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

export interface PersonStyle {
  skin: string;
  hair: string;
  shirt: string;
  pants: string;
  /** Something extra they carry or wear. */
  extra?: "apron" | "backpack" | "spatula";
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
            <meshStandardMaterial color={INK} />
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
    // Keep to the outer lane.
    const side = 0.24;
    const alongX = Math.abs(Math.abs(p.z) - RING.half) < 1e-6;
    const nx = alongX ? 0 : Math.sign(p.x);
    const nz = alongX ? Math.sign(p.z) : 0;
    ref.current.position.set(p.x + nx * side, 0, p.z + nz * side);
    ref.current.rotation.y = p.heading;
  });
  return (
    <group ref={ref}>
      <Blob size={0.42} />
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[0.7, 0.24, 0.4]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      <mesh position={[-0.04, 0.38, 0]}>
        <boxGeometry args={[0.38, 0.18, 0.36]} />
        <meshStandardMaterial color="#e8f1ff" roughness={0.2} metalness={0.1} />
      </mesh>
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
  );
}

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
  const stripes = [BRAND[500], "#ffffff", ORANGE, "#ffffff", BRAND[400], "#ffffff"];
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
