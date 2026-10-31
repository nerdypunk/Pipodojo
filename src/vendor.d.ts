// Minimal types for the untyped graphics libraries behind Pipo's stage.
declare module "three";

declare module "vanta/dist/vanta.halo.min" {
  export interface VantaEffect {
    setOptions(options: Record<string, unknown>): void;
    resize(): void;
    destroy(): void;
  }
  export type VantaFactory = (options: Record<string, unknown>) => VantaEffect;
  // It's a UMD bundle: depending on the bundler the factory arrives as default or default.default.
  const HALO: VantaFactory | { default: VantaFactory };
  export default HALO;
}
