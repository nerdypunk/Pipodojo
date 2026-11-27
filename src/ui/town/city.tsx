// The grown-ups' town: Pipodojo after dark. The same streets and places as the kids' island, drawn
// as a city block at night on a square base: dark slate buildings with lit windows, magenta and
// cyan neon signs, street lamps throwing colored light, and fireflies round the sakura.
// Neon glow is faked without post-processing: bright unlit materials, plus soft additive sprites
// (halos) and light pools on the ground, so it stays cheap on phones.
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { cityBlocks, POND, RING, SPOKE_END, seeded } from "../../game/townLayout.ts";
import { NIGHT } from "./night.ts";
import { DYNAMIC, Static } from "./Static.tsx";

type V3 = [number, number, number];
const noRaycast = () => null;

/** Half the square base's side. The island's roads end at SPOKE_END, inside it. */
export const CITY_HALF = 13.2;

// ---------- glow helpers ----------

let glowMap: THREE.CanvasTexture | null = null;
/** A soft white dot fading to clear, tinted by each material's color. Made once. */
function glowTexture(): THREE.CanvasTexture {
  if (glowMap) return glowMap;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glowMap = new THREE.CanvasTexture(canvas);
  glowMap.colorSpace = THREE.SRGBColorSpace;
  return glowMap;
}

/** A halo that always faces the camera: the glow round a lamp or a sign. */
export function Glow({ position, color, size, opacity = 0.7 }: { position: V3; color: string; size: number; opacity?: number }) {
  const map = useMemo(glowTexture, []);
  return (
    <sprite position={position} scale={[size, size, 1]} raycast={noRaycast} renderOrder={2}>
      <spriteMaterial map={map} color={color} opacity={opacity} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
  );
}

/** Colored light spilling on the ground under a lamp or in front of a lit shop. */
function Pool({ position, color, size, opacity = 0.45 }: { position: V3; color: string; size: number; opacity?: number }) {
  const map = useMemo(glowTexture, []);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={map} color={color} opacity={opacity} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  );
}

const signs = new Map<string, { map: THREE.CanvasTexture; aspect: number }>();
/** A neon word drawn on a canvas: a hot white core inside a colored glow. Cached per word and color. */
function signTexture(text: string, color: string, vertical: boolean) {
  const key = `${text}|${color}|${vertical}`;
  const cached = signs.get(key);
  if (cached) return cached;
  const px = 96;
  const pad = 36;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `900 ${px}px "Nunito Variable", "Nunito", system-ui, sans-serif`;
  ctx.font = font;
  const letters = [...text];
  if (vertical) {
    canvas.width = px + pad * 2;
    canvas.height = letters.length * px * 0.98 + pad * 2;
  } else {
    canvas.width = Math.ceil(ctx.measureText(text).width + pad * 2);
    canvas.height = px + pad * 2;
  }
  ctx.font = font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const draw = () => {
    if (vertical) letters.forEach((l, i) => ctx.fillText(l, canvas.width / 2, pad + px * 0.98 * (i + 0.5)));
    else ctx.fillText(text, canvas.width / 2, canvas.height / 2 + px * 0.04);
  };
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.shadowBlur = 34;
  draw();
  ctx.shadowBlur = 16;
  draw();
  ctx.shadowBlur = 3;
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  draw();
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const entry = { map, aspect: canvas.width / canvas.height };
  signs.set(key, entry);
  return entry;
}

/** A neon sign: the word on a dark board, with a halo behind it. `size` is its height. */
function NeonSign({ text, color, position, rotation = [0, 0, 0], size, vertical = false, board = true }: { text: string; color: string; position: V3; rotation?: V3; size: number; vertical?: boolean; board?: boolean }) {
  const { map, aspect } = useMemo(() => signTexture(text, color, vertical), [text, color, vertical]);
  const w = size * aspect;
  return (
    <group position={position} rotation={rotation}>
      {board && (
        <mesh position={[0, 0, -0.03]}>
          <boxGeometry args={[w * 0.92, size * 0.86, 0.05]} />
          <meshStandardMaterial color="#2a2858" roughness={0.6} />
        </mesh>
      )}
      <mesh raycast={noRaycast} renderOrder={3}>
        <planeGeometry args={[w, size]} />
        <meshBasicMaterial map={map} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <Glow position={[0, 0, 0.1]} color={color} size={Math.max(w, size) * 1.5} opacity={0.35} />
    </group>
  );
}

/** A bright tube of neon (a thin box that ignores the lighting). */
function Neon({ size, position, color }: { size: V3; position: V3; color: string }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Box({ size, position, color = NIGHT.wall, rough = 0.85 }: { size: V3; position: V3; color?: string; rough?: number }) {
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={rough} />
    </mesh>
  );
}

/** A low wall round a flat roof, as on the reference's rooftops. */
function Parapet({ w, d, y, color = NIGHT.trim }: { w: number; d: number; y: number; color?: string }) {
  const t = 0.1;
  const h = 0.16;
  return (
    <group position={[0, y + h / 2, 0]}>
      <Box size={[w, h, t]} position={[0, 0, d / 2 - t / 2]} color={color} />
      <Box size={[w, h, t]} position={[0, 0, -d / 2 + t / 2]} color={color} />
      <Box size={[t, h, d - 2 * t]} position={[w / 2 - t / 2, 0, 0]} color={color} />
      <Box size={[t, h, d - 2 * t]} position={[-w / 2 + t / 2, 0, 0]} color={color} />
    </group>
  );
}

const LIT = [NIGHT.window, NIGHT.window, NIGHT.window, "#ffd6f5", "#d4fbff", NIGHT.warm];

/**
 * A grid of windows on one face. `at` is the middle of the face, `turn` faces it (0 = +z, PI/2 = +x).
 * Some are lit, some dark, the same every visit (`seed`). Lit ones ignore the lighting, so they glow.
 */
function Windows({ at, turn = 0, w, h, cols, rows, pane = [0.26, 0.32], seed, lit = 0.6 }: { at: V3; turn?: number; w: number; h: number; cols: number; rows: number; pane?: [number, number]; seed: number; lit?: number }) {
  const panes = useMemo(() => {
    const rand = seeded(seed);
    const out: { x: number; y: number; color: string | null }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const on = rand() < lit;
        const pick = Math.floor(rand() * LIT.length);
        out.push({ x: ((c + 0.5) / cols - 0.5) * w, y: ((r + 0.5) / rows - 0.5) * h, color: on ? LIT[pick]! : null });
      }
    }
    return out;
  }, [seed, rows, cols, w, h, lit]);
  return (
    <group position={at} rotation={[0, turn, 0]}>
      {panes.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, 0.02]}>
          <boxGeometry args={[pane[0], pane[1], 0.04]} />
          {p.color ? <meshBasicMaterial color={p.color} toneMapped={false} /> : <meshStandardMaterial color={NIGHT.windowOff} roughness={0.3} />}
        </mesh>
      ))}
    </group>
  );
}

/** A rooftop air-conditioning box with a fan grille. */
function AirCon({ position }: { position: V3 }) {
  return (
    <group position={position}>
      <Box size={[0.42, 0.3, 0.36]} position={[0, 0.15, 0]} color="#5a5d92" />
      <mesh position={[0, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 14]} />
        <meshStandardMaterial color="#2a2b52" />
      </mesh>
    </group>
  );
}

// ---------- the places ----------

/** The busy executive's office tower: the tallest thing in town, with a vertical PIPO sign. */
export function ExecTower({ still }: { still: boolean }) {
  const beacon = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!beacon.current || still) return;
    (beacon.current.material as THREE.MeshBasicMaterial).color.set(Math.sin(clock.elapsedTime * 3) > 0.3 ? "#ff5b6b" : "#4a1020");
  });
  const H = 4.6;
  return (
    <group>
      {/* Lobby, glowing cyan */}
      <Box size={[2.7, 0.95, 2.5]} position={[0, 0.475, 0]} color={NIGHT.wallDark} />
      <Neon size={[2.1, 0.62, 0.03]} position={[0, 0.42, 1.26]} color="#7ff6ff" />
      {[-0.7, 0, 0.7].map((x) => (
        <Box key={x} size={[0.05, 0.62, 0.05]} position={[x, 0.42, 1.29]} color={NIGHT.wallDark} />
      ))}
      <Box size={[2.9, 0.08, 2.7]} position={[0, 0.98, 0]} color={NIGHT.trim} />
      {/* The tower */}
      <Box size={[2.2, H, 2.1]} position={[0, 0.95 + H / 2, 0]} color={NIGHT.wall} />
      <Windows at={[0.08, 0.95 + H / 2, 1.05]} w={1.75} h={H - 0.5} cols={4} rows={7} seed={3} lit={0.55} />
      <Windows at={[1.1, 0.95 + H / 2, 0]} turn={Math.PI / 2} w={1.7} h={H - 0.5} cols={4} rows={7} seed={4} lit={0.5} />
      <Parapet w={2.2} d={2.1} y={0.95 + H} />
      <Neon size={[2.24, 0.04, 0.04]} position={[0, 0.95 + H - 0.02, 1.07]} color={NIGHT.cyan} />
      <Neon size={[0.04, 0.04, 2.14]} position={[1.12, 0.95 + H - 0.02, 0]} color={NIGHT.cyan} />
      {/* The vertical sign on the front corner */}
      <NeonSign text="PIPO" color={NIGHT.magenta} position={[-1.02, 3.2, 1.2]} size={2.3} vertical />
      {/* Roof: air con, a vent and a blinking beacon */}
      <AirCon position={[0.4, 0.95 + H, -0.3]} />
      <AirCon position={[-0.4, 0.95 + H, -0.4]} />
      <mesh position={[0.55, 0.95 + H + 0.5, 0.55]}>
        <cylinderGeometry args={[0.025, 0.035, 1, 6]} />
        <meshStandardMaterial color="#7d80b8" />
      </mesh>
      <group userData={DYNAMIC}>
        <mesh ref={beacon} position={[0.55, 0.95 + H + 1.04, 0.55]}>
          <sphereGeometry args={[0.07, 10, 8]} />
          <meshBasicMaterial color="#ff5b6b" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
}

/** The founder's coworking loft: a converted warehouse with big windows and a LAUNCH billboard. */
export function FounderLoft() {
  const H = 3.0;
  return (
    <group>
      <Box size={[3.0, H, 2.3]} position={[0, H / 2, 0]} color="#8a78c4" />
      <Box size={[3.1, 0.12, 2.4]} position={[0, 1.5, 0]} color="#9c8bd2" />
      {/* Big factory windows */}
      <Windows at={[0, 0.78, 1.15]} w={2.4} h={0.8} cols={3} rows={1} pane={[0.68, 0.62]} seed={11} lit={1} />
      <Windows at={[0, 2.25, 1.15]} w={2.4} h={0.8} cols={3} rows={1} pane={[0.68, 0.62]} seed={12} lit={0.7} />
      <Windows at={[1.5, H / 2, 0]} turn={Math.PI / 2} w={1.8} h={2.2} cols={2} rows={2} pane={[0.6, 0.55]} seed={13} lit={0.6} />
      <Parapet w={3.0} d={2.3} y={H} color="#9c8bd2" />
      {/* Billboard on the roof */}
      <group position={[-0.3, H, -0.55]}>
        {[-0.8, 0.8].map((x) => (
          <Box key={x} size={[0.06, 0.6, 0.06]} position={[x, 0.3, 0]} color="#6c6fa8" />
        ))}
        <NeonSign text="LAUNCH" color={NIGHT.magenta} position={[0, 0.95, 0.04]} size={0.62} />
      </group>
      {/* String lights over the roof terrace */}
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0.35 + i * 0.16, H + 0.42 - Math.sin((i / 6) * Math.PI) * 0.12, 0.5]}>
          <sphereGeometry args={[0.035, 6, 5]} />
          <meshBasicMaterial color={NIGHT.warm} toneMapped={false} />
        </mesh>
      ))}
      <AirCon position={[1.0, H, -0.6]} />
      {/* The door and a small cyan sign beside it */}
      <Neon size={[0.5, 0.75, 0.03]} position={[1.1, 0.4, 1.16]} color="#ffc9f2" />
      <NeonSign text="LOFT" color={NIGHT.cyan} position={[-1.05, 1.95, 1.2]} size={0.36} />
      <Pool position={[0.2, 0.06, 1.9]} color={NIGHT.magenta} size={3} opacity={0.35} />
    </group>
  );
}

/** The café, open late: a cyan-lit shopfront under a magenta CAFÉ sign. */
export function NightCafe() {
  return (
    <group>
      <Box size={[2.8, 2.4, 2.2]} position={[0, 1.2, 0]} color={NIGHT.wall} />
      {/* Shopfront glass */}
      <Neon size={[2.2, 0.85, 0.03]} position={[0.15, 0.55, 1.11]} color="#8ff7ff" />
      {[-0.6, 0.1, 0.8].map((x) => (
        <Box key={x} size={[0.05, 0.85, 0.06]} position={[x, 0.55, 1.13]} color={NIGHT.wallDark} />
      ))}
      {/* Striped awning */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-0.95 + i * 0.4 + 0.2, 1.12, 1.3]} rotation={[0.45, 0, 0]}>
          <boxGeometry args={[0.4, 0.04, 0.5]} />
          <meshStandardMaterial color={i % 2 ? "#e9e6ff" : "#c04fb0"} roughness={0.7} />
        </mesh>
      ))}
      <Windows at={[0, 1.85, 1.1]} w={2.2} h={0.5} cols={3} rows={1} pane={[0.42, 0.4]} seed={21} lit={0.8} />
      <Windows at={[1.4, 1.3, 0]} turn={Math.PI / 2} w={1.6} h={1.5} cols={2} rows={2} seed={22} lit={0.5} />
      <Parapet w={2.8} d={2.2} y={2.4} />
      <NeonSign text="CAFÉ" color={NIGHT.magenta} position={[0, 2.75, 0.75]} size={0.55} />
      <AirCon position={[0.8, 2.4, -0.5]} />
      {/* A table out front */}
      <group position={[1.05, 0, 1.75]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.04, 14]} />
          <meshStandardMaterial color="#d8d6f5" />
        </mesh>
        <Box size={[0.04, 0.3, 0.04]} position={[0, 0.15, 0]} color="#8a8cc0" />
      </group>
      <Pool position={[0.1, 0.06, 1.9]} color={NIGHT.cyan} size={3.2} opacity={0.4} />
    </group>
  );
}

/** The busy parent's apartment block: warm windows, balconies and a fire escape. */
export function Apartments() {
  const H = 3.4;
  return (
    <group>
      <Box size={[2.6, H, 2.0]} position={[0, H / 2, 0]} color={NIGHT.wallLight} />
      <Windows at={[0, H / 2 + 0.1, 1.0]} w={2.1} h={H - 0.7} cols={3} rows={3} pane={[0.34, 0.42]} seed={31} lit={0.65} />
      <Windows at={[1.3, H / 2 + 0.1, 0]} turn={Math.PI / 2} w={1.5} h={H - 0.7} cols={2} rows={3} pane={[0.32, 0.42]} seed={32} lit={0.55} />
      {/* Balconies with wire rails */}
      {[1.25, 2.25].map((y) => (
        <group key={y} position={[0.7, y, 1.2]}>
          <Box size={[0.8, 0.05, 0.4]} position={[0, 0, 0]} color={NIGHT.trim} />
          <Box size={[0.8, 0.3, 0.02]} position={[0, 0.17, 0.19]} color="#7b7eb8" />
        </group>
      ))}
      {/* Fire escape ladder down the left side */}
      <group position={[-1.32, 0, 0.45]}>
        {[-0.14, 0.14].map((z) => (
          <Box key={z} size={[0.03, H - 0.4, 0.03]} position={[0, (H - 0.4) / 2 + 0.2, z]} color="#6e71aa" />
        ))}
        {Array.from({ length: 9 }, (_, i) => (
          <Box key={i} size={[0.03, 0.02, 0.28]} position={[0, 0.45 + i * 0.3, 0]} color="#6e71aa" />
        ))}
      </group>
      <Parapet w={2.6} d={2.0} y={H} />
      {/* Water tank on the roof */}
      <group position={[-0.5, H, -0.3]}>
        {[-0.2, 0.2].map((x) => (
          <Box key={x} size={[0.05, 0.35, 0.05]} position={[x, 0.17, 0]} color="#6e71aa" />
        ))}
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.32, 0.32, 0.55, 14]} />
          <meshStandardMaterial color="#5d5f95" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.98, 0]}>
          <coneGeometry args={[0.34, 0.2, 14]} />
          <meshStandardMaterial color="#4a4c80" />
        </mesh>
      </group>
      {/* Front door and a little neon HOME sign */}
      <Neon size={[0.45, 0.7, 0.03]} position={[-0.6, 0.36, 1.01]} color="#ffe2b8" />
      <NeonSign text="HOME" color={NIGHT.magenta} position={[-0.6, 0.95, 1.06]} size={0.22} board={false} />
      <Pool position={[-0.4, 0.06, 1.7]} color={NIGHT.warm} size={2.4} opacity={0.3} />
    </group>
  );
}

/** The college at night: a columned front, tall cyan windows and a glowing clock. */
export function Campus() {
  const H = 2.9;
  return (
    <group>
      <Box size={[3.8, H, 2.4]} position={[0, H / 2, 0]} color={NIGHT.wall} />
      <Windows at={[-1.15, 1.45, 1.2]} w={1.2} h={2.0} cols={2} rows={2} pane={[0.36, 0.7]} seed={41} lit={0.75} />
      <Windows at={[1.15, 1.45, 1.2]} w={1.2} h={2.0} cols={2} rows={2} pane={[0.36, 0.7]} seed={42} lit={0.75} />
      <Windows at={[1.9, 1.45, 0]} turn={Math.PI / 2} w={2.0} h={2.0} cols={3} rows={2} pane={[0.36, 0.7]} seed={43} lit={0.5} />
      {/* Porch: steps, four columns and a pediment */}
      <Box size={[1.5, 0.12, 0.7]} position={[0, 0.06, 1.5]} color={NIGHT.trim} />
      {[-0.55, -0.18, 0.18, 0.55].map((x) => (
        <mesh key={x} position={[x, 1.1, 1.6]}>
          <cylinderGeometry args={[0.07, 0.08, 2.0, 10]} />
          <meshStandardMaterial color="#8a8dc6" roughness={0.7} />
        </mesh>
      ))}
      <Box size={[1.6, 0.14, 0.7]} position={[0, 2.14, 1.5]} color={NIGHT.trim} />
      <mesh position={[0, 2.42, 1.5]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.7, 3, 1, false]} />
        <meshStandardMaterial color={NIGHT.wallLight} />
      </mesh>
      <Neon size={[0.6, 1.2, 0.03]} position={[0, 0.72, 1.21]} color="#8ff7ff" />
      {/* Clock */}
      <mesh position={[0, 2.38, 1.86]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 20]} />
        <meshBasicMaterial color="#fff6e0" toneMapped={false} />
      </mesh>
      <Parapet w={3.8} d={2.4} y={H} />
      <NeonSign text="CAMPUS" color={NIGHT.cyan} position={[0.9, H + 0.32, 0.2]} size={0.42} />
      <AirCon position={[-1.2, H, -0.5]} />
      <Pool position={[0, 0.06, 2.1]} color={NIGHT.cyan} size={3.4} opacity={0.3} />
    </group>
  );
}

/** Pipo's garage: a roll-up door and a cyan GARAGE sign, like the reference's corner garage. */
export function NightGarage() {
  return (
    <group>
      <Box size={[2.0, 1.5, 1.7]} position={[0, 0.75, 0]} color={NIGHT.wallDark} />
      <Neon size={[1.2, 0.9, 0.03]} position={[0, 0.48, 0.86]} color="#6f6fb8" />
      {Array.from({ length: 6 }, (_, i) => (
        <Box key={i} size={[1.2, 0.02, 0.04]} position={[0, 0.1 + i * 0.15, 0.88]} color="#3a3b70" />
      ))}
      <Parapet w={2.0} d={1.7} y={1.5} />
      <NeonSign text="GARAGE" color={NIGHT.cyan} position={[0, 1.22, 0.9]} size={0.3} />
      <Pool position={[0, 0.06, 1.4]} color={NIGHT.cyan} size={2.2} opacity={0.3} />
    </group>
  );
}

// ---------- the ground and the streets ----------

/** The square base the city stands on, with a thin neon edge along its top. */
export function CityBase() {
  const h = CITY_HALF;
  return (
    <group>
      <mesh position={[0, -0.75, 0]} raycast={noRaycast} receiveShadow>
        <boxGeometry args={[h * 2, 1.5, h * 2]} />
        <meshStandardMaterial color={NIGHT.base} roughness={0.95} />
      </mesh>
      {/* Grass, just above the slab (and under the roads, which start at 0) */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} receiveShadow>
        <planeGeometry args={[h * 2 - 0.1, h * 2 - 0.1]} />
        <meshStandardMaterial color={NIGHT.ground} roughness={0.95} />
      </mesh>
      {/* Neon trim on the two edges facing the camera */}
      <Neon size={[h * 2, 0.04, 0.04]} position={[0, -0.03, h]} color="#b84fff" />
      <Neon size={[0.04, 0.04, h * 2]} position={[h, -0.03, 0]} color="#b84fff" />
    </group>
  );
}

/** Low buildings filling the blocks between the places, each with a few lit windows. */
export function CityBlocks() {
  const blocks = useMemo(() => cityBlocks(20, CITY_HALF - 0.9), []);
  return (
    <Static>
      <group>
        {blocks.map((b, i) => (
          <group key={i} position={[b.x, 0, b.z]}>
            <Box size={[b.w, b.h, b.d]} position={[0, b.h / 2, 0]} color={i % 3 === 0 ? NIGHT.wallDark : i % 3 === 1 ? NIGHT.wall : "#7073b6"} />
            <Box size={[b.w + 0.06, 0.08, b.d + 0.06]} position={[0, b.h, 0]} color={NIGHT.trim} />
            <Windows at={[0, b.h / 2, b.d / 2]} w={b.w - 0.4} h={b.h - 0.4} cols={Math.max(1, Math.round(b.w / 0.55))} rows={Math.max(1, Math.round(b.h / 0.6))} pane={[0.22, 0.26]} seed={100 + i} lit={0.4} />
            <Windows at={[b.w / 2, b.h / 2, 0]} turn={Math.PI / 2} w={b.d - 0.4} h={b.h - 0.4} cols={Math.max(1, Math.round(b.d / 0.55))} rows={Math.max(1, Math.round(b.h / 0.6))} pane={[0.22, 0.26]} seed={200 + i} lit={0.35} />
          </group>
        ))}
      </group>
    </Static>
  );
}

/** Where the street lamps stand: along both sides of each road out from the ring. */
const LAMPS: { at: V3; color: string }[] = (() => {
  const out: { at: V3; color: string }[] = [];
  const side = RING.width / 2 + 0.25;
  const colors = [NIGHT.magenta, "#ffd9a8", NIGHT.cyan];
  let i = 0;
  for (const d of [RING.half + 2.4, RING.half + 5.2]) {
    for (const s of [1, -1]) {
      const flip = i % 2 ? 1 : -1;
      out.push({ at: [flip * side, 0, s * d], color: colors[i++ % 3]! });
      out.push({ at: [s * d, 0, -flip * side], color: colors[i++ % 3]! });
    }
  }
  return out;
})();

/** Curved street lamps with a colored head, a halo and a pool of light underneath. */
export function StreetLamps() {
  return (
    <group>
      <Static>
        <group>
          {LAMPS.map(({ at }, i) => (
            <group key={i} position={at}>
              <mesh position={[0, 0.75, 0]}>
                <cylinderGeometry args={[0.03, 0.045, 1.5, 6]} />
                <meshStandardMaterial color="#6a6da6" roughness={0.6} />
              </mesh>
              <mesh position={[0, 1.5, 0]}>
                <sphereGeometry args={[0.09, 10, 8]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            </group>
          ))}
        </group>
      </Static>
      {LAMPS.map(({ at, color }, i) => (
        <group key={i} position={at}>
          <Glow position={[0, 1.5, 0]} color={color} size={1.1} opacity={0.8} />
          <Pool position={[0, 0.07, 0]} color={color} size={2.2} opacity={0.4} />
        </group>
      ))}
    </group>
  );
}

/** A small lit fountain where the island has its pond. */
export function Fountain() {
  return (
    <group position={[POND.at[0], 0, POND.at[1]]}>
      <Static>
        <group>
          <mesh position={[0, 0.12, 0]}>
            <cylinderGeometry args={[1.1, 1.15, 0.24, 28]} />
            <meshStandardMaterial color={NIGHT.trim} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.98, 28]} />
            <meshBasicMaterial color="#2bd9f0" toneMapped={false} transparent opacity={0.75} />
          </mesh>
          <mesh position={[0, 0.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.5, 10]} />
            <meshStandardMaterial color="#8a8dc6" />
          </mesh>
        </group>
      </Static>
      <Glow position={[0, 0.6, 0]} color={NIGHT.cyan} size={2.4} opacity={0.45} />
    </group>
  );
}

const MOTES = 26;

/** Fireflies drifting round the sakura: Pipo's own glow, everywhere. */
export function Fireflies({ still }: { still: boolean }) {
  const paths = useMemo(() => {
    const rand = seeded(77);
    return Array.from({ length: MOTES }, () => ({ r: 1.8 + rand() * 3.2, a: rand() * Math.PI * 2, y: 0.6 + rand() * 2.6, speed: 0.08 + rand() * 0.14, bob: rand() * Math.PI * 2 }));
  }, []);
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const group = ref.current;
    if (!group) return;
    const t = still ? 0 : clock.elapsedTime;
    group.children.forEach((child, i) => {
      const p = paths[i]!;
      const a = p.a + t * p.speed;
      child.position.set(Math.cos(a) * p.r, p.y + Math.sin(t * 0.9 + p.bob) * 0.3, Math.sin(a) * p.r);
      const s = 0.55 + 0.45 * Math.sin(t * 2.2 + p.bob * 3);
      child.scale.setScalar(Math.max(0.15, s) * 0.32);
    });
  });
  const map = useMemo(glowTexture, []);
  return (
    <group ref={ref}>
      {paths.map((_, i) => (
        <sprite key={i} raycast={noRaycast}>
          <spriteMaterial map={map} color="#fff3a0" transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Moonlight, a cool sky and colored spill from the neon. */
export function NightLights({ shadowSize }: { shadowSize: number }) {
  return (
    <>
      <hemisphereLight args={["#c4c7ff", "#4a4380", 1.45]} />
      <directionalLight
        position={[-9, 18, 10]}
        intensity={1.15}
        color="#d6dcff"
        castShadow
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      {/* Colored light from the neon round each place, and pink from the sakura's lanterns */}
      <pointLight position={[-7.2, 2.2, -4.6]} color={NIGHT.magenta} intensity={9} distance={7} decay={1.6} />
      <pointLight position={[2.7, 2.4, -6.2]} color={NIGHT.cyan} intensity={8} distance={7} decay={1.6} />
      <pointLight position={[7.4, 1.4, 6.8]} color={NIGHT.cyan} intensity={7} distance={6} decay={1.6} />
      <pointLight position={[-5.6, 1.8, 4.3]} color="#ffb070" intensity={6} distance={6} decay={1.6} />
      <pointLight position={[7.2, 1.8, -4.0]} color="#9b7bff" intensity={6} distance={6} decay={1.6} />
      <pointLight position={[0, 2.2, 1.2]} color="#ff7ad9" intensity={7} distance={6} decay={1.6} />
    </>
  );
}

/** Small things the night city adds along the roads: dashed curbs of light at the crossings. */
export function CrossingLights() {
  const h = RING.half;
  const spots: V3[] = [];
  for (const s of [1, -1]) spots.push([0, 0.06, s * (h + RING.width / 2 + 0.5)], [s * (h + RING.width / 2 + 0.5), 0.06, 0]);
  return (
    <group>
      {spots.map((at, i) => (
        <Pool key={i} position={at} color={i % 2 ? NIGHT.magenta : NIGHT.cyan} size={1.6} opacity={0.22} />
      ))}
    </group>
  );
}

/** Lamps on the road barriers glow a little at night. */
export function BarrierGlows() {
  const spots: V3[] = [1, -1].flatMap((s) => [[0, 0.58, s * (SPOKE_END - 0.35)] as V3, [s * (SPOKE_END - 0.35), 0.58, 0] as V3]);
  return (
    <group>
      {spots.map((at, i) => (
        <Glow key={i} position={at} color="#ffb000" size={0.9} opacity={0.5} />
      ))}
    </group>
  );
}
