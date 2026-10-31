// Minimal types for the untyped graphics libraries behind Pipo's brain panel.
declare module "three";

declare module "vanta/dist/vanta.net.min" {
  export interface VantaNetPoint {
    /** Rotation rate, set once by Vanta. */
    r: number;
    /** Our copy of the starting rate, so thinking can speed it up and back down. */
    baseR?: number;
  }
  export interface VantaNetEffect {
    points: VantaNetPoint[] | null;
    setOptions(options: Record<string, unknown>): void;
    destroy(): void;
  }
  export type VantaNetFactory = (options: Record<string, unknown>) => VantaNetEffect;
  // It's a UMD bundle: depending on the bundler the factory arrives as default or default.default.
  const NET: VantaNetFactory | { default: VantaNetFactory };
  export default NET;
}
