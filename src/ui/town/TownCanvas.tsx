// The 3D town itself (react-three-fiber). Loaded on its own so lessons stay light.
// On arrival the camera swoops in and the places pop up one by one. Hover a place to lift it
// and send Pipo over; click it and the camera flies in, then the town tells the screen to move on.
import { Html, Instance, Instances } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import type { PipoLook } from "../../game/pipoLook.ts";
import { PLACES, RING, SPOKE_END, placeOf, type Place, type PlaceId } from "../../game/townLayout.ts";
import { Pipo3D } from "./Pipo3D.tsx";
import { Cafe, College, Dojo, Garage, House, Lot } from "./places.tsx";
import { BRAND, Balloon, Car, Cloud, ORANGE } from "./props.tsx";
import { Birds, Flowers, Forest, IslandBase, Plaza, Pond, Strollers, grow } from "./scenery.tsx";

export interface PlaceTag {
  title: string;
  sub: string;
  /** Shown on the tag, e.g. "★ 4/9" for a persona with playable paths. */
  progress?: string;
  /** Shown on the tag, e.g. "🏅" when a path here is complete. */
  badge?: string;
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
}

const CAMERA_HOME = new THREE.Vector3(20.5, 25, 30.5);
const LOOK_HOME = new THREE.Vector3(0, -1.7, 1.6);
/** Where the arrival swoop starts: high up, round to one side. */
const CAMERA_START = new THREE.Vector3(-14, 44, 30);
const INTRO_MS = 2000;
const FLY_MS = 1000;
/** When each place pops up during the intro, in seconds. */
const POP_START = 0.45;
const POP_STEP = 0.14;
const noRaycast = () => null;

export default function TownCanvas(props: TownCanvasProps) {
  return (
    <Canvas
      shadows
      flat
      // Sharp enough on retina screens without drawing 4x the pixels.
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: (props.still ? CAMERA_HOME : CAMERA_START).toArray(), fov: 30, near: 0.5, far: 140 }}
      onPointerMissed={() => props.onHover(null)}
      aria-label="Pipodojo Town"
    >
      <Town {...props} />
    </Canvas>
  );
}

function Town({ look, tags, hovered, onHover, selected, onSelect, onArrive, still }: TownCanvasProps) {
  const root = useRef<THREE.Group>(null);

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
      <hemisphereLight args={["#f1efff", "#9fd89a", 1.25]} />
      <directionalLight
        position={[9, 18, 8]}
        intensity={1.9}
        color="#fff3e2"
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
            {place.id === "lot" && <Lot still={still} />}
            {place.id === "garage" && <Garage />}
          </Spot>
        ))}
        <Forest still={still} />
      </group>
      {/* Things that move: soft blob shadows instead of real ones, which are baked after the intro. */}
      <Car color={ORANGE} offset={0} speed={0.035} still={still} />
      <Car color={BRAND[500]} offset={0.36} speed={0.035} still={still} />
      <Car color="#4fb6ff" offset={0.7} speed={0.035} still={still} />
      <Strollers still={still} />
      <Pipo3D look={look} target={pipoTarget} still={still} />
      <BakeShadows after={still ? 0.3 : POP_START + PLACES.length * POP_STEP + 1.2} />
      <Flowers still={still} />
      <Birds still={still} />
      <Cloud position={[-10, 10.5, -9]} scale={1.3} speed={0.35} still={still} />
      <Cloud position={[6, 11.5, -14]} scale={1.6} speed={0.25} still={still} />
      <Balloon position={[12.5, 6.5, -9]} still={still} />
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
  const { camera, pointer } = useThree();
  const look = useRef(LOOK_HOME.clone());
  const flight = useRef<Flight | null>(
    still
      ? null
      : { from: CAMERA_START.clone(), fromLook: new THREE.Vector3(0, 0, 0), to: CAMERA_HOME.clone(), toLook: LOOK_HOME.clone(), start: performance.now(), ms: INTRO_MS, done: false },
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
    const goal = still ? CAMERA_HOME : CAMERA_HOME.clone().add(new THREE.Vector3(pointer.x * 1.6, pointer.y * 0.8, -pointer.x * 0.6));
    camera.position.lerp(goal, still ? 1 : Math.min(1, delta * 1.5));
    look.current.lerp(LOOK_HOME, Math.min(1, delta * 3));
    camera.lookAt(look.current);
  });
  return null;
}

function Roads() {
  const h = RING.half;
  const w = RING.width;
  const strips: { pos: [number, number, number]; size: [number, number, number] }[] = [
    // The ring
    { pos: [0, 0.02, h], size: [2 * h + w, 0.04, w] },
    { pos: [0, 0.02, -h], size: [2 * h + w, 0.04, w] },
    { pos: [h, 0.02, 0], size: [w, 0.04, 2 * h + w] },
    { pos: [-h, 0.02, 0], size: [w, 0.04, 2 * h + w] },
    // Spokes out to the edge
    ...[1, -1].flatMap((s) => [
      { pos: [0, 0.02, (s * (h + SPOKE_END)) / 2] as [number, number, number], size: [w, 0.04, SPOKE_END - h] as [number, number, number] },
      { pos: [(s * (h + SPOKE_END)) / 2, 0.02, 0] as [number, number, number], size: [SPOKE_END - h, 0.04, w] as [number, number, number] },
    ]),
  ];
  // Dashed middle lines on the spokes, drawn as one instanced mesh.
  const dashes: { at: [number, number, number]; alongX: boolean }[] = [];
  for (let d = h + 1; d < SPOKE_END - 0.4; d += 0.9) {
    dashes.push({ at: [0, 0.045, d], alongX: false }, { at: [0, 0.045, -d], alongX: false }, { at: [d, 0.045, 0], alongX: true }, { at: [-d, 0.045, 0], alongX: true });
  }
  return (
    <group>
      {/* Dojo plaza paving */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast}>
        <circleGeometry args={[RING.half - 0.65, 48]} />
        <meshStandardMaterial color="#f4f1ff" roughness={1} />
      </mesh>
      {strips.map((s, i) => (
        <mesh key={i} position={s.pos} raycast={noRaycast}>
          <boxGeometry args={s.size} />
          <meshStandardMaterial color="#6d6890" roughness={0.95} />
        </mesh>
      ))}
      <Instances limit={dashes.length} raycast={noRaycast}>
        <boxGeometry args={[0.08, 0.01, 0.4]} />
        <meshStandardMaterial color="#ffffff" />
        {dashes.map((d, i) => (
          <Instance key={i} position={d.at} rotation={[0, d.alongX ? Math.PI / 2 : 0, 0]} />
        ))}
      </Instances>
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
        <meshBasicMaterial color={tag.open ? BRAND[400] : "#ffffff"} transparent opacity={0} depthWrite={false} />
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
        <div className="flex -translate-x-1/2 -translate-y-full flex-col items-center gap-1.5">
          {hovered && (
            <div className="pop-in w-48 rounded-2xl bg-ink/90 px-3 py-2 text-center text-xs font-bold text-white shadow-xl">
              {tag.sub}
              {tag.open && <span className="mt-1 block text-[11px] font-black text-amber-300">Click to visit ›</span>}
            </div>
          )}
          <div className="pop-in" style={{ animationDelay: `${delay + 0.35}s` }}>
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-black whitespace-nowrap shadow-lg ring-2 transition-transform duration-200 motion-reduce:transition-none ${
                tag.open ? "bg-white text-ink ring-white" : "bg-white/75 text-gray-600 ring-white/60"
              } ${hovered ? "scale-110" : ""}`}
            >
              {tag.title}
              {tag.progress && <span className="text-xs font-extrabold text-amber-600">{tag.progress}</span>}
              {tag.badge && <span aria-hidden="true">{tag.badge}</span>}
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
