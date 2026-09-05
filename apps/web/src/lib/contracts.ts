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

export const sseEventSchema = z.strictObject({
  event_id: nonEmptyStringSchema,
  event_type: sseEventTypeSchema,
  scene_id: nonEmptyStringSchema,
  take_id: nonEmptyStringSchema.nullable(),
  sequence: z.number().int().min(0),
  payload: z.record(z.string(), z.unknown()),
  created_at: timestampSchema,
});

export type SSEEvent = z.infer<typeof sseEventSchema>;

export const completeDemoSeedSchema = z
  .strictObject({
    scene: sceneSchema,
    script_beats: z.array(scriptBeatSchema).min(1),
    takes: z.array(takeSchema).min(2),
    observations: z.array(observationSchema).min(1),
    flags: z.array(flagSchema).min(1),
    decision: wrapDecisionSchema,
    sse_events: z.array(sseEventSchema).min(1),
  })
  .superRefine((seed, context) => {
    const addIssue = (path: (string | number)[], message: string) => {
      context.addIssue({ code: "custom", path, message });
    };
    const requireUnique = (
      values: (string | number)[],
      path: string,
      label: string,
    ) => {
      if (new Set(values).size !== values.length) {
        addIssue([path], `${label} must be unique`);
      }
    };

    requireUnique(seed.script_beats.map((beat) => beat.beat_id), "script_beats", "beat IDs");
    requireUnique(seed.takes.map((take) => take.take_id), "takes", "take IDs");
    requireUnique(
      seed.observations.map((observation) => observation.observation_id),
      "observations",
      "observation IDs",
    );
    requireUnique(seed.flags.map((flag) => flag.flag_id), "flags", "flag IDs");
    requireUnique(seed.sse_events.map((event) => event.event_id), "sse_events", "event IDs");
    requireUnique(seed.sse_events.map((event) => event.sequence), "sse_events", "event sequences");

    const sceneId = seed.scene.scene_id;
    const beatById = new Map(seed.script_beats.map((beat) => [beat.beat_id, beat]));
    const takeById = new Map(seed.takes.map((take) => [take.take_id, take]));
    const observationById = new Map(
      seed.observations.map((observation) => [observation.observation_id, observation]),
    );
    const flagIds = new Set(seed.flags.map((flag) => flag.flag_id));

    seed.script_beats.forEach((beat, index) => {
      if (beat.scene_id !== sceneId) {
        addIssue(["script_beats", index, "scene_id"], "script beat must reference the seed scene");
      }
    });
    seed.takes.forEach((take, index) => {
      if (take.scene_id !== sceneId) {
        addIssue(["takes", index, "scene_id"], "take must reference the seed scene");
      }
    });

    const approvedMasters = seed.takes.filter((take) => take.is_approved_master);
    if (approvedMasters.length !== 1) {
      addIssue(["takes"], "the seed must contain exactly one approved master take");
    }

    seed.observations.forEach((observation, index) => {
      const beat = beatById.get(observation.beat_id);
      if (observation.scene_id !== sceneId) {
        addIssue(["observations", index, "scene_id"], "observation must reference the seed scene");
      }
      if (!takeById.has(observation.take_id)) {
        addIssue(["observations", index, "take_id"], "observation must reference an existing take");
      }
      if (!beat) {
        addIssue(["observations", index, "beat_id"], "observation must reference an existing beat");
      } else if (observation.evidence_type !== beat.evidence_type) {
        addIssue(
          ["observations", index, "evidence_type"],
          "observation evidence type must match its script beat",
        );
      }
    });

    seed.flags.forEach((flag, index) => {
      const masterObservation = observationById.get(flag.master_observation_id);
      const comparedObservation = observationById.get(flag.compared_observation_id);
      if (flag.scene_id !== sceneId) {
        addIssue(["flags", index, "scene_id"], "flag must reference the seed scene");
      }
      if (!beatById.has(flag.beat_id)) {
        addIssue(["flags", index, "beat_id"], "flag must reference an existing beat");
      }
      if (!takeById.has(flag.master_take_id)) {
        addIssue(["flags", index, "master_take_id"], "master_take_id must reference an existing take");
      }
      if (!takeById.has(flag.compared_take_id)) {
        addIssue(["flags", index, "compared_take_id"], "compared_take_id must reference an existing take");
      }
      if (!masterObservation || !comparedObservation) {
        addIssue(["flags", index], "flag must reference existing observations");
        return;
      }
      if (masterObservation.take_id !== flag.master_take_id) {
        addIssue(["flags", index, "master_observation_id"], "master observation must belong to master_take_id");
      }
      if (comparedObservation.take_id !== flag.compared_take_id) {
        addIssue(["flags", index, "compared_observation_id"], "compared observation must belong to compared_take_id");
      }
      if (
        masterObservation.beat_id !== flag.beat_id ||
        comparedObservation.beat_id !== flag.beat_id
      ) {
        addIssue(["flags", index, "beat_id"], "flag observations must belong to the referenced beat");
      }
      if (
        masterObservation.evidence_type !== flag.evidence_type ||
        comparedObservation.evidence_type !== flag.evidence_type
      ) {
        addIssue(["flags", index, "evidence_type"], "flag evidence type must match its observations");
      }
      if (masterObservation.start_timecode !== flag.master_timecode) {
        addIssue(["flags", index, "master_timecode"], "master_timecode must match the master observation");
      }
      if (comparedObservation.start_timecode !== flag.compared_timecode) {
        addIssue(["flags", index, "compared_timecode"], "compared_timecode must match the compared observation");
      }
    });

    const decision = seed.decision;
    if (decision.scene_id !== sceneId) {
      addIssue(["decision", "scene_id"], "decision must reference the seed scene");
    }
    if (!takeById.has(decision.master_take_id)) {
      addIssue(["decision", "master_take_id"], "master_take_id must reference an existing take");
    } else if (!takeById.get(decision.master_take_id)?.is_approved_master) {
      addIssue(["decision", "master_take_id"], "master_take_id must be the approved master");
    }
    if (!takeById.has(decision.evaluated_take_id)) {
      addIssue(["decision", "evaluated_take_id"], "evaluated_take_id must reference an existing take");
    }
    decision.evidence_ids.forEach((evidenceId, index) => {
      if (!observationById.has(evidenceId)) {
        addIssue(["decision", "evidence_ids", index], "evidence ID must reference an observation");
      }
    });
    if (
      decision.flag_ids.length !== flagIds.size ||
      decision.flag_ids.some((flagId) => !flagIds.has(flagId))
    ) {
      addIssue(["decision", "flag_ids"], "decision must reference every seed flag exactly once");
    }
    const decisionEvidenceIds = new Set(decision.evidence_ids);
    seed.flags.forEach((flag) => {
      if (!decisionEvidenceIds.has(flag.master_observation_id)) {
        addIssue(["decision", "evidence_ids"], "decision evidence must include every flagged observation");
      }
      if (!decisionEvidenceIds.has(flag.compared_observation_id)) {
        addIssue(["decision", "evidence_ids"], "decision evidence must include every flagged observation");
      }
    });

    seed.sse_events.forEach((event, index) => {
      if (event.scene_id !== sceneId) {
        addIssue(["sse_events", index, "scene_id"], "SSE event must reference the seed scene");
      }
      if (event.take_id !== null && !takeById.has(event.take_id)) {
        addIssue(["sse_events", index, "take_id"], "SSE event take_id must reference an existing take");
      }
    });
  });

export type CompleteDemoSeed = z.infer<typeof completeDemoSeedSchema>;
