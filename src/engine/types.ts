// Engine types. Pure TypeScript: no React, no browser APIs.
import type { z } from "zod";
import type {
  FixSchema,
  FlawSchema,
  GoalSchema,
  MissionSchema,
  PersonaSchema,
  ToolRoleSchema,
  ToolSchema,
} from "./schema.ts";

// ---- Missions ----
export type Mission = z.infer<typeof MissionSchema>;
export type Persona = z.infer<typeof PersonaSchema>;
export type ToolRole = z.infer<typeof ToolRoleSchema>;
export type Tool = z.infer<typeof ToolSchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Flaw = z.infer<typeof FlawSchema>;
export type Fix = z.infer<typeof FixSchema>;

/** What the player chose before pressing "Pipo, go!". */
export interface Setup {
  equipped: string[];
  goalId: string;
}

// ---- Model (OpenAI-style Chat Completions) ----
export interface WireToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: WireToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface ToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ModelRequest {
  messages: ChatMessage[];
  tools: ToolDefinition[];
}

export interface ToolCall {
  id: string;
  name: string;
  /** Raw JSON string from the model. May be malformed. */
  arguments: string;
}

export interface ModelReply {
  content: string | null;
  toolCalls: ToolCall[];
}

/** Injected so the engine runs without a network (live, replay, or fake in tests). */
export interface ModelClient {
  complete(request: ModelRequest): Promise<ModelReply>;
}

/** Injected clock, in milliseconds. */
export type Clock = () => number;

// ---- Run log ----
export type RunStep =
  | { kind: "model"; ms: number; content: string | null; toolCalls: ToolCall[] }
  | { kind: "tool"; callId: string; toolId: string; args: Record<string, unknown> | null; result: unknown; ok: boolean }
  | { kind: "gate"; callId: string; toolId: string; args: Record<string, unknown> | null };

/** What the player reviews at the approval gate. */
export interface Draft {
  /** The tool the draft came from (the gated tool, a writing tool, or "answer"). */
  source: string;
  fields: Record<string, string>;
  /** All fields joined, used for flaw signals. */
  text: string;
}

export interface AgentRun {
  status: "gate" | "failed";
  steps: RunStep[];
  draft: Draft | null;
  /** True when the model itself asked to use the gated tool. */
  reachedGatedTool: boolean;
  /** Internal reason for a failed run. Never shown to the player. */
  failure?: string;
}

export type GateDecision = { type: "approve" } | { type: "stop" } | { type: "fix"; fixId: string };

export interface ScoreChecks {
  safeOutcome: boolean;
  requiredTools: boolean;
  goodGoal: boolean;
  correctDecision: boolean;
  noTrap: boolean;
}

export interface Score {
  stars: 0 | 1 | 2 | 3;
  checks: ScoreChecks;
  activeFlaws: string[];
  missingRequired: string[];
  trapsEquipped: string[];
}

export interface RunLog {
  missionId: string;
  equipped: string[];
  goalId: string;
  steps: RunStep[];
  draft: Draft | null;
  gateDecision: GateDecision;
  activeFlaws: string[];
  score: Score;
}
