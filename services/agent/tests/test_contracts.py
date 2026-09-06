"""Contract tests shared against the controlled Scene 04 fixture."""

from copy import deepcopy
import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import ValidationError

from services.agent.schemas import (
    CompleteDemoSeed,
    EvidenceType,
    Observation,
    Verdict,
    WrapDecision,
)

SEED_PATH = Path(__file__).parents[3] / "public" / "demo" / "scene-04-seed.json"


@pytest.fixture
def raw_seed() -> dict[str, Any]:
    """Load the exact fixture consumed by the TypeScript contract tests."""

    return json.loads(SEED_PATH.read_text(encoding="utf-8"))


def test_all_verdict_values_are_accepted(raw_seed: dict[str, Any]) -> None:
    for verdict in Verdict:
        decision = deepcopy(raw_seed["decision"])
        decision["verdict"] = verdict.value
        decision["pickup_plan"] = (
            raw_seed["decision"]["pickup_plan"]
            if verdict is Verdict.PICKUP_REQUIRED
            else None
        )

        assert WrapDecision.model_validate(decision).verdict is verdict


def test_unknown_verdict_is_rejected(raw_seed: dict[str, Any]) -> None:
    decision = deepcopy(raw_seed["decision"])
    decision["verdict"] = "wrap_it"

    with pytest.raises(ValidationError):
        WrapDecision.model_validate(decision)


@pytest.mark.parametrize("confidence", [-0.01, 1.01])
def test_out_of_range_confidence_is_rejected(
    raw_seed: dict[str, Any], confidence: float
) -> None:
    observation = deepcopy(raw_seed["observations"][0])
    observation["confidence"] = confidence

    with pytest.raises(ValidationError):
        Observation.model_validate(observation)


@pytest.mark.parametrize(
    "field_name",
    [
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
    ],
)
def test_required_observation_fields_cannot_be_omitted(
    raw_seed: dict[str, Any], field_name: str
) -> None:
    observation = deepcopy(raw_seed["observations"][0])
    del observation[field_name]

    with pytest.raises(ValidationError):
        Observation.model_validate(observation)


def test_required_evidence_types_are_defined() -> None:
    assert {evidence_type.value for evidence_type in EvidenceType} == {
        "dialogue_story_beat",
        "prop_state",
        "hand_action_state",
        "eyeline",
    }


def test_shared_seed_validates_without_transformations(
    raw_seed: dict[str, Any],
) -> None:
    parsed_seed = CompleteDemoSeed.model_validate(raw_seed)

    assert parsed_seed.model_dump(mode="json") == raw_seed


def test_seeded_decision_is_pickup_required(raw_seed: dict[str, Any]) -> None:
    seed = CompleteDemoSeed.model_validate(raw_seed)

    assert seed.decision.verdict is Verdict.PICKUP_REQUIRED


def test_every_decision_evidence_id_resolves(raw_seed: dict[str, Any]) -> None:
    seed = CompleteDemoSeed.model_validate(raw_seed)
    observation_ids = {
        observation.observation_id for observation in seed.observations
    }

    assert set(seed.decision.evidence_ids).issubset(observation_ids)


def test_every_flag_references_valid_takes(raw_seed: dict[str, Any]) -> None:
    seed = CompleteDemoSeed.model_validate(raw_seed)
    take_ids = {take.take_id for take in seed.takes}

    assert all(
        flag.master_take_id in take_ids and flag.compared_take_id in take_ids
        for flag in seed.flags
    )


def test_take_a_is_the_approved_master(raw_seed: dict[str, Any]) -> None:
    seed = CompleteDemoSeed.model_validate(raw_seed)
    approved_masters = [take for take in seed.takes if take.is_approved_master]

    assert [take.take_id for take in approved_masters] == ["take_a"]
    assert seed.decision.master_take_id == "take_a"


def test_seeded_sse_events_form_an_ordered_decision_lifecycle(
    raw_seed: dict[str, Any],
) -> None:
    seed = CompleteDemoSeed.model_validate(raw_seed)

    assert [event.sequence for event in seed.sse_events] == [0, 1, 2]
    assert [event.event_type.value for event in seed.sse_events] == [
        "analysis_started",
        "decision_created",
        "analysis_completed",
    ]
    assert seed.sse_events[1].payload["decision_id"] == seed.decision.decision_id
    assert seed.sse_events[1].payload["verdict"] == seed.decision.verdict.value
    assert seed.sse_events[2].payload["decision_id"] == seed.decision.decision_id
