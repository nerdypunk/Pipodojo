// Pipo's phone, floating over the lesson after Pipo acts in an app. It starts top right on wide
// screens (clear of the result buttons) and bottom centre on phones. You can drag it, it tilts
// toward the pointer, and it folds into a small button. When Pipo is holding something for your
// OK (a draft or a cart), Send / Pay asks Pipo to go ahead and Pipo finishes it with its own call.
import confetti from "canvas-confetti";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useRef, type PointerEvent } from "react";
import { readable } from "../engine/actions.ts";
import type { PipoAction } from "../engine/types.ts";
import { PhoneScreen } from "./PhoneMockup.tsx";

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

const TILT = 10;

export function FloatingPhone({ action, flags, status, open, onOpen, onClose, onApprove }: Props) {
  const still = useReducedMotion();
  const bounds = useRef<HTMLDivElement>(null);
  const rotateX = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const rotateY = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });

  const tilt = (e: PointerEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    rotateY.set(((e.clientX - r.left) / r.width - 0.5) * TILT * 2);
    rotateX.set(-((e.clientY - r.top) / r.height - 0.5) * TILT * 2);
  };
  const untilt = () => {
    rotateX.set(0);
    rotateY.set(0);
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
        <span aria-hidden="true">📱</span> Pipo's phone
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
        dragElastic={0.08}
        dragMomentum={false}
        whileDrag={{ scale: 1.04, cursor: "grabbing" }}
        initial={still ? false : { opacity: 0, y: 80, scale: 0.85, rotate: -6 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.35, duration: 0.6 }}
        style={{ rotateX, rotateY, transformPerspective: 900 }}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className="fixed bottom-3 left-[calc(50%-136px)] z-50 w-[272px] cursor-grab touch-none md:top-24 md:right-8 md:bottom-auto md:left-auto"
        role="dialog"
        aria-label="Pipo's phone"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Put the phone away"
          className="absolute -top-3 -left-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-lg font-black text-ink shadow-md hover:bg-brand-50"
        >
          <span aria-hidden="true">–</span>
        </button>

        <div className="rounded-[38px] bg-ink p-[7px] shadow-[0_30px_60px_-15px_rgb(27_22_64/0.65)]">
          <div className="relative overflow-hidden rounded-[31px] bg-white">
            {/* Status bar with a little camera island */}
            <div className="flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-black text-ink">
              <span>9:41</span>
              <span className="h-4 w-16 rounded-full bg-ink" aria-hidden="true" />
              <span aria-hidden="true">📶 🔋</span>
            </div>

            <PhoneScreen action={action} flags={flags} />
            <PhoneFooter action={action} flags={flags} status={status} onApprove={onApprove} onLater={onClose} />

            <div className="flex justify-center pt-1 pb-2" aria-hidden="true">
              <span className="h-1 w-24 rounded-full bg-ink/80" />
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
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
  const chat = action.app === "whatsapp";
  const total = readable(action.args.total);
  const flagged = flags.at(-1);

  if (status === "review") {
    return (
      <div className="space-y-2 border-t border-gray-100 px-3 pt-2 pb-1">
        <p className="text-center text-xs font-extrabold text-amber-800">
          ⏳ {chat ? "Pipo wrote this. Send it?" : "Pipo filled the cart. Pay for it?"}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onLater}
            className="flex-1 rounded-xl border-2 border-gray-200 py-2 text-sm font-extrabold text-gray-700 hover:bg-gray-50"
          >
            Not yet
          </button>
          <motion.button
            type="button"
            onClick={onApprove}
            whileTap={{ scale: 0.94 }}
            className={`flex-[1.4] rounded-xl py-2 text-sm font-black text-white shadow-sm ${chat ? "bg-emerald-600 hover:bg-emerald-700" : "bg-brand-600 hover:bg-brand-700"}`}
          >
            {chat ? "Send ➤" : `Pay $${total}`}
          </motion.button>
        </div>
      </div>
    );
  }

  if (status === "working") {
    return (
      <div className="flex items-center justify-center gap-2 border-t border-gray-100 px-3 py-3 text-sm font-extrabold text-brand-700" role="status">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 motion-reduce:animate-none" />
        {chat ? "Pipo is sending it…" : "Pipo is paying…"}
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="pop-in border-t border-gray-100 px-3 py-2.5 text-center" role="status">
        <p className="text-sm font-black text-emerald-700">
          {chat ? "✓✓ Sent! Pipo sent it after your OK." : "🎉 Order placed after your OK!"}
        </p>
        {!chat && <p className="text-xs font-bold text-gray-600">Arrives {readable(action.args.delivery)}</p>}
      </div>
    );
  }

  // Pipo went ahead at Check: nothing to approve, and that's the lesson.
  return (
    <div className={`border-t border-gray-100 px-3 py-2.5 text-center ${flagged ? "bg-red-50" : "bg-emerald-50"}`}>
      <p className={`text-sm font-black ${flagged ? "text-red-800" : "text-emerald-800"}`}>
        {chat ? "✅ Already sent" : `✅ Already paid $${total}`}
      </p>
      <p className={`text-xs font-bold ${flagged ? "text-red-700" : "text-emerald-700"}`}>
        {chat ? "Pipo sent it before you could check it." : "Pipo paid before you could check the cart."}
      </p>
    </div>
  );
}

/** A small burst of confetti from the phone when an order goes through. */
export function celebrate(app: PipoAction["app"]) {
  void confetti({
    particleCount: app === "shop" ? 90 : 50,
    spread: 70,
    origin: { x: 0.85, y: 0.75 },
    colors: ["#6e5cf2", "#8c7dfb", "#9cc2ff", "#fbbf24", "#34d399"],
    disableForReducedMotion: true,
  });
}
