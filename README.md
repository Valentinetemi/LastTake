# LastTake

LastTake is an evidence-backed pre-wrap decision agent that helps small film crews decide whether they have enough coverage to wrap a scene.

## The production problem

Calling wrap with a missing reaction, continuity break, or unusable line can turn a small on-set oversight into an expensive reshoot. Under time pressure, directors and crew need a fast way to compare takes against the scene and point to concrete visual evidence—not another vague quality score.

## Planned three-step demo

1. Upload a scene script and filmed takes, then approve the strongest take as the master reference.
2. Compare a later take with a deliberate coverage gap and show a red **STOP — DO NOT WRAP** verdict with paired timecodes and a precise pickup request.
3. Upload the corrected pickup and show the verdict turn green as `safe_to_wrap`.

## Architecture summary

The Next.js frontend will collect the script and takes. Shared Zod and Pydantic contracts now define the data exchanged with a future Python FastAPI service, which will use Google ADK to orchestrate Gemini visual-evidence extraction. ClickHouse—accessed through its official MCP server—will remember the approved master and comparison history. A deterministic decision layer will map the available evidence to exactly one of `missing_evidence`, `pickup_required`, or `safe_to_wrap`.

## Technology stack

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4
- Zod and Pydantic shared runtime validation
- Python, FastAPI, and Google Agent Development Kit (planned)
- Gemini multimodal models for structured visual evidence (planned)
- ClickHouse through the official MCP server (planned)
- Google Cloud Storage for uploaded assets (planned)

## Repository layout

```text
LastTake/
├── apps/web/          # Existing Next.js frontend
├── services/agent/    # Shared Pydantic contracts; future agent service
├── db/                # Future ClickHouse schema and seed data
├── public/demo/       # Controlled text/JSON fixtures; future footage
├── .vscode/           # Shared editor settings and recommendations
└── .env.example       # Credential-free environment contract
```

## Local setup

The frontend can be run independently while the agent and database services are still placeholders.

```bash
cp .env.example .env
npm install --prefix apps/web
npm run dev --prefix apps/web
```

Add only local credentials to `.env`; never commit that file. Service-specific installation, database initialization, and demo-data steps will be documented when those components exist.

Run the shared contract suites from the repository root:

```bash
python3 -m venv services/agent/.venv
services/agent/.venv/bin/python -m pip install -r services/agent/requirements-dev.txt
services/agent/.venv/bin/python -m pytest services/agent/tests
npm run test:contracts --prefix apps/web
```

Both suites load and validate `public/demo/scene-04-seed.json` without transforming it.

## AI and sponsor technology disclosure

LastTake is planned to use Google Gemini for structured multimodal evidence extraction and Google ADK for agent orchestration. It is also planned to use ClickHouse through the official ClickHouse MCP server to retain the approved master take and support later comparisons. The shared contracts and deterministic demo fixture contain representative evidence only; no AI, agent, database, or analysis runtime has been implemented yet.

## Current project status

Checklist Items 1 and 2 are complete: the workspace is scaffolded, matching Zod/Pydantic contracts are in place, and the controlled Scene 04 fixture models an approved master, deliberate continuity conflicts, a `pickup_required` decision, and its SSE lifecycle. The interface, agent runtime, database schema, API, evidence extraction, and verdict resolver have intentionally not been started.

## License

LastTake is available under the [MIT License](LICENSE). Copyright (c) 2026 Temiloluwa Valentine Olajuwon.
