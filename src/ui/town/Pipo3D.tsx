// Your Pipo in 3D, built from the same head, body and colours you picked in the garage.
// It floats around the dojo, and flies over to whichever place you point at.
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { paletteOf, type PipoLook } from "../../game/pipoLook.ts";
import { INK, ORANGE } from "./props.tsx";

const EYE = "#9cf3ff";

interface Props {
  look: PipoLook;
  /** Where Pipo should be heading (it drifts round the dojo when null). */
  target: THREE.Vector3 | null;
  still: boolean;
}

export function Pipo3D({ look, target, still }: Props) {
  const ref = useRef<THREE.Group>(null);
  const flame = useRef<THREE.Mesh>(null);
  const wheel = useRef<THREE.Mesh>(null);
  const goal = useRef(new THREE.Vector3());
  const shadow = useRef<THREE.Mesh>(null);
  const { shell, accent } = paletteOf(look.color);
  const [light, mid, dark] = shell;

  useFrame(({ clock }, delta) => {
    const pipo = ref.current;
    if (!pipo) return;
    const t = clock.elapsedTime;
    if (target) goal.current.copy(target);
    else if (still) goal.current.set(2.6, 3.6, 2.6);
    else goal.current.set(Math.cos(t * 0.35) * 3.2, 3.6 + Math.sin(t * 1.4) * 0.2, Math.sin(t * 0.35) * 3.2);

    const before = pipo.position.clone();
    pipo.position.lerp(goal.current, still ? 1 : Math.min(1, delta * 2.2));
    // Face where it's going, and lean into it a little.
    const move = pipo.position.clone().sub(before);
    if (!still && move.lengthSq() > 1e-6) {
      const heading = Math.atan2(move.x, move.z);
      pipo.rotation.y += Math.atan2(Math.sin(heading - pipo.rotation.y), Math.cos(heading - pipo.rotation.y)) * Math.min(1, delta * 4);
    } else if (target) {
      // Arrived: turn to face the camera.
      pipo.rotation.y += (0.6 - pipo.rotation.y) * Math.min(1, delta * 3);
    }
    pipo.rotation.z = still ? 0 : Math.sin(t * 2) * 0.06;
    // Its soft shadow stays on the ground under it, smaller the higher it flies.
    if (shadow.current) {
      shadow.current.position.set(pipo.position.x, 0.08, pipo.position.z);
      shadow.current.scale.setScalar(Math.max(0.4, 1.3 - pipo.position.y * 0.12));
    }
    if (flame.current) flame.current.scale.y = still ? 1 : 0.8 + Math.sin(t * 30) * 0.2;
    if (wheel.current && !still) wheel.current.rotation.x += delta * 6;
  });

  return (
    <>
    <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} position={[0, -50, 0]} raycast={() => null}>
      <circleGeometry args={[0.5, 20]} />
      <meshBasicMaterial color="#2d2470" transparent opacity={0.16} depthWrite={false} />
    </mesh>
    <group ref={ref} position={still ? [2.6, 3.6, 2.6] : [-18, 9, 8]}>
      <group scale={1.3}>
        {/* Body */}
        {look.body === "rocket" ? (
          <>
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.34, 0.24, 0.6, 20]} />
              <meshStandardMaterial color={mid} roughness={0.4} />
            </mesh>
            <mesh ref={flame} position={[0, -0.5, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.16, 0.42, 12]} />
              <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.4} toneMapped={false} />
            </mesh>
          </>
        ) : (
          <mesh scale={[1, 0.85, 1]}>
            <sphereGeometry args={[0.38, 24, 24]} />
            <meshStandardMaterial color={mid} roughness={0.4} />
          </mesh>
        )}
        {look.body === "hover" && (
          <mesh position={[0, -0.42, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.26, 0.04, 8, 24]} />
            <meshStandardMaterial color={EYE} emissive={EYE} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        )}
        {look.body === "wheels" && (
          <mesh ref={wheel} position={[0, -0.42, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.16, 18]} />
            <meshStandardMaterial color={INK} roughness={0.7} />
          </mesh>
        )}
        {/* Glowing core */}
        <mesh position={[0, 0, 0.33]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={light} emissive={light} emissiveIntensity={1.5} toneMapped={false} />
        </mesh>
        {/* Arms */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.42, 0.02, 0]} rotation={[0, 0, side * 0.5]}>
            <capsuleGeometry args={[0.06, 0.18, 4, 8]} />
            <meshStandardMaterial color={accent} roughness={0.5} />
          </mesh>
        ))}

        {/* Head */}
        <group position={[0, 0.62, 0]}>
          {look.head === "boxy" ? (
            <RoundedBox args={[0.78, 0.6, 0.64]} radius={0.08} smoothness={3}>
              <meshStandardMaterial color={light} roughness={0.4} />
            </RoundedBox>
          ) : (
            <mesh scale={look.head === "dome" ? [1, 1, 1] : [1.12, 0.9, 1]}>
              <sphereGeometry args={[0.38, 24, 24]} />
              <meshStandardMaterial color={light} roughness={0.4} />
            </mesh>
          )}
          {look.head === "dome" && (
            <mesh position={[0, 0.08, 0]}>
              <sphereGeometry args={[0.46, 24, 24]} />
              <meshStandardMaterial color="#dff3ff" roughness={0.05} transparent opacity={0.28} />
            </mesh>
          )}
          {look.head === "classic" &&
            [-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.11, 0.11, 0.1, 16]} />
                <meshStandardMaterial color={accent} roughness={0.5} />
              </mesh>
            ))}
          {look.head === "boxy" &&
            [-1, 1].map((side) => (
              <mesh key={side} position={[side * 0.41, 0.12, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.05, 0.05, 0.06, 8]} />
                <meshStandardMaterial color={dark} roughness={0.5} />
              </mesh>
            ))}
          {/* Antenna */}
          <mesh position={[0, 0.44, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.2, 6]} />
            <meshStandardMaterial color={accent} />
          </mesh>
          <mesh position={[0, 0.57, 0]}>
            <sphereGeometry args={[0.06, 10, 10]} />
            <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={0.8} />
          </mesh>
          {/* Visor and eyes */}
          <RoundedBox args={[0.56, 0.28, 0.08]} radius={0.06} smoothness={3} position={[0, 0, look.head === "boxy" ? 0.31 : 0.33]}>
            <meshStandardMaterial color="#1b1640" roughness={0.2} />
          </RoundedBox>
          {[-0.12, 0.12].map((x) => (
            <mesh key={x} position={[x, 0.01, look.head === "boxy" ? 0.36 : 0.38]} scale={[1, 1.3, 0.5]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color={EYE} emissive={EYE} emissiveIntensity={1.6} toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
    </>
  );
}
