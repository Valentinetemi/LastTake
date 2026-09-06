import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  completeDemoSeedSchema,
  evidenceTypeValues,
  observationSchema,
  type Observation,
  verdictValues,
  wrapDecisionSchema,
} from "../src/lib/contracts";

const seedPath = fileURLToPath(
  new URL("../../../public/demo/scene-04-seed.json", import.meta.url),
);
const rawSeed: unknown = JSON.parse(readFileSync(seedPath, "utf8"));
const seed = completeDemoSeedSchema.parse(rawSeed);

test("all verdict values are accepted", () => {
  for (const verdict of verdictValues) {
    const decision = {
      ...seed.decision,
      verdict,
      pickup_plan:
        verdict === "pickup_required" ? seed.decision.pickup_plan : null,
    };

    assert.equal(wrapDecisionSchema.parse(decision).verdict, verdict);
  }
});

test("unknown verdicts are rejected", () => {
  const result = wrapDecisionSchema.safeParse({
    ...seed.decision,
    verdict: "wrap_it",
  });

  assert.equal(result.success, false);
});

test("confidence below zero or above one is rejected", () => {
  for (const confidence of [-0.01, 1.01]) {
    const result = observationSchema.safeParse({
      ...seed.observations[0],
      confidence,
    });

    assert.equal(result.success, false, `accepted confidence ${confidence}`);
  }
});

test("required observation fields cannot be omitted", () => {
  const requiredFields = [
    "observation_id",
    "scene_id",
    "take_id",
    "beat_id",
    "evidence_type",
    "start_timecode",
    "end_timecode",
    "description",
    "normalized_value",
    "confidence",
    "source_uri",
    "approval_state",
    "created_at",
  ] as const satisfies readonly (keyof Observation)[];

  for (const field of requiredFields) {
    const incomplete: Record<string, unknown> = {
      ...seed.observations[0],
    };
    delete incomplete[field];

    assert.equal(
      observationSchema.safeParse(incomplete).success,
      false,
      `accepted observation without ${field}`,
    );
  }
});

test("required evidence types are defined", () => {
  assert.deepStrictEqual(evidenceTypeValues, [
    "dialogue_story_beat",
    "prop_state",
    "hand_action_state",
    "eyeline",
  ]);
});

test("the shared seed validates without transformations", () => {
  assert.deepStrictEqual(seed, rawSeed);
});

test("the seeded decision is pickup_required", () => {
  assert.equal(seed.decision.verdict, "pickup_required");
});

test("every decision evidence ID resolves to an observation", () => {
  const observationIds = new Set(
    seed.observations.map((observation) => observation.observation_id),
  );

  assert.ok(
    seed.decision.evidence_ids.every((evidenceId) =>
      observationIds.has(evidenceId),
    ),
  );
});

test("every flag references valid takes", () => {
  const takeIds = new Set(seed.takes.map((take) => take.take_id));

  assert.ok(
    seed.flags.every(
      (flag) =>
        takeIds.has(flag.master_take_id) &&
        takeIds.has(flag.compared_take_id),
    ),
  );
});

test("Take A is the approved master", () => {
  const approvedMasters = seed.takes.filter((take) => take.is_approved_master);

  assert.deepStrictEqual(
    approvedMasters.map((take) => take.take_id),
    ["take_a"],
  );
  assert.equal(seed.decision.master_take_id, "take_a");
});

test("seeded SSE events form an ordered decision lifecycle", () => {
  assert.deepStrictEqual(
    seed.sse_events.map((event) => event.sequence),
    [0, 1, 2],
  );
  assert.deepStrictEqual(
    seed.sse_events.map((event) => event.event_type),
    ["analysis_started", "decision_created", "analysis_completed"],
  );
  assert.equal(
    seed.sse_events[1].payload.decision_id,
    seed.decision.decision_id,
  );
  assert.equal(seed.sse_events[1].payload.verdict, seed.decision.verdict);
  assert.equal(
    seed.sse_events[2].payload.decision_id,
    seed.decision.decision_id,
  );
});
