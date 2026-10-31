// Engine types. Pure TypeScript: no React, no browser APIs.
import type { z } from "zod";
import type { FlawSchema, MissionSchema, PersonaSchema, PieceSchema, SlotSchema } from "./schema.ts";

// ---- Lessons ----
export type Mission = z.infer<typeof MissionSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type Piece = z.infer<typeof PieceSchema>;
export type Flaw = z.infer<typeof FlawSchema>;

// ---- Model (OpenAI-style Chat Completions) ----
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export interface ModelRequest {
  messages: ChatMessage[];
}

export interface ModelReply {
  content: string | null;
}

/** Injected so the engine runs without a network (live, replay, or fake in tests). */
export interface ModelClient {
  complete(request: ModelRequest): Promise<ModelReply>;
}

/** Injected clock, in milliseconds. */
export type Clock = () => number;

// ---- A run ----
export type PipoRun =
  | { status: "answered"; prompt: string; answer: string; ms: number }
  /** `failure` is internal. The player only ever sees a friendly retry. */
  | { status: "failed"; prompt: string; failure: string };

export interface Score {
  stars: 1 | 2 | 3;
  /** Weak pieces the player picked. */
  weakPicks: string[];
  /** Flaws whose condition holds: something the prompt left out or got wrong. */
  missedFlaws: string[];
  /** Missed flaws that actually showed up in Pipo's answer. */
  visibleFlaws: string[];
}

export interface RunLog {
  missionId: string;
  picks: string[];
  prompt: string;
  answer: string;
  ms: number;
  score: Score;
}
