// Engine types. Pure TypeScript: no React, no browser APIs.
import type { z } from "zod";
import type { FlawSchema, MissionSchema, PersonaSchema, PieceSchema, SlotSchema, ToolSchema } from "./schema.ts";

// ---- Lessons ----
export type Mission = z.infer<typeof MissionSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type Piece = z.infer<typeof PieceSchema>;
export type Flaw = z.infer<typeof FlawSchema>;
/** A pretend app action Pipo can take in a lesson, e.g. send a WhatsApp message. */
export type Tool = z.infer<typeof ToolSchema>;

// ---- Model (OpenAI-style Chat Completions) ----
export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ModelRequest {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ModelReply {
  content: string | null;
  /** Tool calls the model chose, in order. Empty or missing when it just replied in text. */
  toolCalls?: ToolCall[];
  /** The model that answered, as reported by the API (for the under-the-hood view). */
  model?: string;
}

/** Injected so the engine runs without a network (live, replay, or fake in tests). */
export interface ModelClient {
  complete(request: ModelRequest): Promise<ModelReply>;
}

/** Injected clock, in milliseconds. */
export type Clock = () => number;

// ---- A run ----
/** What Pipo did in an app (from a tool call), drawn as a phone mockup. */
export interface PipoAction {
  tool: string;
  app: Tool["app"];
  outcome: Tool["outcome"];
  args: Record<string, unknown>;
}

export type PipoRun =
  /** `answer` is always text lines (scored by the flaws); `action` is set when Pipo used a tool. */
  | { status: "answered"; prompt: string; answer: string; ms: number; action?: PipoAction }
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
  action?: PipoAction;
  ms: number;
  score: Score;
}
