// The 3D town itself (react-three-fiber). Loaded on its own so lessons stay light.
// On arrival the camera swoops in and the places pop up one by one. Hover a place to lift it
// and send Pipo over; click it and the camera flies in, then the town tells the screen to move on.
import { Html, Instance, Instances, RoundedBox } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { PipoLook } from "../../game/pipoLook.ts";
import { PLACES, RING, SPOKE_END, placeOf, type Place, type PlaceId } from "../../game/townLayout.ts";
import { TOUCH } from "../device.ts";
import { Pipo3D } from "./Pipo3D.tsx";
import { Retro } from "./Retro.tsx";
import { Cafe, College, Dojo, Garage, House, KidHouse } from "./places.tsx";
import { Airplane, Balloon, Car, Cloud } from "./props.tsx";
import { Birds, Flowers, Forest, IslandBase, MiniIsland, Plaza, Pond, Strollers, grow } from "./scenery.tsx";

export interface PlaceTag {
  title: string;
  sub: string;
  /** Shown on the tag, e.g. "★ 4/9" for a persona with playable paths. */
  progress?: string;
  /** Shown on the tag, e.g. "🏅" when a path here is complete. */
  badge?: string;
  /** "Tap or click to visit ›", in the player's language. */
  visit?: string;
  /** False for places you can't visit yet. */
  open: boolean;
}

export interface TownCanvasProps {
  look: PipoLook;
  tags: Readonly<Record<PlaceId, PlaceTag>>;
  hovered: PlaceId | null;
  onHover: (id: PlaceId | null) => void;
  /** The place the camera is flying to, once clicked. */
  selected: PlaceId | null;
  onSelect: (id: PlaceId) => void;
  /** The camera has arrived at the selected place. */
  onArrive: () => void;
  still: boolean;
  /** The sign over the floating "under construction" islands, in the player's language. */
  soonLabel: { title: string; sub: string };
}

const CAMERA_HOME = new THREE.Vector3(20.5, 25, 30.5);
const LOOK_HOME = new THREE.Vector3(0, -1.7, 1.6);
/** Where the arrival swoop starts: high up, round to one side. */
const CAMERA_START = new THREE.Vector3(-14, 44, 30);

/** Pull the camera back on tall, narrow screens (phones) so the whole island still fits. */
function homeFor(aspect: number): THREE.Vector3 {
  const back = aspect >= 1.3 ? 1 : Math.min(2.4, 1.25 / aspect);
  return CAMERA_HOME.clone().multiplyScalar(back);
}
const INTRO_MS = 2000;
const FLY_MS = 1000;
/** When each place pops up during the intro, in seconds. */
const POP_START = 0.45;
const POP_STEP = 0.14;
const noRaycast = () => null;
/**
 * Where the "under construction" islands float. On wide screens: two, in the open sky on either
 * side of the town (left, and lower right), clear of the buildings and name tags; on tall phone
 * screens: one, in the sky above it, clear of the header and the button column. (Worked out by
 * projecting through the home camera.)
 */
const ISLANDS_WIDE: [number, number, number][] = [
  [-19.5, -6, 5.5],
  [16.5, 3.5, 7.5],
];
const ISLANDS_TALL: [number, number, number][] = [[-15, 6, -19.5]];
/** Closest a name tag may come to the screen's left or right edge, in pixels. */
const TAG_MARGIN = 8;

export default function TownCanvas(props: TownCanvasProps) {
  return (
    <Canvas
      shadows
      flat
      // Sharp enough on retina screens without drawing 4x the pixels; phones a little less.
      dpr={TOUCH ? [1, 1.25] : [1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: (props.still ? homeFor(window.innerWidth / window.innerHeight) : CAMERA_START).toArray(), fov: 30, near: 0.5, far: 140 }}
      onPointerMissed={() => props.onHover(null)}
      aria-label="Pipodojo Town"
    >
      <Town {...props} />
      <Retro />
    </Canvas>
  );
}

function Town({ look, tags, hovered, onHover, selected, onSelect, onArrive, still, soonLabel }: TownCanvasProps) {
  const root = useRef<THREE.Group>(null);
  const wide = useThree((s) => s.size.width / Math.max(1, s.size.height) >= 1.3);

  // The town casts and catches soft shadows (the scenery under the island doesn't need to).
  useLayoutEffect(() => {
    root.current?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }, []);

  const active = selected ?? hovered;
  const pipoTarget = useMemo(() => {
    if (!active) return null;
    const place = placeOf(active);
    return new THREE.Vector3(place.at[0] * 0.82, place.tag + 0.4, place.at[1] * 0.82 + 0.6);
  }, [active]);

  return (
    <>
      {/* Clear, soft daylight */}
      <hemisphereLight args={["#f4f7fb", "#d9e6cf", 1.5]} />
      <directionalLight
        position={[9, 18, 8]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
      />
      <Rig selected={selected} onArrive={onArrive} still={still} />

      <IslandBase still={still} />
      <group ref={root}>
        <Plaza />
        <Roads />
        <Pond still={still} />
        <Popper delay={POP_START - 0.25} still={still}>
          <Dojo still={still} />
        </Popper>
        {PLACES.map((place, i) => (
          <Spot
            key={place.id}
            place={place}
            tag={tags[place.id]}
            hovered={hovered === place.id}
            locked={selected !== null}
            delay={POP_START + i * POP_STEP}
            still={still}
            onHover={onHover}
            onSelect={onSelect}
          >
            {place.id === "parent" && <House still={still} />}
            {place.id === "student" && <College still={still} />}
            {place.id === "business" && <Cafe still={still} />}
            {place.id === "kid" && <KidHouse still={still} />}
            {place.id === "garage" && <Garage still={still} />}
          </Spot>
        ))}
        <Forest still={still} />
      </group>
      {/* Things that move: soft blob shadows instead of real ones, which are baked after the intro. */}
      <Car color="#f6c945" offset={0} speed={0.035} still={still} />
      <Car color="#e8655a" offset={0.36} speed={0.035} still={still} />
      <Car color="#5aa0e0" offset={0.7} speed={0.035} still={still} />
      <Strollers still={still} />
      <Pipo3D look={look} target={pipoTarget} still={still} />
      <BakeShadows after={still ? 0.3 : POP_START + PLACES.length * POP_STEP + 1.2} />
      <Flowers still={still} />
      <Birds still={still} />
      <Cloud position={[-10, 10.5, -9]} scale={1.3} speed={0.35} still={still} />
      <Cloud position={[6, 11.5, -14]} scale={1.6} speed={0.25} still={still} />
      <Balloon position={[12.5, 6.5, -9]} still={still} />
      {/* Round the rim of the island: just over the edge trees, well outside Pipo's paths between
          the places, and low enough that the far side of the loop stays on screen. */}
      <Airplane center={[0, 0]} radius={12.4} height={2.8} speed={0.25} still={still} />
      {/* Two small islands floating off the town: more to come. Placed for the screen's shape so
          they land in clear sky, away from the header and the name tags. */}
      {(wide ? ISLANDS_WIDE : ISLANDS_TALL).map((at, i) => (
        <MiniIsland key={i} position={at} scale={i ? 0.8 : 1} phase={i * 2.1} label={soonLabel} still={still} />
      ))}
    </>
  );
}

/**
 * Real shadows are the most expensive part of each frame. Once the town has popped up, draw
 * the shadow map one last time and keep it, so the town stays smooth on slower laptops.
 */
function BakeShadows({ after }: { after: number }) {
  const { gl } = useThree();
  const baked = useRef(false);
  useFrame(({ clock }) => {
    if (baked.current || clock.elapsedTime < after) return;
    baked.current = true;
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  });
  return null;
}

/** Pops its children up from nothing during the intro. */
function Popper({ delay, still, children }: { delay: number; still: boolean; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(grow(clock.elapsedTime, delay, still));
  });
  return <group ref={ref}>{children}</group>;
}

type Flight = { from: THREE.Vector3; fromLook: THREE.Vector3; to: THREE.Vector3; toLook: THREE.Vector3; start: number; ms: number; done: boolean };

/** The camera: swoops in on arrival, follows the mouse a little, then flies in to a clicked place. */
function Rig({ selected, onArrive, still }: { selected: PlaceId | null; onArrive: () => void; still: boolean }) {
  const { camera, pointer, size } = useThree();
  const home = useMemo(() => homeFor(size.width / size.height), [size.width, size.height]);
  const look = useRef(LOOK_HOME.clone());
  const flight = useRef<Flight | null>(
    still
      ? null
      : { from: CAMERA_START.clone(), fromLook: new THREE.Vector3(0, 0, 0), to: home.clone(), toLook: LOOK_HOME.clone(), start: performance.now(), ms: INTRO_MS, done: false },
  );
  const arrive = useRef(onArrive);
  arrive.current = onArrive;

  useEffect(() => {
    if (!selected) return;
    const place = placeOf(selected);
    const toLook = new THREE.Vector3(place.at[0], 1.2, place.at[1]);
    const to = toLook.clone().add(CAMERA_HOME.clone().normalize().multiplyScalar(10));
    if (still) {
      arrive.current();
      return;
    }
    flight.current = { from: camera.position.clone(), fromLook: look.current.clone(), to, toLook, start: performance.now(), ms: FLY_MS, done: false };
  }, [selected, still, camera]);

  useFrame((_, delta) => {
    const f = flight.current;
    if (f && !f.done) {
      const t = Math.min(1, (performance.now() - f.start) / f.ms);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      camera.position.lerpVectors(f.from, f.to, ease);
      look.current.lerpVectors(f.fromLook, f.toLook, ease);
      camera.lookAt(look.current);
      if (t >= 1) {
        f.done = true;
        // The arrival swoop just hands over to the mouse drift; a clicked place moves on.
        if (selected) arrive.current();
      }
      return;
    }
    if (selected) return;
    // At home: a slow drift that follows the mouse a little.
    const goal = still ? home : home.clone().add(new THREE.Vector3(pointer.x * 1.6, pointer.y * 0.8, -pointer.x * 0.6));
    camera.position.lerp(goal, still ? 1 : Math.min(1, delta * 1.5));
    look.current.lerp(LOOK_HOME, Math.min(1, delta * 3));
    camera.lookAt(look.current);
  });
  return null;
}

const ROAD = "#5f6f8a";
const PAVEMENT = "#d9dee5";
/** Sidewalk width; curbs stand a little above the road. */
const SIDEWALK = 0.36;

type Slab = { pos: [number, number, number]; size: [number, number, number] };

/** Roads in warm grey, with rounded sidewalks along every edge and zebra crossings at the ring. */
function Roads() {
  const h = RING.half;
  const w = RING.width;
  const strips: Slab[] = [
    // The ring
    { pos: [0, 0.02, h], size: [2 * h + w, 0.04, w] },
    { pos: [0, 0.02, -h], size: [2 * h + w, 0.04, w] },
    { pos: [h, 0.02, 0], size: [w, 0.04, 2 * h + w] },
    { pos: [-h, 0.02, 0], size: [w, 0.04, 2 * h + w] },
    // Spokes out to the edge
    ...[1, -1].flatMap((s): Slab[] => [
      { pos: [0, 0.02, (s * (h + SPOKE_END)) / 2], size: [w, 0.04, SPOKE_END - h] },
      { pos: [(s * (h + SPOKE_END)) / 2, 0.02, 0], size: [SPOKE_END - h, 0.04, w] },
    ]),
  ];

  // Sidewalks: inside the ring, outside it (broken where the spokes leave), and along both sides of each spoke.
  const outer = h + w / 2 + SIDEWALK / 2;
  const inner = h - w / 2 - SIDEWALK / 2;
  const gap = w / 2 + SIDEWALK;
  const outerEnd = h + w / 2 + SIDEWALK;
  const half = (outerEnd - gap) / 2;
  const mid = (outerEnd + gap) / 2;
  const spokeLen = SPOKE_END - outerEnd;
  const spokeMid = (SPOKE_END + outerEnd) / 2;
  const off = w / 2 + SIDEWALK / 2;
  const walks: Slab[] = [];
  for (const s of [1, -1]) {
    walks.push({ pos: [0, 0.05, s * inner], size: [2 * inner + SIDEWALK, 0.1, SIDEWALK] }, { pos: [s * inner, 0.05, 0], size: [SIDEWALK, 0.1, 2 * inner - SIDEWALK] });
    for (const t of [1, -1]) {
      walks.push({ pos: [t * mid, 0.05, s * outer], size: [half * 2, 0.1, SIDEWALK] }, { pos: [s * outer, 0.05, t * mid], size: [SIDEWALK, 0.1, half * 2] });
      walks.push({ pos: [t * off, 0.05, s * spokeMid], size: [SIDEWALK, 0.1, spokeLen] }, { pos: [s * spokeMid, 0.05, t * off], size: [spokeLen, 0.1, SIDEWALK] });
    }
  }

  // Dashed middle lines on the spokes and round the ring (where the cars drive), and zebra
  // crossings where each spoke meets the ring.
  const dashes: { at: [number, number, number]; alongX: boolean }[] = [];
  for (let d = h + 1.6; d < SPOKE_END - 0.4; d += 0.9) {
    dashes.push({ at: [0, 0.045, d], alongX: false }, { at: [0, 0.045, -d], alongX: false }, { at: [d, 0.045, 0], alongX: true }, { at: [-d, 0.045, 0], alongX: true });
  }
  // Along each side of the ring, leaving the corners and the junctions with the spokes clear.
  for (let d = 0.9; d < h - w / 2 - 0.3; d += 0.9) {
    for (const t of [d, -d]) {
      dashes.push({ at: [t, 0.045, h], alongX: true }, { at: [t, 0.045, -h], alongX: true }, { at: [h, 0.045, t], alongX: false }, { at: [-h, 0.045, t], alongX: false });
    }
  }
  const zebra: { at: [number, number, number]; alongX: boolean }[] = [];
  const cross = h + w / 2 + 0.5;
  for (let i = -2; i <= 2; i++) {
    const o = i * 0.2;
    zebra.push({ at: [o, 0.045, cross], alongX: false }, { at: [o, 0.045, -cross], alongX: false }, { at: [cross, 0.045, o], alongX: true }, { at: [-cross, 0.045, o], alongX: true });
  }

  return (
    <group>
      {/* Dojo plaza paving */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[RING.half - 0.65, 48]} />
        <meshStandardMaterial color="#e7ebf0" roughness={1} />
      </mesh>
      {strips.map((s, i) => (
        <mesh key={i} position={s.pos} raycast={noRaycast}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color={ROAD} roughness={0.95} />
        </mesh>
      ))}
      {walks.map((s, i) => (
        <RoundedBox key={i} args={s.size} radius={0.045} smoothness={2} position={s.pos} raycast={noRaycast}>
          <meshStandardMaterial color={PAVEMENT} roughness={0.95} />
        </RoundedBox>
      ))}
      {/* A barrier across the end of each road, so none of them looks like it runs off the island */}
      {[1, -1].flatMap((s) => [
        <Barrier key={`z${s}`} position={[0, 0, s * (SPOKE_END - 0.35)]} turn={0} />,
        <Barrier key={`x${s}`} position={[s * (SPOKE_END - 0.35), 0, 0]} turn={Math.PI / 2} />,
      ])}
      <Instances limit={dashes.length + zebra.length} raycast={noRaycast}>
        <boxGeometry args={[0.08, 0.01, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
        {dashes.map((d, i) => (
          <Instance key={`d${i}`} position={d.at} rotation={[0, d.alongX ? Math.PI / 2 : 0, 0]} />
        ))}
        {zebra.map((z, i) => (
          <Instance key={`z${i}`} position={z.at} rotation={[0, z.alongX ? Math.PI / 2 : 0, 0]} scale={[1.4, 1, 1.3]} />
        ))}
      </Instances>
    </group>
  );
}

const BARRIER_STRIPES = 5;
const BARRIER_WIDTH = RING.width + 0.2;

/** A red and white striped road barrier: two boards on two posts, with a little amber lamp on each. */
function Barrier({ position, turn }: { position: [number, number, number]; turn: number }) {
  const stripe = BARRIER_WIDTH / BARRIER_STRIPES;
  return (
    <group position={position} rotation={[0, turn, 0]}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (BARRIER_WIDTH / 2 - 0.08), 0, 0]}>
          <mesh position={[0, 0.26, 0]} raycast={noRaycast}>
            <boxGeometry args={[0.08, 0.52, 0.08]} />
            <meshStandardMaterial color="#f4f5f7" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.58, 0]} raycast={noRaycast}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color="#ffc94d" emissive="#ffb000" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
      {[0.22, 0.42].flatMap((y, row) =>
        Array.from({ length: BARRIER_STRIPES }, (_, i) => (
          <mesh key={`${y}-${i}`} position={[(i - (BARRIER_STRIPES - 1) / 2) * stripe, y, 0.06]} raycast={noRaycast}>
            <boxGeometry args={[stripe, 0.14, 0.04]} />
            <meshStandardMaterial color={(i + row) % 2 ? "#ffffff" : "#e8655a"} roughness={0.7} />
          </mesh>
        )),
      )}
    </group>
  );
}

interface SpotProps {
  place: Place;
  tag: PlaceTag;
  hovered: boolean;
  /** Something was clicked: stop reacting. */
  locked: boolean;
  /** When it pops up during the intro, in seconds. */
  delay: number;
  still: boolean;
  onHover: (id: PlaceId | null) => void;
  onSelect: (id: PlaceId) => void;
  children: ReactNode;
}

/** A place you can point at: it pops up on arrival, then lifts, glows and shows its name tag. */
function Spot({ place, tag, hovered, locked, delay, still, onHover, onSelect, children }: SpotProps) {
  const lift = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const hover = useRef(1);
  const label = useRef<HTMLDivElement>(null);
  const shift = useRef(0);
  const anchor = useMemo(() => new THREE.Vector3(), []);

  // Keep the tag on screen: on narrow phones a tag centred over a building near the edge would be
  // cut off, so slide it sideways just enough to stay TAG_MARGIN inside the edge. (The tag is
  // mounted by <Html> after this component, so its width is read here rather than once on mount;
  // the moving tags only change transforms, so the read is cheap.)
  useFrame(({ camera, size }) => {
    const el = label.current;
    if (!el) return;
    anchor.set(place.at[0], place.tag, place.at[1]).project(camera);
    const x = ((anchor.x + 1) / 2) * size.width;
    const half = el.offsetWidth / 2;
    const left = x - half - TAG_MARGIN;
    const right = x + half + TAG_MARGIN - size.width;
    const next = Math.round(left < 0 ? -left : right > 0 ? -right : 0);
    if (next !== shift.current) {
      shift.current = next;
      el.style.transform = `translate(calc(-50% + ${next}px), -100%)`;
    }
  });

  useFrame(({ clock }, delta) => {
    const k = Math.min(1, delta * 10);
    hover.current += ((hovered ? 1.05 : 1) - hover.current) * k;
    if (lift.current) {
      lift.current.position.y += ((hovered ? 0.25 : 0) - lift.current.position.y) * k;
      lift.current.scale.setScalar(grow(clock.elapsedTime, delay, still) * hover.current);
    }
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial;
      m.opacity += ((hovered ? 0.55 : 0) - m.opacity) * k;
    }
  });

  return (
    <group position={[place.at[0], 0, place.at[1]]}>
      <mesh ref={ring} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <ringGeometry args={[place.clear - 0.6, place.clear - 0.25, 48]} />
        <meshBasicMaterial color={tag.open ? "#8c7dfb" : "#ffffff"} transparent opacity={0} depthWrite={false} />
      </mesh>
      <group
        ref={lift}
        rotation={[0, place.turn, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (locked) return;
          onHover(place.id);
          document.body.style.cursor = tag.open ? "pointer" : "default";
        }}
        onPointerOut={() => {
          if (locked) return;
          onHover(null);
          document.body.style.cursor = "";
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (locked || !tag.open) return;
          document.body.style.cursor = "";
          onSelect(place.id);
        }}
      >
        {children}
      </group>
      {/* The tag is pinned by its bottom edge, so the hover card grows upward, off the building. */}
      <Html position={[0, place.tag, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className="flex flex-col items-center gap-1.5" style={{ transform: "translate(-50%, -100%)" }}>
          {hovered && (
            <div className="pop-in w-40 rounded-2xl bg-ink/90 px-3 py-2 text-center text-[11px] font-bold text-white shadow-xl sm:w-48 sm:text-xs">
              {tag.sub}
              {tag.open && tag.visit && <span className="mt-1 block text-[11px] font-black text-amber-300">{tag.visit}</span>}
            </div>
          )}
          <div className="pop-in" style={{ animationDelay: `${delay + 0.35}s` }}>
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-pixel text-[11px] font-bold whitespace-nowrap shadow-lg ring-2 sm:gap-1.5 sm:px-3 sm:py-1 sm:text-sm transition-transform duration-200 motion-reduce:transition-none ${
                tag.open ? "bg-white text-ink ring-white" : "bg-white/75 text-gray-600 ring-white/60"
              } ${hovered ? "scale-110" : ""}`}
            >
              {tag.title}
              {tag.progress && <span className="text-xs text-amber-600">{tag.progress}</span>}
              {tag.badge && <span aria-hidden="true">{tag.badge}</span>}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
