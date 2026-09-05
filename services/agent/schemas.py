"""Runtime-validatable shared contracts for LastTake."""

from enum import Enum

from pydantic import BaseModel, ConfigDict


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
