// Typed access to peel.js (vendored, MIT), which registers itself as window.Peel.
import "./peel.js";
import "./peel.css";

export interface PeelInstance {
  setPeelPosition(x: number, y: number): void;
  setFadeThreshold(n: number): void;
  getAmountClipped(): number;
  handleDrag(fn: (this: PeelInstance, evt: MouseEvent | TouchEvent, x: number, y: number) => void, el?: HTMLElement): void;
  handlePress(fn: (this: PeelInstance, evt: MouseEvent | TouchEvent, x: number, y: number) => void, el?: HTMLElement): void;
  removeEvents(): void;
}

export interface PeelStatic {
  new (el: HTMLElement, options?: Record<string, unknown>): PeelInstance;
  Corners: { TOP_LEFT: number; TOP_RIGHT: number; BOTTOM_LEFT: number; BOTTOM_RIGHT: number };
  /** False on browsers without clip-path and transforms. */
  supported: boolean;
}

export const Peel = (window as unknown as { Peel: PeelStatic }).Peel;
