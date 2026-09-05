"""Runtime-validatable shared contracts for LastTake."""

from enum import Enum
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, model_validator

TIMECODE_PATTERN = r"^\d{2}:\d{2}:\d{2}\.\d{3}$"
TIMESTAMP_PATTERN = r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$"
SOURCE_URI_PATTERN = r"^[A-Za-z][A-Za-z0-9+.-]*://\S+$"

NonEmptyString = Annotated[str, Field(min_length=1)]
Timecode = Annotated[str, Field(pattern=TIMECODE_PATTERN)]
Timestamp = Annotated[str, Field(pattern=TIMESTAMP_PATTERN)]
SourceUri = Annotated[str, Field(pattern=SOURCE_URI_PATTERN)]
Confidence = Annotated[float, Field(ge=0, le=1)]


class ContractModel(BaseModel):
    """Base contract that rejects fields not defined by the shared schema."""

    model_config = ConfigDict(extra="forbid")


class Verdict(str, Enum):
    MISSING_EVIDENCE = "missing_evidence"
    PICKUP_REQUIRED = "pickup_required"
    SAFE_TO_WRAP = "safe_to_wrap"


class EvidenceType(str, Enum):
    DIALOGUE_STORY_BEAT = "dialogue_story_beat"
    PROP_STATE = "prop_state"
    HAND_ACTION_STATE = "hand_action_state"
    EYELINE = "eyeline"


class ApprovalState(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class FlagType(str, Enum):
    CONTINUITY_MISMATCH = "continuity_mismatch"
    ACTION_MISMATCH = "action_mismatch"
    COVERAGE_MISSING = "coverage_missing"


class SSEEventType(str, Enum):
    ANALYSIS_STARTED = "analysis_started"
    OBSERVATION_CREATED = "observation_created"
    FLAG_CREATED = "flag_created"
    DECISION_CREATED = "decision_created"
    ANALYSIS_COMPLETED = "analysis_completed"
    ERROR = "error"


class Scene(ContractModel):
    scene_id: NonEmptyString
    name: NonEmptyString
    script_uri: SourceUri
    created_at: Timestamp


class ScriptBeat(ContractModel):
    beat_id: NonEmptyString
    scene_id: NonEmptyString
    sequence: Annotated[int, Field(ge=1)]
    evidence_type: EvidenceType
    description: NonEmptyString
    expected_value: NonEmptyString
    line_text: NonEmptyString | None


class Take(ContractModel):
    take_id: NonEmptyString
    scene_id: NonEmptyString
    label: NonEmptyString
    source_uri: SourceUri
    duration_seconds: Annotated[float, Field(gt=0)]
    is_approved_master: bool
    captured_at: Timestamp


class Observation(ContractModel):
    observation_id: NonEmptyString
    scene_id: NonEmptyString
    take_id: NonEmptyString
    beat_id: NonEmptyString
    evidence_type: EvidenceType
    start_timecode: Timecode
    end_timecode: Timecode
    description: NonEmptyString
    normalized_value: NonEmptyString
    confidence: Confidence
    source_uri: SourceUri
    approval_state: ApprovalState
    created_at: Timestamp

    @model_validator(mode="after")
    def validate_timecode_order(self) -> "Observation":
        if self.end_timecode < self.start_timecode:
            raise ValueError("end_timecode must not precede start_timecode")
        return self


class Flag(ContractModel):
    flag_id: NonEmptyString
    scene_id: NonEmptyString
    beat_id: NonEmptyString
    evidence_type: EvidenceType
    flag_type: FlagType
    master_take_id: NonEmptyString
    compared_take_id: NonEmptyString
    master_observation_id: NonEmptyString
    compared_observation_id: NonEmptyString
    master_timecode: Timecode
    compared_timecode: Timecode
    description: NonEmptyString
    confidence: Confidence
    blocking: bool

    @model_validator(mode="after")
    def validate_distinct_takes(self) -> "Flag":
        if self.master_take_id == self.compared_take_id:
            raise ValueError("master_take_id and compared_take_id must differ")
        return self


class WrapDecision(ContractModel):
    decision_id: NonEmptyString
    scene_id: NonEmptyString
    master_take_id: NonEmptyString
    evaluated_take_id: NonEmptyString
    verdict: Verdict
    summary: NonEmptyString
    confidence: Confidence
    evidence_ids: Annotated[list[NonEmptyString], Field(min_length=1)]
    flag_ids: list[NonEmptyString]
    pickup_plan: NonEmptyString | None
    created_at: Timestamp

    @model_validator(mode="after")
    def validate_decision(self) -> "WrapDecision":
        if self.master_take_id == self.evaluated_take_id:
            raise ValueError("master_take_id and evaluated_take_id must differ")
        if len(self.evidence_ids) != len(set(self.evidence_ids)):
            raise ValueError("evidence_ids must be unique")
        if len(self.flag_ids) != len(set(self.flag_ids)):
            raise ValueError("flag_ids must be unique")
        if self.verdict is Verdict.PICKUP_REQUIRED and self.pickup_plan is None:
            raise ValueError("pickup_required decisions need a pickup_plan")
        return self


class SSEEvent(ContractModel):
    event_id: NonEmptyString
    event_type: SSEEventType
    scene_id: NonEmptyString
    take_id: NonEmptyString | None
    sequence: Annotated[int, Field(ge=0)]
    payload: dict[str, Any]
    created_at: Timestamp


class CompleteDemoSeed(ContractModel):
    scene: Scene
    script_beats: Annotated[list[ScriptBeat], Field(min_length=1)]
    takes: Annotated[list[Take], Field(min_length=2)]
    observations: Annotated[list[Observation], Field(min_length=1)]
    flags: Annotated[list[Flag], Field(min_length=1)]
    decision: WrapDecision
    sse_events: Annotated[list[SSEEvent], Field(min_length=1)]

    @model_validator(mode="after")
    def validate_references(self) -> "CompleteDemoSeed":
        def require_unique(values: list[str], label: str) -> None:
            if len(values) != len(set(values)):
                raise ValueError(f"{label} must be unique")

        require_unique([beat.beat_id for beat in self.script_beats], "beat IDs")
        require_unique([take.take_id for take in self.takes], "take IDs")
        require_unique(
            [observation.observation_id for observation in self.observations],
            "observation IDs",
        )
        require_unique([flag.flag_id for flag in self.flags], "flag IDs")
        require_unique([event.event_id for event in self.sse_events], "event IDs")
        require_unique(
            [str(event.sequence) for event in self.sse_events], "event sequences"
        )

        scene_id = self.scene.scene_id
        beat_by_id = {beat.beat_id: beat for beat in self.script_beats}
        take_by_id = {take.take_id: take for take in self.takes}
        observation_by_id = {
            observation.observation_id: observation
            for observation in self.observations
        }
        flag_by_id = {flag.flag_id: flag for flag in self.flags}

        if any(beat.scene_id != scene_id for beat in self.script_beats):
            raise ValueError("every script beat must reference the seed scene")
        if any(take.scene_id != scene_id for take in self.takes):
            raise ValueError("every take must reference the seed scene")

        approved_masters = [take for take in self.takes if take.is_approved_master]
        if len(approved_masters) != 1:
            raise ValueError("the seed must contain exactly one approved master take")

        for observation in self.observations:
            beat = beat_by_id.get(observation.beat_id)
            if observation.scene_id != scene_id:
                raise ValueError("every observation must reference the seed scene")
            if observation.take_id not in take_by_id:
                raise ValueError("every observation must reference an existing take")
            if beat is None:
                raise ValueError("every observation must reference an existing beat")
            if observation.evidence_type is not beat.evidence_type:
                raise ValueError("observation evidence type must match its script beat")

        for flag in self.flags:
            master_observation = observation_by_id.get(flag.master_observation_id)
            compared_observation = observation_by_id.get(flag.compared_observation_id)
            if flag.scene_id != scene_id:
                raise ValueError("every flag must reference the seed scene")
            if flag.beat_id not in beat_by_id:
                raise ValueError("every flag must reference an existing beat")
            if flag.master_take_id not in take_by_id:
                raise ValueError("every flag master_take_id must reference an existing take")
            if flag.compared_take_id not in take_by_id:
                raise ValueError("every flag compared_take_id must reference an existing take")
            if master_observation is None or compared_observation is None:
                raise ValueError("every flag must reference existing observations")
            if master_observation.take_id != flag.master_take_id:
                raise ValueError("flag master observation must belong to master_take_id")
            if compared_observation.take_id != flag.compared_take_id:
                raise ValueError("flag compared observation must belong to compared_take_id")
            if (
                master_observation.beat_id != flag.beat_id
                or compared_observation.beat_id != flag.beat_id
            ):
                raise ValueError("flag observations must belong to the referenced beat")
            if (
                master_observation.evidence_type is not flag.evidence_type
                or compared_observation.evidence_type is not flag.evidence_type
            ):
                raise ValueError("flag evidence type must match its observations")
            if master_observation.start_timecode != flag.master_timecode:
                raise ValueError("master_timecode must match the master observation")
            if compared_observation.start_timecode != flag.compared_timecode:
                raise ValueError("compared_timecode must match the compared observation")

        decision = self.decision
        if decision.scene_id != scene_id:
            raise ValueError("the decision must reference the seed scene")
        if decision.master_take_id not in take_by_id:
            raise ValueError("the decision master_take_id must reference an existing take")
        if decision.evaluated_take_id not in take_by_id:
            raise ValueError("the decision evaluated_take_id must reference an existing take")
        if not take_by_id[decision.master_take_id].is_approved_master:
            raise ValueError("the decision master_take_id must be the approved master")
        if set(decision.evidence_ids) - observation_by_id.keys():
            raise ValueError("every decision evidence ID must reference an observation")
        if set(decision.flag_ids) != flag_by_id.keys():
            raise ValueError("the decision must reference every seed flag exactly once")

        flag_evidence_ids = {
            evidence_id
            for flag in self.flags
            for evidence_id in (
                flag.master_observation_id,
                flag.compared_observation_id,
            )
        }
        if not flag_evidence_ids.issubset(decision.evidence_ids):
            raise ValueError("decision evidence must include every flagged observation")

        for event in self.sse_events:
            if event.scene_id != scene_id:
                raise ValueError("every SSE event must reference the seed scene")
            if event.take_id is not None and event.take_id not in take_by_id:
                raise ValueError("every SSE event take_id must reference an existing take")

        return self
