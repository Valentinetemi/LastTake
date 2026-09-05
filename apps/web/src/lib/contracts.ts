import { z } from "zod";

const nonEmptyStringSchema = z.string().min(1);
export const timecodeSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}\.\d{3}$/);
export const timestampSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
export const sourceUriSchema = z
  .string()
  .regex(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/\S+$/);
export const confidenceSchema = z.number().min(0).max(1);

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

export const approvalStateValues = ["pending", "approved", "rejected"] as const;
export const approvalStateSchema = z.enum(approvalStateValues);
export type ApprovalState = z.infer<typeof approvalStateSchema>;

export const flagTypeValues = [
  "continuity_mismatch",
  "action_mismatch",
  "coverage_missing",
] as const;
export const flagTypeSchema = z.enum(flagTypeValues);
export type FlagType = z.infer<typeof flagTypeSchema>;

export const sseEventTypeValues = [
  "analysis_started",
  "observation_created",
  "flag_created",
  "decision_created",
  "analysis_completed",
  "error",
] as const;
export const sseEventTypeSchema = z.enum(sseEventTypeValues);
export type SSEEventType = z.infer<typeof sseEventTypeSchema>;

export const sceneSchema = z.strictObject({
  scene_id: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  script_uri: sourceUriSchema,
  created_at: timestampSchema,
});

export type Scene = z.infer<typeof sceneSchema>;

export const scriptBeatSchema = z.strictObject({
  beat_id: nonEmptyStringSchema,
  scene_id: nonEmptyStringSchema,
  sequence: z.number().int().min(1),
  evidence_type: evidenceTypeSchema,
  description: nonEmptyStringSchema,
  expected_value: nonEmptyStringSchema,
  line_text: nonEmptyStringSchema.nullable(),
});

export type ScriptBeat = z.infer<typeof scriptBeatSchema>;

export const takeSchema = z.strictObject({
  take_id: nonEmptyStringSchema,
  scene_id: nonEmptyStringSchema,
  label: nonEmptyStringSchema,
  source_uri: sourceUriSchema,
  duration_seconds: z.number().positive(),
  is_approved_master: z.boolean(),
  captured_at: timestampSchema,
});

export type Take = z.infer<typeof takeSchema>;

export const observationSchema = z
  .strictObject({
    observation_id: nonEmptyStringSchema,
    scene_id: nonEmptyStringSchema,
    take_id: nonEmptyStringSchema,
    beat_id: nonEmptyStringSchema,
    evidence_type: evidenceTypeSchema,
    start_timecode: timecodeSchema,
    end_timecode: timecodeSchema,
    description: nonEmptyStringSchema,
    normalized_value: nonEmptyStringSchema,
    confidence: confidenceSchema,
    source_uri: sourceUriSchema,
    approval_state: approvalStateSchema,
    created_at: timestampSchema,
  })
  .refine(
    (observation) => observation.end_timecode >= observation.start_timecode,
    {
      message: "end_timecode must not precede start_timecode",
      path: ["end_timecode"],
    },
  );

export type Observation = z.infer<typeof observationSchema>;

export const flagSchema = z
  .strictObject({
    flag_id: nonEmptyStringSchema,
    scene_id: nonEmptyStringSchema,
    beat_id: nonEmptyStringSchema,
    evidence_type: evidenceTypeSchema,
    flag_type: flagTypeSchema,
    master_take_id: nonEmptyStringSchema,
    compared_take_id: nonEmptyStringSchema,
    master_observation_id: nonEmptyStringSchema,
    compared_observation_id: nonEmptyStringSchema,
    master_timecode: timecodeSchema,
    compared_timecode: timecodeSchema,
    description: nonEmptyStringSchema,
    confidence: confidenceSchema,
    blocking: z.boolean(),
  })
  .refine((flag) => flag.master_take_id !== flag.compared_take_id, {
    message: "master_take_id and compared_take_id must differ",
    path: ["compared_take_id"],
  });

export type Flag = z.infer<typeof flagSchema>;

export const wrapDecisionSchema = z
  .strictObject({
    decision_id: nonEmptyStringSchema,
    scene_id: nonEmptyStringSchema,
    master_take_id: nonEmptyStringSchema,
    evaluated_take_id: nonEmptyStringSchema,
    verdict: verdictSchema,
    summary: nonEmptyStringSchema,
    confidence: confidenceSchema,
    evidence_ids: z.array(nonEmptyStringSchema).min(1),
    flag_ids: z.array(nonEmptyStringSchema),
    pickup_plan: nonEmptyStringSchema.nullable(),
    created_at: timestampSchema,
  })
  .superRefine((decision, context) => {
    if (decision.master_take_id === decision.evaluated_take_id) {
      context.addIssue({
        code: "custom",
        message: "master_take_id and evaluated_take_id must differ",
        path: ["evaluated_take_id"],
      });
    }
    if (new Set(decision.evidence_ids).size !== decision.evidence_ids.length) {
      context.addIssue({
        code: "custom",
        message: "evidence_ids must be unique",
        path: ["evidence_ids"],
      });
    }
    if (new Set(decision.flag_ids).size !== decision.flag_ids.length) {
      context.addIssue({
        code: "custom",
        message: "flag_ids must be unique",
        path: ["flag_ids"],
      });
    }
    if (decision.verdict === "pickup_required" && decision.pickup_plan === null) {
      context.addIssue({
        code: "custom",
        message: "pickup_required decisions need a pickup_plan",
        path: ["pickup_plan"],
      });
    }
  });

export type WrapDecision = z.infer<typeof wrapDecisionSchema>;
