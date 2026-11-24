# My Interview Coach

A voice AI coach for **software engineering interviews**. You talk to it out loud, and it runs a realistic mock interview: behavioral questions, coding problems and system design. It pushes back on vague answers and gives specific feedback after each one.

It can also study **your own notes**. Drop markdown files in a folder and the coach uses them to ask and grade questions.

Built with [LiveKit Agents](https://docs.livekit.io/agents/) (voice AI) and Next.js.

```
 Browser (frontend/)  <--- LiveKit Cloud --->  Python voice agent (agent/)
 localhost:3000                                 runs on your laptop
```

There are two parts, and **both must be running** at the same time:

| Folder | What it is |
| --- | --- |
| [`agent/`](agent/) | The coach itself: Python voice agent, interview persona, knowledge search. |
| [`frontend/`](frontend/) | The web app you open in your browser and talk through. |

---

## What you need first

1. **A computer with a microphone** (headphones recommended, so the coach doesn't hear itself).
2. **A free LiveKit Cloud account**: <https://cloud.livekit.io/>. Create a project. It hosts the real-time connection and the AI models (speech-to-text, the LLM, text-to-speech), so you don't need separate API keys for those.
3. **Install these tools:**

   | Tool | Why | Install |
   | --- | --- | --- |
   | [uv](https://docs.astral.sh/uv/getting-started/installation/) | Python deps for the agent | `winget install astral-sh.uv` (Windows), `brew install uv` (Mac) |
   | [LiveKit CLI (`lk`)](https://docs.livekit.io/intro/basics/cli/) | Runs and connects the agent | `winget install LiveKit.LiveKitCLI` (Windows), `brew install livekit-cli` (Mac) |
   | [Node.js 24](https://nodejs.org/) | Runs the web app | download from nodejs.org |
   | [pnpm](https://pnpm.io/installation) | Web app packages | `npm install -g pnpm` |

   Check they work: `uv --version`, `lk --version`, `node -v`, `pnpm -v`.

---

## Quick start

### 1. Clone the repo

```console
git clone https://github.com/cmeta461/my-interview-coach.git
cd my-interview-coach
```

### 2. Sign the CLI in to LiveKit Cloud

```console
lk cloud auth
```

A browser window opens. Pick the project you created.

### 3. Get your LiveKit credentials

In the [LiveKit Cloud dashboard](https://cloud.livekit.io/) go to **Settings > API keys** and copy three values: the **URL** (starts with `wss://`), an **API key** and its **secret**.
(If you've run `lk cloud auth`, `lk app env -w` can write these for you.)

### 4. Configure the agent

```console
cd agent
cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
```

Open `agent/.env.local` and fill in:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
```

### 5. Configure the web app

```console
cd ../frontend
cp .env.example .env.local        # Windows PowerShell: copy .env.example .env.local
```

Open `frontend/.env.local` and fill in the **same three values**, plus the agent name:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
AGENT_NAME=my-agent
```

Leave `LIVEKIT_TOKEN_SERVER_ID` **blank**. `AGENT_NAME` must be exactly `my-agent`, which matches the agent's code.

### 6. Run it (two terminals)

**Terminal 1: the coach**

```console
cd agent
uv sync          # first time only: installs dependencies
lk agent dev
```

Leave it running. It is waiting for someone to join.

**Terminal 2: the web app**

```console
cd frontend
pnpm install     # first time only
pnpm dev
```

### 7. Practice

Open <http://localhost:3000>, pick a focus (**Full mock**, **Behavioral**, **Coding** or **System design**), click **Start interview** and allow the microphone. Just talk. Click the transcript button to read along. End the session with the red button.

> Want to try the coach with no browser? In `agent/` run `lk agent console` to talk to it right in your terminal.

---

## Teach it your own material (knowledge base)

Put markdown (`.md`) files in [`agent/knowledge/`](agent/knowledge/). That's it. The coach finds the relevant parts when it asks or grades questions.

- Use `#` and `##` headings to split topics. The first `# Heading` is the document title.
- **No restart needed.** Add, edit or delete files while the agent is running. The next question picks up the change.
- Good things to add: company interview guides, question banks with model answers, system design cheat sheets, your own weak-spot notes.
- To use a folder elsewhere, set `KNOWLEDGE_DIR=/path/to/notes` in `agent/.env.local`.

A few sample notes (STAR method, system design framework, DSA patterns) are included. Replace or delete them.

## Customize the coach

| I want to... | Edit |
| --- | --- |
| Change the personality, interview flow or feedback style | [`agent/src/prompts.py`](agent/src/prompts.py) |
| Change the LLM, voice or speech recognition models | [`agent/src/agent.py`](agent/src/agent.py) |
| Change colors and theme | [`frontend/styles/globals.css`](frontend/styles/globals.css) |
| Change the welcome screen | [`frontend/components/app/welcome-view.tsx`](frontend/components/app/welcome-view.tsx) |
| Change the live interview screen (or add an avatar later) | [`frontend/components/app/interview-view.tsx`](frontend/components/app/interview-view.tsx) (`CoachStage`) |

Restart `lk agent dev` after changing agent code.

---

## Put it online (optional)

Running locally is free and needs nothing else. To share it with others you host the two parts separately:

| Part | Where | Cost |
| --- | --- | --- |
| Agent (`agent/`) | **LiveKit Cloud** | Free "Build" plan: 1 deployed agent, 1,000 session minutes, and about $2.50 of AI model credits (roughly 50 minutes of talking). Pay-as-you-go beyond that. |
| Web app (`frontend/`) | **Vercel** | Free Hobby plan |

**1. Deploy the agent** (from `agent/`, after `lk cloud auth`):

```console
lk agent deploy
```

Keep the agent name `my-agent`. Check pricing and limits at <https://livekit.io/pricing>.

**2. Deploy the web app to Vercel.** Import this GitHub repo, set **Root Directory** to `frontend`, and add these environment variables:

```
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
AGENT_NAME=my-agent
ACCESS_PASSCODE=pick-a-passcode
```

**Passcode lock.** `ACCESS_PASSCODE` is required in production. Visitors must enter it before they can start an interview, and without it the token route refuses to work, so a public site can't burn through your LiveKit credits. Share the passcode only with people you trust. Locally (`pnpm dev`) the passcode is optional.

---

## Troubleshooting

- **The page loads but the coach never speaks.** Check that `lk agent dev` is running in the other terminal and that `AGENT_NAME=my-agent` is set in `frontend/.env.local`. Restart `pnpm dev` after editing env files.
- **"LIVEKIT_URL is not defined" or a 500 from `/api/token`.** The frontend `.env.local` is missing or incomplete.
- **Coach doesn't hear me.** Allow microphone access in the browser (lock icon in the address bar) and check the right input device is selected.
- **Coach hears itself or echoes.** Use headphones.
- **`lk agent dev` can't connect or says unauthorized.** Re-run `lk cloud auth`, and check the three values in `agent/.env.local` come from the same project.
- **Wrong Node version.** The web app needs Node 24 (`node -v`).
- **Windows PowerShell blocks `pnpm`/scripts.** Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Tests

```console
cd agent
uv run pytest                                  # knowledge-base unit tests
lk agent simulate text --scenarios scenarios.yaml --yes   # simulated interview conversations
```

## Security note

The token route (`frontend/app/api/token/route.ts`) is protected by the `ACCESS_PASSCODE` gate (see `frontend/lib/access.ts`). A single shared passcode is simple protection, not per-user accounts. Never commit `.env.local` files. They are gitignored.

## Credits

Started from LiveKit's [agent-starter-python](https://github.com/livekit-examples/agent-starter-python) and [agent-starter-react](https://github.com/livekit-examples/agent-starter-react) templates (MIT license).
