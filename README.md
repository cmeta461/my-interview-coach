# My Interview Coach

A voice AI coach for software engineering interviews, built with [LiveKit Agents](https://docs.livekit.io/agents/).

- [`agent/`](agent/): Python voice agent. It runs mock interviews (behavioral, coding, system design) and answers from markdown notes you drop in `agent/knowledge/`.
- [`frontend/`](frontend/): Next.js web app for talking to the coach.

## Run locally

```console
# terminal 1
cd agent
uv sync
lk agent dev

# terminal 2
cd frontend
pnpm install
pnpm dev     # http://localhost:3000
```

Both need LiveKit credentials in `.env.local` (see each folder's `.env.example`). `AGENT_NAME` in the frontend must match the agent name (`my-agent`).
