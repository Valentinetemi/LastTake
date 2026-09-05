# LastTake

LastTake is an evidence-backed pre-wrap decision agent that helps small film crews decide whether they have enough coverage to wrap a scene.

## The production problem

Calling wrap with a missing reaction, continuity break, or unusable line can turn a small on-set oversight into an expensive reshoot. Under time pressure, directors and crew need a fast way to compare takes against the scene and point to concrete visual evidence—not another vague quality score.

## Planned three-step demo

1. Upload a scene script and filmed takes, then approve the strongest take as the master reference.
2. Compare a later take with a deliberate coverage gap and show a red **STOP — DO NOT WRAP** verdict with paired timecodes and a precise pickup request.
3. Upload the corrected pickup and show the verdict turn green as `safe_to_wrap`.

## Architecture summary

The Next.js frontend will collect the script and takes. A future Python FastAPI service will use Google ADK to orchestrate Gemini visual-evidence extraction, while ClickHouse—accessed through its official MCP server—will remember the approved master and comparison history. A deterministic decision layer will map the available evidence to exactly one of `missing_evidence`, `pickup_required`, or `safe_to_wrap`.

## Technology stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4
- Python, FastAPI, and Google Agent Development Kit (planned)
- Gemini multimodal models for structured visual evidence (planned)
- ClickHouse through the official MCP server (planned)
- Google Cloud Storage for uploaded assets (planned)

## Repository layout

```text
LastTake/
├── apps/web/          # Existing Next.js frontend
├── services/agent/    # Future FastAPI and Google ADK service
├── db/                # Future ClickHouse schema and seed data
├── public/demo/       # Future controlled demo assets
├── .vscode/           # Shared editor settings and recommendations
└── .env.example       # Credential-free environment contract
```
