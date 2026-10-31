// The places in Pipodojo Town, in a soft kawaii style: rounded pastel walls, puffy roofs and a
// little face on every building. Each is built facing +z (its front) at its own origin; the town
// turns and moves it into place.
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { BRAND, CORAL, Face, INK, ORANGE, Person, Roof } from "./props.tsx";

const CREAM = "#fff8f0";
const GLASS = "#c7e6ff";
const PINK = "#ffb8d2";
const MINT = "#bff0d8";
const LILAC = "#e6deff";

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

/** Pipodojo, Pipo's home: a two-tier dojo with a glowing spark on top. */
export function Dojo({ still }: { still: boolean }) {
  const spark = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!spark.current || still) return;
    spark.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 2.4) * 0.12);
    spark.current.rotation.y = clock.elapsedTime * 0.8;
  });
  return (
    <group>
      <RoundedBox args={[4.4, 0.4, 4.4]} radius={0.16} smoothness={3} position={[0, 0.2, 0]}>
        <meshStandardMaterial color="#ece7ff" roughness={0.9} />
      </RoundedBox>
      {[0, 1].map((i) => (
        <RoundedBox key={i} args={[1.6, 0.14, 0.36]} radius={0.05} position={[0, 0.07 + i * 0.13, 2.45 - i * 0.18]}>
          <meshStandardMaterial color="#ddd6ff" roughness={0.9} />
        </RoundedBox>
      ))}
      <Walls size={[2.8, 1.4, 2.8]} position={[0, 1.1, 0]} color={CREAM} radius={0.22} />
      {[
        [-1.36, 1.36],
        [1.36, 1.36],
        [-1.36, -1.36],
        [1.36, -1.36],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 1.1, z!]}>
          <cylinderGeometry args={[0.12, 0.12, 1.4, 12]} />
          <meshStandardMaterial color={BRAND[600]} roughness={0.6} />
        </mesh>
      ))}
      <Door position={[0, 0.4, 1.41]} color={CORAL} w={0.8} h={1.0} />
      <Porthole position={[-0.9, 1.3, 1.41]} r={0.2} />
      <Porthole position={[0.9, 1.3, 1.41]} r={0.2} />
      {/* Puffy roofs: soft pyramids with rounded caps on the corners */}
      <mesh position={[0, 2.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.75, 0.8, 4]} />
        <meshStandardMaterial color={BRAND[500]} roughness={0.55} />
      </mesh>
      <Walls size={[1.5, 0.8, 1.5]} position={[0, 2.7, 0]} color={CREAM} radius={0.14} />
      <Face position={[0, 2.72, 0.77]} scale={1.1} blink={!still} />
      <mesh position={[0, 3.4, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.6, 0.75, 4]} />
        <meshStandardMaterial color={PINK} roughness={0.55} />
      </mesh>
      <mesh position={[0, 3.95, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={spark} position={[0, 4.3, 0]}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 4.3, 0]} color={CORAL} intensity={4} distance={6} />
      {/* Gate in front, with round ends */}
      <group position={[0, 0, 3.4]}>
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
        <meshStandardMaterial color="#d3efc8" roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, 1.75]}>
        <boxGeometry args={[0.55, 0.02, 1.3]} />
        <meshStandardMaterial color="#f3e9dd" roughness={1} />
      </mesh>
      <Walls size={[2.5, 1.6, 2.0]} position={[0, 0.82, -0.5]} color="#ffe9dc" />
      <group position={[0, 1.6, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <Roof width={2.5} height={1.0} depth={2.9} color={BRAND[400]} />
      </group>
      <RoundedBox args={[0.3, 0.7, 0.3]} radius={0.08} position={[0.75, 2.2, -0.9]}>
        <meshStandardMaterial color="#f4a3a3" roughness={0.9} />
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
        <group ref={smoke} position={[0, 0.7, 0]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.5} roughness={1} />
            </mesh>
          ))}
        </group>
      </group>
      <Person
        style={{ skin: "#8d5524", hair: "#2b1d16", shirt: "#f59b98", pants: "#3b3a5a", extra: "spatula" }}
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
      <mesh position={[0, 0.02, 0.3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.3, 40]} />
        <meshStandardMaterial color="#d8f0cf" roughness={1} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <RoundedBox key={i} args={[2.4, 0.16, 0.5]} radius={0.05} position={[0, 0.08 + i * 0.12, 1.55 - i * 0.22]}>
          <meshStandardMaterial color="#f1eefc" roughness={0.9} />
        </RoundedBox>
      ))}
      <Walls size={[4.2, 2.0, 2.2]} position={[0, 1.2, -0.4]} color={LILAC} radius={0.2} />
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
      <Walls size={[1.0, 1.3, 1.0]} position={[0, 2.9, -0.6]} color={LILAC} radius={0.14} />
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
        <meshStandardMaterial color={PINK} roughness={0.55} />
      </mesh>
      <mesh position={[1.7, 2.9, -1.2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={flag} position={[1.7, 3.4, -1.2]}>
        <boxGeometry args={[0.02, 0.32, 0.55]} />
        <meshStandardMaterial color={CORAL} roughness={0.6} />
      </mesh>
      <Person
        style={{ skin: "#f1c27d", hair: "#6b3e26", shirt: "#8fb4f7", pants: "#2d2470", extra: "backpack" }}
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
        <meshStandardMaterial color="#f6efff" roughness={1} />
      </RoundedBox>
      <Walls size={[3.2, 1.9, 2.2]} position={[0, 0.95, -0.5]} color="#ffe4ee" />
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
          <meshStandardMaterial color={i % 2 ? "#ffffff" : PINK} roughness={0.7} />
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
        <group ref={steam} position={[0, 0.45, 0]}>
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
            <meshStandardMaterial color={x < 0 ? "#ffd59e" : LILAC} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
      <Person
        style={{ skin: "#e0ac69", hair: "#1f1b2e", shirt: "#a993ff", pants: "#2d2a3e", extra: "apron" }}
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
        <meshStandardMaterial color="#d3efc8" roughness={1} />
      </mesh>
      <Walls size={[2.2, 1.5, 1.9]} position={[-0.3, 0.77, -0.4]} color={MINT} radius={0.24} />
      {/* A big round mushroom-style roof */}
      <mesh position={[-0.3, 1.5, -0.4]} scale={[1.55, 0.85, 1.4]}>
        <sphereGeometry args={[1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PINK} roughness={0.55} />
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
        <meshStandardMaterial color="#ffd59e" roughness={0.8} />
      </RoundedBox>
      <Porthole position={[1.4, 1.78, -0.04]} r={0.13} />
      <mesh ref={star} position={[1.4, 3.25, -0.9]}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#ffd166" emissive="#ffd166" emissiveIntensity={1} toneMapped={false} />
      </mesh>
      {/* The kid, out front with a laptop */}
      <Person
        style={{ skin: "#c68642", hair: "#3b2416", shirt: "#ffcf85", pants: "#8fb4f7", extra: "laptop" }}
        position={[0.7, 0, 1.25]}
        turn={-0.2}
        still={still}
      />
    </group>
  );
}

/** Pipo's garage: where you change how your Pipo looks. */
export function Garage({ still }: { still: boolean }) {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshStandardMaterial color="#ece7ff" roughness={1} />
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
