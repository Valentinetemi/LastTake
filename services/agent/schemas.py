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
