// The message cube's 3D scene (react-three-fiber), loaded on its own so phones never download it.
// It builds itself live as you tap: a good piece flies in and clicks into its place, a weak one
// bumps against the cube and rolls off to the floor, a small extra perches on top. Tap a piece
// again and it flies back out. A whole cube smiles; press Check and it does a happy little spin.
import { Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { CELLS, type Cell, type CubePiece } from "../game/messageCube.ts";

export type CubeStage = "build" | "assemble" | "done";

export interface MessageCubeProps {
  pieces: readonly CubePiece[];
  picks: readonly string[];
  stage: CubeStage;
  stars: number | null;
  still: boolean;
  /** Hidden or scrolled away: draw nothing. */
  paused: boolean;
}

/** Soft sweet-shop colours, one per piece (neighbours always differ). */
const COLORS = ["#a99cff", "#8fd3ff", "#7ee2c0", "#ffb48a", "#ff9ec7", "#ffd166", "#c3f08f", "#9ee6ff", "#d7a6ff", "#ffc2a8"];
const BUMPED = new THREE.Color("#c4bfdc");
const INK = "#2a2140";

const CUBIE = new RoundedBoxGeometry(0.9, 0.9, 0.9, 4, 0.17);
const at = (c: Cell) => new THREE.Vector3(c[0] - 0.5, c[1] - 0.5, c[2] - 0.5);
const now = () => performance.now() / 1000;

/** How long a weak piece leans on the cube before it bumps off, in seconds. */
const BUMP_AFTER = 0.45;
/** Where bumped pieces end up: either side of the cube, then in front (clear of the caption). */
const FLOOR = [new THREE.Vector3(1.45, -1.1, 0.55), new THREE.Vector3(-1.45, -1.1, 0.55), new THREE.Vector3(0.75, -1.15, 1.45)];
/** How long a good piece takes to land (its cells stop showing as empty then). */
const LANDS_AFTER = 0.35;

/** When each picked piece was tapped, in seconds; shared by the whole scene. */
type Times = RefObject<Map<string, number>>;

export default function MessageCubeCanvas(props: MessageCubeProps) {
  return (
    <Canvas flat frameloop={props.paused ? "never" : "always"} dpr={[1, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: "low-power" }} camera={{ fov: 28, near: 0.5, far: 60 }}>
      <Fit />
      <ambientLight intensity={1.15} />
      <hemisphereLight args={["#ffffff", "#b2a9ff", 0.7]} />
      <directionalLight position={[3, 6, 5]} intensity={1.5} />
      <Scene {...props} />
    </Canvas>
  );
}

/** Keeps the cube, its top and the floor in view whatever shape the box is: a little elevated, from the front. */
function Fit() {
  const { camera, size } = useThree();
  useLayoutEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const v = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const h = v * (size.width / size.height);
    cam.position.copy(new THREE.Vector3(0, 0.5, 1).normalize().multiplyScalar(Math.max(1.95 / h, 1.85 / v) + 1.2));
    // Aimed a little low, so the scene sits above the caption.
    cam.lookAt(0, -0.3, 0);
  }, [camera, size]);
  return null;
}

function Scene({ pieces, picks, stage, stars, still }: MessageCubeProps) {
  const root = useRef<THREE.Group>(null);
  const times = useRef(new Map<string, number>());
  // Note when each piece is tapped (and forget it when it's taken back out).
  for (const id of picks) if (!times.current.has(id)) times.current.set(id, still ? -Infinity : now());
  for (const id of [...times.current.keys()]) if (!picks.includes(id)) times.current.delete(id);

  // Check: one happy spin while Pipo reads the message.
  const spinFrom = useRef<number | null>(null);
  useEffect(() => {
    spinFrom.current = stage === "assemble" && !still ? now() : null;
  }, [stage, still]);

  const picked = pieces.filter((p) => picks.includes(p.id));
  const neutrals = picked.filter((p) => p.quality === "neutral").map((p) => p.id);
  const bumped = picked.filter((p) => p.quality === "weak").map((p) => p.id);
  const good = pieces.filter((p) => p.quality === "good");
  const whole = good.every((p) => picks.includes(p.id));

  // Which piece fills each cell of the cube.
  const owner = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of pieces) if (p.quality === "good") for (const c of p.cells) m.set(c.join(","), p.id);
    return m;
  }, [pieces]);

  useFrame(({ clock }) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;
    let spin = 0;
    if (spinFrom.current !== null) {
      const p = Math.min(1, (now() - spinFrom.current) / 1.3);
      spin = (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2) * Math.PI * 2;
    }
    g.rotation.y = still ? -0.55 : -0.55 + Math.sin(t * 0.45) * 0.22 + spin;
    g.position.y = still ? 0 : Math.sin(t * 1.2) * 0.07 + Math.sin(Math.min(1, spin / (Math.PI * 2)) * Math.PI) * 0.25;
  });

  return (
    <>
      {/* A soft shadow on the "floor" under the cube */}
      <mesh position={[0, -1.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.25, 32]} />
        <meshBasicMaterial color="#2d2470" transparent opacity={0.1} depthWrite={false} />
      </mesh>
      <group ref={root}>
        {CELLS.map((cell) => (
          <Ghost key={cell.join(",")} cell={cell} owner={owner.get(cell.join(","))} times={times} checked={stage !== "build"} still={still} />
        ))}
        {pieces.map((piece) => (
          <PieceMesh
            key={piece.id}
            piece={piece}
            times={times}
            still={still}
            perch={neutrals.indexOf(piece.id)}
            perches={neutrals.length}
            bump={bumped.indexOf(piece.id)}
          />
        ))}
        <Face show={whole} still={still} />
      </group>
      {stage === "done" && stars === 3 && whole && !still && <Sparkles count={28} scale={[3.4, 3, 3.4]} size={5} speed={0.5} color="#ffd166" />}
    </>
  );
}

interface PieceProps {
  piece: CubePiece;
  times: Times;
  still: boolean;
  /** Neutral pieces: which perch on top (-1 if none). */
  perch: number;
  perches: number;
  /** Weak pieces: which spot on the floor they roll to (-1 if none). */
  bump: number;
}

function PieceMesh({ piece, times, still, perch, perches, bump }: PieceProps) {
  const anchor = useRef<THREE.Group>(null);
  const centroid = useMemo(() => piece.cells.reduce((sum, c) => sum.add(at(c)), new THREE.Vector3()).divideScalar(piece.cells.length), [piece]);
  const base = useMemo(() => new THREE.Color(COLORS[piece.color % COLORS.length]), [piece.color]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color: base, roughness: 0.48 }), [base]);
  useEffect(() => () => material.dispose(), [material]);
  // Each piece comes in from (and goes back out to) its own spot up and to one side.
  const offstage = useMemo(() => {
    const a = piece.color * 2.4;
    return new THREE.Vector3(Math.cos(a) * 3.4, 2.4, Math.sin(a) * 2 + 1);
  }, [piece.color]);
  const motion = useRef({ vel: new THREE.Vector3(), scale: 0, scaleVel: 0, snapped: false, started: false });
  const goal = useMemo(() => ({ pos: new THREE.Vector3(), rot: new THREE.Quaternion(), euler: new THREE.Euler() }), []);

  useFrame((_, delta) => {
    const g = anchor.current;
    if (!g) return;
    const dt = Math.min(delta, 1 / 30);
    const m = motion.current;
    const tapped = times.current?.get(piece.id);
    const age = tapped === undefined ? 0 : now() - tapped;
    let scale = 1;
    let grey = false;
    goal.rot.identity();

    if (!m.started) {
      g.position.copy(offstage);
      m.started = true;
    }
    if (tapped === undefined) {
      // Not in the message: off to the side, tiny.
      goal.pos.copy(offstage);
      scale = 0;
      m.snapped = false;
    } else if (piece.quality === "good") {
      goal.pos.copy(centroid);
    } else if (piece.quality === "neutral") {
      // A little bobble on top of the cube.
      goal.pos.set((perch - (perches - 1) / 2) * 0.55, 1.28, 0);
      goal.rot.setFromEuler(goal.euler.set(0, 0.6, 0));
      scale = 0.34;
    } else if (age < BUMP_AFTER) {
      // A weak piece tries the cube first...
      goal.pos.copy(offstage).setY(0.3).setLength(1.4);
      scale = 0.55;
    } else {
      // ...bumps off, and rolls to the floor beside the cube, a little grey.
      goal.pos.copy(FLOOR[bump % FLOOR.length]!);
      goal.rot.setFromEuler(goal.euler.set(0, 0.35, (bump % 2 ? 1 : -1) * 0.5));
      scale = 0.42;
      grey = true;
    }

    if (still) {
      g.position.copy(goal.pos);
      g.quaternion.copy(goal.rot);
      m.scale = scale;
    } else {
      // Bouncy springs: a little overshoot reads as soft and squishy.
      m.vel.addScaledVector(goal.pos.clone().sub(g.position), 90 * dt);
      m.vel.multiplyScalar(Math.exp(-11 * dt));
      g.position.addScaledVector(m.vel, dt);
      g.quaternion.slerp(goal.rot, 1 - Math.exp(-7 * dt));
      // Click: a good piece squashes a little as it lands in its place.
      if (tapped !== undefined && piece.quality === "good" && !m.snapped && g.position.distanceTo(centroid) < 0.08) {
        m.snapped = true;
        m.scaleVel -= 3.2;
      }
      m.scaleVel += (scale - m.scale) * 170 * dt;
      m.scaleVel *= Math.exp(-13 * dt);
      m.scale = Math.max(0, m.scale + m.scaleVel * dt);
    }
    g.scale.setScalar(m.scale);
    g.visible = m.scale > 0.01;
    material.color.lerp(grey ? BUMPED : base, still ? 1 : 1 - Math.exp(-5 * dt));
  });

  return (
    <group ref={anchor} scale={0}>
      <group position={centroid.clone().negate()}>
        {piece.cells.map((c) => (
          <mesh key={c.join(",")} geometry={CUBIE} material={material} position={at(c)} />
        ))}
      </group>
    </group>
  );
}

/**
 * A see-through cell of the cube: shows where pieces go. Empty cells glow softly after Check, so
 * a missing piece is easy to spot.
 */
function Ghost({ cell, owner, times, checked, still }: { cell: Cell; owner: string | undefined; times: Times; checked: boolean; still: boolean }) {
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#b2a9ff", emissiveIntensity: 0.35, transparent: true, opacity: 0.2, depthWrite: false, roughness: 0.2 }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useFrame(({ clock }, delta) => {
    const tapped = owner === undefined ? undefined : times.current?.get(owner);
    const filled = tapped !== undefined && now() - tapped > LANDS_AFTER;
    const hole = !filled && checked;
    const opacity = filled ? 0 : hole ? (still ? 0.5 : 0.45 + Math.sin(clock.elapsedTime * 4) * 0.15) : 0.2;
    material.emissiveIntensity = hole ? 0.9 : 0.35;
    material.opacity += (opacity - material.opacity) * (still ? 1 : 1 - Math.exp(-8 * delta));
  });
  return <mesh geometry={CUBIE} material={material} scale={0.97} position={at(cell)} />;
}

/** The cube's kawaii face on its front, once every good piece is in. */
function Face({ show, still }: { show: boolean; still: boolean }) {
  const face = useRef<THREE.Group>(null);
  const s = useRef(0);
  // The face waits for the last piece to land.
  const since = useRef<number | null>(null);
  useEffect(() => {
    since.current = show ? now() : null;
  }, [show]);
  useFrame(({ clock }, delta) => {
    const g = face.current;
    if (!g) return;
    const on = since.current !== null && (still || now() - since.current > LANDS_AFTER + 0.15);
    s.current += ((on ? 1 : 0) - s.current) * (still ? 1 : 1 - Math.exp(-10 * delta));
    // A slow blink now and then.
    const blink = !still && clock.elapsedTime % 3.6 < 0.12 ? 0.15 : 1;
    g.scale.set(s.current, s.current, 1);
    g.visible = s.current > 0.02;
    g.children.slice(0, 2).forEach((eye) => (eye.scale.y = 1.25 * blink));
  });
  return (
    <group ref={face} position={[0, 0.02, 0.965]} scale={0}>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.12, 0]} scale={[1, 1.25, 0.35]}>
          <sphereGeometry args={[0.085, 16, 16]} />
          <meshStandardMaterial color={INK} roughness={0.3} />
        </mesh>
      ))}
      {[-0.29, 0.35].map((x) => (
        <mesh key={x} position={[x, 0.17, 0.035]}>
          <sphereGeometry args={[0.026, 8, 8]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
      {[-0.56, 0.56].map((x) => (
        <mesh key={x} position={[x, -0.08, 0.005]} scale={[1, 0.65, 1]}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color="#ff8fb1" transparent opacity={0.75} />
        </mesh>
      ))}
      <mesh position={[0, -0.04, 0.01]} rotation={[0, 0, Math.PI]}>
        <torusGeometry args={[0.075, 0.022, 8, 20, Math.PI]} />
        <meshStandardMaterial color={INK} roughness={0.3} />
      </mesh>
    </group>
  );
}
