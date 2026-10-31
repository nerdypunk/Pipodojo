// The places in Pipodojo Town. Each is built facing +z (its front) at its own origin;
// the town turns and moves it into place.
import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { BRAND, INK, ORANGE, Person, Roof } from "./props.tsx";

const WALL = "#fbf8ff";
const GLASS = "#bfe0ff";

function Window({ position, w = 0.36, h = 0.4 }: { position: [number, number, number]; w?: number; h?: number }) {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.04]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0, 0.025]}>
        <boxGeometry args={[w, h, 0.02]} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.15} roughness={0.15} />
      </mesh>
    </group>
  );
}

/** Pipodojo, Pipo's home: a two-tier dojo with a glowing spark on top. */
export function Dojo({ still }: { still: boolean }) {
  const spark = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!spark.current || still) return;
    const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
    spark.current.scale.setScalar(s);
    spark.current.rotation.y = clock.elapsedTime * 0.8;
  });
  return (
    <group>
      {/* Stone base and steps */}
      <RoundedBox args={[4.4, 0.4, 4.4]} radius={0.12} position={[0, 0.2, 0]}>
        <meshStandardMaterial color="#e7e3ff" roughness={0.9} />
      </RoundedBox>
      {[0, 1].map((i) => (
        <mesh key={i} position={[0, 0.07 + i * 0.13, 2.45 - i * 0.18]}>
          <boxGeometry args={[1.6, 0.14, 0.36]} />
          <meshStandardMaterial color="#d9d4ff" roughness={0.9} />
        </mesh>
      ))}
      {/* Ground floor */}
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[2.8, 1.4, 2.8]} />
        <meshStandardMaterial color={WALL} roughness={0.8} />
      </mesh>
      {/* Wooden posts on the corners */}
      {[
        [-1.42, 1.42],
        [1.42, 1.42],
        [-1.42, -1.42],
        [1.42, -1.42],
      ].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x!, 1.1, z!]}>
          <boxGeometry args={[0.16, 1.4, 0.16]} />
          <meshStandardMaterial color={BRAND[700]} roughness={0.7} />
        </mesh>
      ))}
      {/* Big round door */}
      <mesh position={[0, 0.95, 1.41]}>
        <cylinderGeometry args={[0.45, 0.45, 0.04, 24, 1, false, 0, Math.PI]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.72, 1.42]}>
        <boxGeometry args={[0.9, 0.5, 0.03]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      <Window position={[-0.9, 1.25, 1.41]} />
      <Window position={[0.9, 1.25, 1.41]} />
      {/* Lower roof */}
      <mesh position={[0, 2.15, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[2.75, 0.8, 4]} />
        <meshStandardMaterial color={BRAND[600]} roughness={0.6} flatShading />
      </mesh>
      {/* Upper floor and roof */}
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[1.5, 0.8, 1.5]} />
        <meshStandardMaterial color={WALL} roughness={0.8} />
      </mesh>
      <Window position={[0, 2.72, 0.76]} w={0.5} h={0.3} />
      <mesh position={[0, 3.4, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.6, 0.75, 4]} />
        <meshStandardMaterial color={BRAND[500]} roughness={0.6} flatShading />
      </mesh>
      {/* The spark */}
      <mesh position={[0, 3.95, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.4, 6]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={spark} position={[0, 4.3, 0]}>
        <octahedronGeometry args={[0.24, 0]} />
        <meshStandardMaterial color={ORANGE} emissive={ORANGE} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 4.3, 0]} color={ORANGE} intensity={4} distance={6} />
      {/* A gate in front */}
      <group position={[0, 0, 3.4]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.9, 0.8, 0]}>
            <cylinderGeometry args={[0.09, 0.1, 1.6, 10]} />
            <meshStandardMaterial color={ORANGE} roughness={0.6} />
          </mesh>
        ))}
        <mesh position={[0, 1.62, 0]}>
          <boxGeometry args={[2.3, 0.14, 0.2]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.36, 0]}>
          <boxGeometry args={[1.9, 0.09, 0.14]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
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
      {/* Lawn patch and path */}
      <mesh position={[0, 0.02, 0.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.9, 40]} />
        <meshStandardMaterial color="#a6e3a1" roughness={1} />
      </mesh>
      <mesh position={[0, 0.03, 2.3]}>
        <boxGeometry args={[0.6, 0.02, 1.6]} />
        <meshStandardMaterial color="#efe7dc" roughness={1} />
      </mesh>
      {/* House */}
      <mesh position={[0, 0.85, -0.5]}>
        <boxGeometry args={[2.6, 1.7, 2.1]} />
        <meshStandardMaterial color="#fff6ea" roughness={0.8} />
      </mesh>
      <group position={[0, 1.7, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <Roof width={2.6} height={1.05} depth={3.0} color={BRAND[500]} />
      </group>
      <mesh position={[0.8, 2.3, -0.9]}>
        <boxGeometry args={[0.3, 0.7, 0.3]} />
        <meshStandardMaterial color="#d28a6a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.55, 0.56]}>
        <boxGeometry args={[0.5, 1.0, 0.04]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      <Window position={[-0.75, 1.0, 0.56]} />
      <Window position={[0.75, 1.0, 0.56]} />
      {/* Barbecue grill with smoke */}
      <group position={[1.35, 0, 1.55]}>
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
        style={{ skin: "#8d5524", hair: "#2b1d16", shirt: "#ef6f6c", pants: "#3b3a5a", extra: "spatula" }}
        position={[0.65, 0, 1.75]}
        turn={0.5}
        still={still}
      />
      {/* Picket fence along the front */}
      {Array.from({ length: 9 }, (_, i) => -2 + i * 0.5)
        .filter((x) => Math.abs(x) > 0.4)
        .map((x) => (
          <mesh key={x} position={[x, 0.22, 2.75]}>
            <boxGeometry args={[0.1, 0.44, 0.06]} />
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
        <meshStandardMaterial color="#cfe9c8" roughness={1} />
      </mesh>
      {/* Steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.08 + i * 0.12, 1.55 - i * 0.22]}>
          <boxGeometry args={[2.4, 0.16, 0.5]} />
          <meshStandardMaterial color="#eceaf6" roughness={0.9} />
        </mesh>
      ))}
      {/* Main hall */}
      <mesh position={[0, 1.2, -0.4]}>
        <boxGeometry args={[4.2, 2.0, 2.2]} />
        <meshStandardMaterial color="#eef0ff" roughness={0.8} />
      </mesh>
      {/* Columns and portico */}
      {[-1.05, -0.35, 0.35, 1.05].map((x) => (
        <mesh key={x} position={[x, 1.25, 1.0]}>
          <cylinderGeometry args={[0.13, 0.15, 1.7, 14]} />
          <meshStandardMaterial color="#ffffff" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 2.18, 0.55]}>
        <boxGeometry args={[2.7, 0.18, 1.3]} />
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      <Roof width={2.8} height={0.6} depth={1.3} color={BRAND[400]} position={[0, 2.27, 0.55]} />
      <mesh position={[0, 2.25, -0.4]}>
        <boxGeometry args={[4.4, 0.12, 2.4]} />
        <meshStandardMaterial color={BRAND[600]} roughness={0.7} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <Window key={x} position={[x, 1.2, 0.71]} w={0.5} h={0.7} />
      ))}
      {/* Clock tower */}
      <mesh position={[0, 2.9, -0.6]}>
        <boxGeometry args={[1.0, 1.3, 1.0]} />
        <meshStandardMaterial color="#eef0ff" roughness={0.8} />
      </mesh>
      <mesh position={[0, 3.0, -0.09]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.04, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 3.05, -0.06]} rotation={[0, 0, 0.6]}>
        <boxGeometry args={[0.04, 0.22, 0.02]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh position={[0, 3.85, -0.6]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[0.85, 0.8, 4]} />
        <meshStandardMaterial color={BRAND[500]} roughness={0.6} flatShading />
      </mesh>
      {/* Flag */}
      <mesh position={[1.7, 2.9, -1.2]}>
        <cylinderGeometry args={[0.03, 0.03, 1.4, 6]} />
        <meshStandardMaterial color={INK} />
      </mesh>
      <mesh ref={flag} position={[1.7, 3.4, -1.2]}>
        <boxGeometry args={[0.02, 0.32, 0.55]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      <Person
        style={{ skin: "#f1c27d", hair: "#6b3e26", shirt: "#4f8ef7", pants: "#2d2470", extra: "backpack" }}
        position={[0.9, 0.36, 1.65]}
        turn={0.3}
        still={still}
      />
    </group>
  );
}

/** The café, with a striped awning, a big cup on the roof and tables outside. */
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
      <mesh position={[0, 0.02, 0.6]}>
        <boxGeometry args={[4.4, 0.04, 3.6]} />
        <meshStandardMaterial color="#f3ecff" roughness={1} />
      </mesh>
      <mesh position={[0, 0.95, -0.5]}>
        <boxGeometry args={[3.2, 1.9, 2.2]} />
        <meshStandardMaterial color="#fff1f2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.95, -0.5]}>
        <boxGeometry args={[3.4, 0.14, 2.4]} />
        <meshStandardMaterial color={BRAND[700]} roughness={0.7} />
      </mesh>
      {/* Shop window and door */}
      <mesh position={[-0.55, 0.85, 0.61]}>
        <boxGeometry args={[1.5, 0.9, 0.04]} />
        <meshStandardMaterial color={GLASS} emissive="#ffd8a8" emissiveIntensity={0.25} roughness={0.15} />
      </mesh>
      <mesh position={[0.9, 0.6, 0.61]}>
        <boxGeometry args={[0.55, 1.15, 0.04]} />
        <meshStandardMaterial color={BRAND[600]} roughness={0.6} />
      </mesh>
      {/* Striped awning */}
      {Array.from({ length: stripes }, (_, i) => (
        <mesh key={i} position={[-1.4 + (i + 0.5) * (2.8 / stripes) + 0.0, 1.55, 0.85]} rotation={[0.55, 0, 0]}>
          <boxGeometry args={[2.8 / stripes, 0.05, 0.65]} />
          <meshStandardMaterial color={i % 2 ? "#ffffff" : BRAND[500]} roughness={0.7} />
        </mesh>
      ))}
      {/* Big cup on the roof */}
      <group position={[0, 2.35, -0.5]}>
        <mesh>
          <cylinderGeometry args={[0.42, 0.32, 0.7, 20]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.03, 20]} />
          <meshStandardMaterial color="#7a4a2e" roughness={0.6} />
        </mesh>
        <mesh position={[0.45, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.15, 0.05, 8, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.05, 0.36]} rotation={[0.1, 0, 0]}>
          <boxGeometry args={[0.5, 0.18, 0.02]} />
          <meshStandardMaterial color={ORANGE} />
        </mesh>
        <group ref={steam} position={[0, 0.45, 0]}>
          {[-0.1, 0.12].map((x) => (
            <mesh key={x} position={[x, 0, 0]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#ffffff" transparent opacity={0.6} />
            </mesh>
          ))}
        </group>
      </group>
      {/* Tables with umbrellas */}
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
          <mesh position={[0, 1.2, 0]}>
            <coneGeometry args={[0.6, 0.3, 8]} />
            <meshStandardMaterial color={x < 0 ? ORANGE : BRAND[400]} roughness={0.7} flatShading />
          </mesh>
        </group>
      ))}
      <Person
        style={{ skin: "#e0ac69", hair: "#1f1b2e", shirt: "#7c5cff", pants: "#2d2a3e", extra: "apron" }}
        position={[0.1, 0, 1.35]}
        turn={-0.3}
        still={still}
      />
    </group>
  );
}

/** A lot under construction: someone new is moving in soon. */
export function Lot({ still }: { still: boolean }) {
  const arm = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (arm.current && !still) arm.current.rotation.y = Math.sin(clock.elapsedTime * 0.4) * 0.6;
  });
  return (
    <group>
      <mesh position={[0, 0.03, 0]}>
        <boxGeometry args={[3.6, 0.06, 3.4]} />
        <meshStandardMaterial color="#e9dcc7" roughness={1} />
      </mesh>
      {/* Scaffolding */}
      {[-1, 0, 1].flatMap((x) =>
        [-0.8, 0.8].map((z) => (
          <mesh key={`${x}${z}`} position={[x * 0.9, 0.9, z]}>
            <boxGeometry args={[0.06, 1.8, 0.06]} />
            <meshStandardMaterial color="#c9c3e6" />
          </mesh>
        )),
      )}
      {[0.6, 1.2, 1.8].map((y) => (
        <mesh key={y} position={[0, y, 0.8]}>
          <boxGeometry args={[1.9, 0.06, 0.06]} />
          <meshStandardMaterial color="#c9c3e6" />
        </mesh>
      ))}
      <mesh position={[0, 0.4, -0.3]}>
        <boxGeometry args={[1.6, 0.8, 1.0]} />
        <meshStandardMaterial color="#f4f1fb" roughness={0.9} />
      </mesh>
      {/* Crane */}
      <mesh position={[1.4, 1.6, -1.2]}>
        <boxGeometry args={[0.18, 3.2, 0.18]} />
        <meshStandardMaterial color={ORANGE} roughness={0.6} />
      </mesh>
      <group ref={arm} position={[1.4, 3.2, -1.2]}>
        <mesh position={[-0.9, 0, 0]}>
          <boxGeometry args={[2.4, 0.14, 0.14]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
        <mesh position={[-1.8, -0.6, 0]}>
          <boxGeometry args={[0.02, 1.2, 0.02]} />
          <meshStandardMaterial color={INK} />
        </mesh>
        <mesh position={[-1.8, -1.25, 0]}>
          <boxGeometry args={[0.35, 0.18, 0.35]} />
          <meshStandardMaterial color={BRAND[400]} />
        </mesh>
      </group>
      {/* Cones */}
      {[-1.4, -0.5, 0.4].map((x) => (
        <mesh key={x} position={[x, 0.18, 1.45]}>
          <coneGeometry args={[0.12, 0.3, 10]} />
          <meshStandardMaterial color={ORANGE} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Pipo's garage: where you change how your Pipo looks. */
export function Garage() {
  return (
    <group>
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.6, 32]} />
        <meshStandardMaterial color="#e7e3ff" roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.15, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.06, 8, 32]} />
        <meshStandardMaterial color={BRAND[500]} />
      </mesh>
      {/* Garage door */}
      <mesh position={[0, 0.42, 1.0]}>
        <boxGeometry args={[0.9, 0.84, 0.3]} />
        <meshStandardMaterial color={BRAND[600]} roughness={0.6} />
      </mesh>
      {[0.2, 0.4, 0.6].map((y) => (
        <mesh key={y} position={[0, y, 1.16]}>
          <boxGeometry args={[0.86, 0.03, 0.02]} />
          <meshStandardMaterial color={BRAND[400]} />
        </mesh>
      ))}
      {/* A spanner on top */}
      <group position={[0, 1.35, 0]} rotation={[0, 0, 0.6]}>
        <mesh>
          <boxGeometry args={[0.12, 0.6, 0.08]} />
          <meshStandardMaterial color={ORANGE} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.34, 0]}>
          <torusGeometry args={[0.12, 0.05, 8, 16, Math.PI * 1.5]} />
          <meshStandardMaterial color={ORANGE} roughness={0.5} />
        </mesh>
      </group>
    </group>
  );
}
