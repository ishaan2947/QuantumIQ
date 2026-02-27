# QuantumIQ

An agentic AI quantum computing learning platform. The AI tutor autonomously reads your circuit, tracks your progress in PostgreSQL, and rewrites your curriculum in real time — it's not a chatbot, it's an agent running an observe-decide-act loop on every message.

**Stack:** FastAPI · Qiskit · GPT-4o · PostgreSQL · React · TypeScript · Three.js · Docker

---

## Screenshots

> Add screenshots to `docs/screenshots/` after running locally. Suggested captures:

| Lab (Circuit Builder + Bloch Sphere) | AI Tutor Chat | Challenges |
|--------------------------------------|---------------|------------|
| ![Lab](docs/screenshots/lab.png) | ![Chat](docs/screenshots/chat.png) | ![Challenges](docs/screenshots/challenges.png) |

---

## How It Works

### The Agentic Loop

Most "AI-powered" apps are just a chat box that calls an LLM. QuantumIQ's tutor is a genuine agent: it runs an **OODA loop** (Observe → Orient → Decide → Act) with OpenAI function calling before every response.

```
User sends message
       │
       ▼
┌─────────────────────────────────────────┐
│            Agent Loop (max 8 iter)       │
│                                          │
│  1. OBSERVE  ──► get_user_circuit()      │  reads live circuit state from session
│                  get_user_progress()     │  reads mastery levels from PostgreSQL
│                                          │
│  2. ORIENT   ──► GPT-4o analyzes:        │  identifies weak areas, errors,
│                  • current topic          │  progress gaps
│                  • mastery levels         │
│                  • circuit mistakes       │
│                                          │
│  3. DECIDE   ──► GPT-4o chooses action:  │
│                  • teach a concept        │
│                  • generate a challenge   │  generate_challenge()
│                  • search the docs        │  search_quantum_docs()
│                  • advance the plan       │  update_learning_plan()
│                                          │
│  4. ACT      ──► writes back to DB       │  persistent curriculum state
│                                          │
│  ◄─────── loop until finish_reason=stop ─┘
│
└─────────────────────────────────────────┘
       │
       ▼
   Final response (grounded in real user state)
```

The key difference from prompt-stuffing: the agent **requests only what it needs** when it needs it, and **writes back** to the system. It remembers what it taught you last session because it persists to PostgreSQL, not just context.

### Quantum Simulation Pipeline

```
User drops gates onto circuit
          │
          ▼
  GateOperation[] ──► Qiskit QuantumCircuit
                            │
                    transpile + Aer StatevectorSimulator
                            │
              ┌─────────────┴──────────────┐
              │                            │
     partial_trace(ρ, qubit)         measurement sampling
              │                       (shots=1024)
              │                            │
     Pauli decomposition            probability dict
     ⟨X⟩ = Tr(ρ·X)                  {'00': 0.5, '11': 0.5}
     ⟨Y⟩ = Tr(ρ·Y)                            │
     ⟨Z⟩ = Tr(ρ·Z)                   ProbabilityBars.tsx
              │
     BlochSphere.tsx
     (lerp-animated Three.js)
```

Step-through mode re-runs this pipeline after each gate, so you can watch the Bloch sphere rotate in real time as gates are applied.

---

## Tech Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Backend | FastAPI + Python | Async-native, Pydantic validation, auto docs at `/docs` |
| Quantum | Qiskit 2.x + Aer | Statevector simulation, density matrix, Bloch coords |
| AI Agent | GPT-4o + function calling | 6-tool OODA loop, conversation history, 8-iter max |
| Database | PostgreSQL + asyncpg | JSONB circuits, relational progress/mastery tracking |
| Auth | JWT + bcrypt | Stateless, `python-jose`, secure password hashing |
| Frontend | React 18 + TypeScript + Vite | react-dnd circuit builder, react-markdown chat |
| 3D Viz | Three.js + @react-three/fiber | Bloch sphere with `useFrame` lerp animation |
| Styling | Tailwind CSS | Dark quantum theme, custom color palette |
| Deployment | Docker Compose | One-command full-stack startup |

---

## Quick Start

**Prerequisites:** Docker Desktop, an OpenAI API key

```bash
git clone https://github.com/ishaan2947/QuantumIQ.git
cd QuantumIQ

# Configure environment
cp backend/.env.example backend/.env
# Open backend/.env and set OPENAI_API_KEY=sk-...

# Start everything
docker compose up --build
```

| Service | URL |
|---------|-----|
| App | http://localhost:5173 |
| API docs | http://localhost:8000/docs |

---

## Features

**Circuit Builder**
- Drag-and-drop gate palette: H, X, Y, Z, S, T, CNOT, Toffoli
- Multi-qubit circuit diagram with labeled wires
- Step-through animation — watch state evolve gate by gate
- Save and share circuits via UUID token links

**Quantum Visualization**
- Animated 3D Bloch sphere (Three.js) with lerp-smoothed transitions
- Live probability bar chart updating after each simulation
- Statevector displayed in both complex amplitude and basis notation

**Agentic AI Tutor**
- Circuit-aware: reads your gates before every response
- Persistent learning state: mastery levels stored per concept in PostgreSQL
- Generates personalized challenges targeting your weakest areas
- Updates your curriculum autonomously — no manual configuration
- Conversation history preserved across messages within a session
- Tool call transparency: the UI shows which tools the agent invoked

**Challenges**
- 6 preset circuits: Bell state, GHZ, Quantum Teleportation, Deutsch-Jozsa, Phase Flip, Grover's 2-qubit
- Agent-generated challenges based on individual weak areas
- Scoring via Bhattacharyya coefficient (probability distribution similarity)
- Full attempt history tracked per user

---

## Project Structure

```
QuantumIQ/
├── backend/
│   ├── app/
│   │   ├── agent/              # Agentic AI system
│   │   │   ├── agent.py        # OODA loop, GPT-4o orchestration
│   │   │   ├── executor.py     # Tool implementations (DB reads/writes)
│   │   │   └── tools.py        # OpenAI function calling schemas
│   │   ├── core/
│   │   │   ├── config.py       # Pydantic settings, env loading
│   │   │   ├── database.py     # Async SQLAlchemy engine + session
│   │   │   └── security.py     # JWT creation/validation, bcrypt hashing
│   │   ├── models/
│   │   │   ├── schemas.py      # Pydantic request/response models
│   │   │   └── *.py            # SQLAlchemy ORM models
│   │   ├── routes/             # FastAPI routers (auth, circuits, sim, chat...)
│   │   └── services/
│   │       └── quantum_simulator.py   # Qiskit integration
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── bloch/          # Three.js Bloch sphere
│       │   ├── circuit/        # Drag-and-drop builder, controls, charts
│       │   ├── chat/           # AI chat panel with markdown rendering
│       │   └── ui/             # Navbar
│       ├── hooks/              # useAuth, useCircuit (context + state)
│       ├── pages/              # Dashboard, Lab, Challenges, Login, Register
│       ├── services/api.ts     # Axios client with JWT interceptor
│       └── types/index.ts      # Shared TypeScript types + gate catalog
├── docker-compose.yml
└── README.md
```

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create account, returns JWT |
| `POST` | `/api/auth/login` | Login, returns JWT |
| `POST` | `/api/simulate/` | Run circuit through Qiskit, return probs + Bloch |
| `POST` | `/api/simulate/step` | Step-through simulation (one state per gate) |
| `POST` | `/api/chat/` | Send message to agentic AI tutor |
| `GET` | `/api/challenges/presets` | List preset challenges |
| `POST` | `/api/challenges/submit` | Submit attempt, get scored result |
| `GET` | `/api/progress/` | Get per-concept mastery levels |
| `GET` | `/api/progress/plan` | Get current personalized learning plan |

Full interactive docs at `http://localhost:8000/docs` (Swagger UI auto-generated by FastAPI).

---

## License

MIT
