// Closes a small panel (the town's ranking, the phone's "you" card) when the player presses anywhere
// outside it, and lets that press do what it was for. A full-screen invisible layer used to catch
// those presses instead, so with the ranking open a tap on "Back to homepage" only closed the
// ranking: the button seemed not to work.
import { useEffect, type RefObject } from "react";

/**
 * `panel`: the panel itself. `toggle`: a selector for the button that opens it; presses there are
 * left to that button (it toggles the panel), so pressing it again closes instead of reopening.
 */
export function useCloseOnOutside(panel: RefObject<HTMLElement | null>, onClose: () => void, toggle?: string) {
  useEffect(() => {
    const away = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || panel.current?.contains(target)) return;
      if (toggle && target.closest(toggle)) return;
      onClose();
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [panel, onClose, toggle]);
}
