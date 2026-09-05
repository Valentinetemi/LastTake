import { z } from "zod";

export const verdictValues = [
  "missing_evidence",
  "pickup_required",
  "safe_to_wrap",
] as const;

export const verdictSchema = z.enum(verdictValues);

export type Verdict = z.infer<typeof verdictSchema>;

export const evidenceTypeValues = [
  "dialogue_story_beat",
  "prop_state",
  "hand_action_state",
  "eyeline",
] as const;

export const evidenceTypeSchema = z.enum(evidenceTypeValues);

export type EvidenceType = z.infer<typeof evidenceTypeSchema>;
