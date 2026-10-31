// Pipo's phone, floating over the lesson after Pipo acts in an app. It starts top right on wide
// screens (clear of the result buttons) and bottom centre on phones. You can drag it, it tilts
// toward the pointer, and it folds into a small button. When Pipo is holding something for your
// OK (a draft or a cart), Send / Pay asks Pipo to go ahead and Pipo finishes it with its own call.
import confetti from "canvas-confetti";
import { motion, useMotionTemplate, useReducedMotion, useSpring } from "motion/react";
import { useRef, type PointerEvent } from "react";
import { readable } from "../engine/actions.ts";
import type { PipoAction } from "../engine/types.ts";
import { isLaptopApp, LaptopScreen } from "./LaptopApps.tsx";
import { PhoneScreen } from "./PhoneMockup.tsx";
import { play, type Sfx } from "../app/sound.ts";
import { useLang, type Strings } from "../i18n/index.tsx";

/** review: waiting for your OK. working: Pipo is finishing it. approved: done after your OK.
 *  already: Pipo went ahead at Check, before you could look. */
export type PhoneStatus = "review" | "working" | "approved" | "already";

interface Props {
  action: PipoAction;
  flags: readonly boolean[];
  status: PhoneStatus;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onApprove: () => void;
}

/** Gentle: the phone leans a few degrees toward the pointer, like picking it up. */
const TILT = 4;
const SPRING = { stiffness: 150, damping: 20, mass: 0.6 };

export function FloatingPhone({ action, flags, status, open, onOpen, onClose, onApprove }: Props) {
  const still = useReducedMotion();
  const { t } = useLang();
  // The young coder's lessons use Pipo Code on a laptop instead of a phone.
  const laptop = isLaptopApp(action.app);
  const bounds = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const rotateX = useSpring(0, SPRING);
  const rotateY = useSpring(0, SPRING);
  // A soft glare on the glass that follows the pointer
  const glareX = useSpring(50, SPRING);
  const glareY = useSpring(30, SPRING);
  const glare = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgb(255 255 255 / 0.22), transparent 55%)`;

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (still || dragging.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    rotateY.set((x - 0.5) * TILT * 2);
    rotateX.set(-(y - 0.5) * TILT * 2);
    glareX.set(x * 100);
    glareY.set(y * 100);
  };
  const untilt = () => {
    rotateX.set(0);
    rotateY.set(0);
    glareX.set(50);
    glareY.set(30);
  };

  if (!open) {
    return (
      <motion.button
        type="button"
        onClick={onOpen}
        initial={still ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="fixed bottom-4 left-[calc(50%-80px)] z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-3 font-extrabold text-white shadow-[0_12px_30px_-8px_rgb(27_22_64/0.7)] md:top-24 md:right-8 md:bottom-auto md:left-auto"
      >
        <span aria-hidden="true">{laptop ? "💻" : "📱"}</span> {laptop ? t.device.laptop : t.device.phone}
        {status === "review" && <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300 motion-reduce:animate-none" />}
      </motion.button>
    );
  }

  return (
    <>
      {/* The phone can be dragged anywhere inside the window */}
      <div ref={bounds} className="pointer-events-none fixed inset-3 z-40" aria-hidden="true" />
      <motion.div
        drag
        dragConstraints={bounds}
        dragElastic={0.06}
        dragMomentum={false}
        onDragStart={() => {
          dragging.current = true;
          untilt();
        }}
        onDragEnd={() => {
          dragging.current = false;
        }}
        whileDrag={{ scale: 1.03, cursor: "grabbing" }}
        initial={still ? false : { opacity: 0, y: 90, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", bounce: 0.25, duration: 0.6 }}
        style={{ rotateX, rotateY, transformPerspective: 1600 }}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className={`fixed bottom-3 z-50 cursor-grab touch-none md:top-20 md:right-8 md:bottom-auto md:left-auto ${
          laptop
            ? "left-[calc(50%-170px)] h-[min(400px,calc(100dvh-1.5rem))] w-[340px] md:h-[min(420px,calc(100dvh-14rem))] md:w-[460px]"
            : "left-[calc(50%-136px)] h-[min(568px,calc(100dvh-1.5rem))] w-[272px] md:h-[min(568px,calc(100dvh-18rem))]"
        }`}
        role="dialog"
        aria-label={laptop ? t.device.laptop : t.device.phone}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={laptop ? t.device.putLaptopAway : t.device.putPhoneAway}
          className="absolute -top-3 -left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-black text-ink shadow-md hover:bg-brand-50"
        >
          <span aria-hidden="true">–</span>
        </button>

        {laptop ? (
          // Pipo's laptop: a screen with Pipo Code, the footer under it, and a keyboard base
          <div className="flex h-full flex-col drop-shadow-[0_40px_50px_rgb(27_22_64/0.55)]">
            <div className="flex min-h-0 flex-1 flex-col rounded-t-[22px] bg-ink p-[8px] pb-1">
              <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[14px] bg-white">
                <div className="min-h-0 flex-1">
                  <LaptopScreen action={action} flags={flags} />
                </div>
                <div className="shrink-0">
                  <PhoneFooter action={action} flags={flags} status={status} onApprove={onApprove} onLater={onClose} />
                </div>
                {!still && <motion.div className="pointer-events-none absolute inset-0" style={{ background: glare }} aria-hidden="true" />}
              </div>
            </div>
            <div className="relative -mx-4 h-4 rounded-b-[18px] bg-gradient-to-b from-[#d9d4ff] to-[#b2a9ff]" aria-hidden="true">
              <span className="absolute top-0 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-b-lg bg-[#9d92e8]" />
            </div>
          </div>
        ) : (
          <>
        {/* Side buttons, for a real phone silhouette */}
        <span className="absolute top-24 -left-[3px] h-10 w-[3px] rounded-l bg-ink" aria-hidden="true" />
        <span className="absolute top-28 -right-[3px] h-16 w-[3px] rounded-r bg-ink" aria-hidden="true" />

        <div className="h-full rounded-[42px] bg-ink p-[7px] shadow-[0_40px_70px_-20px_rgb(27_22_64/0.7)]">
          <div className="relative flex h-full flex-col overflow-hidden rounded-[35px] bg-white">
            {/* Status bar with a camera island */}
            <div className="flex shrink-0 items-center justify-between px-6 pt-2.5 pb-1.5 text-[11px] font-black text-ink">
              <span>9:41</span>
              <span className="h-[18px] w-[72px] rounded-full bg-ink" aria-hidden="true" />
              <span aria-hidden="true">📶 🔋</span>
            </div>

            <div className="min-h-0 flex-1">
              <PhoneScreen action={action} flags={flags} />
            </div>
            <div className="shrink-0">
              <PhoneFooter action={action} flags={flags} status={status} onApprove={onApprove} onLater={onClose} />
            </div>

            <div className="flex shrink-0 justify-center pt-1.5 pb-2" aria-hidden="true">
              <span className="h-1 w-28 rounded-full bg-ink/80" />
            </div>

            {/* Glass glare */}
            {!still && <motion.div className="pointer-events-none absolute inset-0" style={{ background: glare }} aria-hidden="true" />}
          </div>
        </div>
          </>
        )}
      </motion.div>
    </>
  );
}

/** What the phone's footer says for each app. */
function footerCopy(action: PipoAction, t: Strings) {
  const d = t.device;
  const total = readable(action.args.total);
  const when = readable(action.args.delivery);
  switch (action.app) {
    case "whatsapp":
      return {
        ...d.whatsapp,
        already: d.alreadySent,
        alreadyNote: d.sentBefore,
        tone: "bg-emerald-600 hover:bg-emerald-700",
      };
    case "email":
      return {
        ...d.email,
        already: d.alreadySent,
        alreadyNote: d.sentBefore,
        tone: "bg-sky-600 hover:bg-sky-700",
      };
    case "calendar":
      return {
        ...d.calendar,
        tone: "bg-rose-500 hover:bg-rose-600",
      };
    case "site":
      return {
        ask: action.args.problem === undefined ? d.site.askBuild : d.site.askFix,
        button: d.site.button,
        working: d.site.working,
        approved: d.site.approved,
        already: d.site.already,
        alreadyNote: d.site.alreadyNote,
        tone: "bg-orange-500 hover:bg-orange-600",
      };
    case "game":
      return {
        ask: action.args.items === undefined ? d.game.askLevel : d.game.askShop,
        button: d.game.button,
        working: d.game.working,
        approved: d.game.approved,
        already: d.game.already,
        alreadyNote: d.game.alreadyNote,
        tone: "bg-violet-600 hover:bg-violet-700",
      };
    case "chart":
      return {
        ask: action.args.steps === undefined ? d.chart.askChart : d.chart.askDiagram,
        button: action.args.steps === undefined ? d.chart.buttonChart : d.chart.buttonDiagram,
        working: d.chart.working,
        approved: d.chart.approved,
        already: action.args.steps === undefined ? d.chart.alreadyChart : d.chart.alreadyDiagram,
        alreadyNote: d.chart.alreadyNote,
        tone: "bg-emerald-600 hover:bg-emerald-700",
      };
    default:
      return {
        ask: d.shop.ask,
        button: d.shop.button(total),
        working: d.shop.working,
        approved: `${d.shop.approved}${action.args.delivery === undefined ? "" : ` ${action.whenLabel ?? d.shop.arrives}: ${when}`}`,
        already: d.shop.already(total),
        alreadyNote: d.shop.alreadyNote,
        tone: "bg-brand-600 hover:bg-brand-700",
      };
  }
}

function PhoneFooter({
  action,
  flags,
  status,
  onApprove,
  onLater,
}: {
  action: PipoAction;
  flags: readonly boolean[];
  status: PhoneStatus;
  onApprove: () => void;
  onLater: () => void;
}) {
  const { t } = useLang();
  const copy = footerCopy(action, t);
  const flagged = flags.at(-1);

  if (status === "review") {
    return (
      <div className="space-y-2 border-t border-gray-100 px-3 pt-2 pb-1">
        <p className="text-center text-xs font-extrabold text-amber-800">⏳ {copy.ask}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className="flex-1 rounded-xl border-2 border-gray-200 py-2 text-sm font-extrabold text-gray-700 hover:bg-gray-50"
          >
            {t.device.notYet}
          </button>
          <motion.button
            type="button"
            onClick={onApprove}
            whileTap={{ scale: 0.94 }}
            className={`flex-[1.4] rounded-xl py-2 text-sm font-black text-white shadow-sm ${copy.tone}`}
          >
            {copy.button}
          </motion.button>
        </div>
      </div>
    );
  }

  if (status === "working") {
    return (
      <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-3 py-3 text-sm font-extrabold text-brand-700" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 motion-reduce:animate-none" />
        {copy.working}
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="pop-in border-t border-gray-100 px-3 py-2.5 text-center" role="status">
        <p className="text-sm font-black text-emerald-700">{copy.approved}</p>
      </div>
    );
  }

  // Pipo went ahead at Check: nothing to approve, and that's the lesson (when it's flagged).
  return (
    <div className={`border-t border-gray-100 px-3 py-2.5 text-center ${flagged ? "bg-red-50" : "bg-emerald-50"}`}>
      <p className={`text-sm font-black ${flagged ? "text-red-800" : "text-emerald-800"}`}>{copy.already}</p>
      <p className={`text-xs font-bold ${flagged ? "text-red-700" : "text-emerald-700"}`}>{copy.alreadyNote}</p>
    </div>
  );
}

/** A small burst of confetti from the phone when an order goes through. */
/** The sound each app makes when Pipo finishes the action after your OK. */
const DONE_SOUND: Record<PipoAction["app"], Sfx> = {
  whatsapp: "send",
  email: "send",
  shop: "pay",
  calendar: "add",
  site: "publish",
  game: "publish",
  chart: "add",
};

export function celebrate(app: PipoAction["app"]) {
  play(DONE_SOUND[app]);
  void confetti({
    particleCount: app === "shop" ? 90 : 50,
    spread: 70,
    origin: { x: 0.85, y: 0.75 },
    colors: ["#6e5cf2", "#8c7dfb", "#9cc2ff", "#fbbf24", "#34d399"],
    disableForReducedMotion: true,
  });
}
