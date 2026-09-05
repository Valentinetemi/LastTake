"""Runtime-validatable shared contracts for LastTake."""

from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

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
