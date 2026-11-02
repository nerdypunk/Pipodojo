// Whether the town's intro has started. The 3D view stays paused while its shaders are prepared
// (see WarmUp in TownCanvas.tsx); name tags and labels wait for this so they pop in with the
// buildings rather than early, at the wrong place.
import { createContext, useContext } from "react";

export const ReadyContext = createContext(false);
export const useTownReady = () => useContext(ReadyContext);
