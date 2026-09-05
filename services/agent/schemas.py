"""Runtime-validatable shared contracts for LastTake."""

from enum import Enum
from typing import Annotated

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
