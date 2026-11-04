// "Pipodojo" in the playground's headers (making your Pipo, a lesson, the town) is a link back to
// the front page. The way home comes from App through HomeContext, so screens don't pass it along.
import { createContext, useContext, type ReactNode } from "react";
import { play } from "../app/sound.ts";
import { useLang } from "../i18n/index.tsx";

/** Takes the player back to the front page (set by App). */
export const HomeContext = createContext<(() => void) | null>(null);

/** The way back to the front page, for a screen's own back button (null outside the app). */
export function useGoHome(): (() => void) | null {
  return useContext(HomeContext);
}

/** Its children (the name, by default) as a link to the front page; plain text if there's no way home. */
export function HomeLink({ className = "", children = "Pipodojo" }: { className?: string; children?: ReactNode }) {
  const goHome = useContext(HomeContext);
  const { t } = useLang();
  if (!goHome) return <span className={className}>{children}</span>;
  return (
    <a
      href="/"
      title={t.common.home}
      onClick={(e) => {
        // A plain click stays in the app (with its page sweep); Ctrl or Cmd-click still opens a new tab.
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        play("tap");
        goHome();
      }}
      className={`rounded-lg decoration-2 underline-offset-4 transition hover:text-brand-900 hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${className}`}
    >
      {children}
    </a>
  );
}
