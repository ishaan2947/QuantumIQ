# QuantumIQ

An agentic AI-powered quantum computing learning platform that autonomously tracks user progress, builds personalized curricula, and guides users through interactive circuit simulation in real time.

## What Makes This Agentic

This is **not** a chatbot with a circuit builder bolted on. The AI tutor is a genuine autonomous agent that:

- **Observes** your circuit state in real time via `get_user_circuit()`
- **Analyzes** your learning gaps by reading `get_user_progress()` from PostgreSQL
- **Decides** what you should learn next and generates personalized challenges
- **Acts** on the system by writing back to the database via `update_learning_plan()`
- **Loops** through observe-decide-act cycles autonomously using OpenAI tool calling

The agent makes autonomous decisions about your curriculum without being asked — it identifies weak areas, assigns challenges, and adjusts your learning plan after every interaction.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend | FastAPI (Python) | Async-native, auto-generated docs, Pydantic validation |
| Simulation | Qiskit + Aer | IBM's production quantum SDK — verified gate math |
| AI Agent | OpenAI GPT-4o + Function Calling | True tool use, not prompt stuffing |
| Database | PostgreSQL | JSONB for circuits, relational for progress tracking |
| Frontend | React + TypeScript + Vite | Type safety, fast HMR, component architecture |
| 3D Viz | Three.js (@react-three/fiber) | WebGL Bloch sphere with smooth animation |
| Auth | JWT (python-jose + bcrypt) | Stateless, horizontally scalable |
| Deployment | Docker Compose | Full stack in one command |

## Quick Start

```bash
# Clone and configure
git clone https://github.com/ishaan2947/QuantumIQ.git
cd QuantumIQ
cp backend/.env.example backend/.env
# Edit backend/.env — add your OPENAI_API_KEY

# Run everything
docker compose up --build

# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Circuit   │  │  Bloch   │  │Probability│  │  Chat  │ │
│  │ Builder   │  │  Sphere  │  │   Bars    │  │ Panel  │ │
│  │(react-dnd)│  │(Three.js)│  │           │  │        │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────┴──────────────────────────────────┐
│                   FastAPI Backend                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │  Auth    │  │Simulation│  │    Agentic AI Tutor   │  │
│  │  (JWT)   │  │ (Qiskit) │  │  ┌─────────────────┐ │  │
│  └──────────┘  └──────────┘  │  │   Agent Loop     │ │  │
│                               │  │  (OODA pattern)  │ │  │
│                               │  ├─────────────────┤ │  │
│                               │  │ Tools:           │ │  │
│                               │  │ • get_circuit()  │ │  │
│                               │  │ • get_progress() │ │  │
│                               │  │ • gen_challenge()│ │  │
│                               │  │ • search_docs()  │ │  │
│                               │  │ • update_plan()  │ │  │
│                               │  └─────────────────┘ │  │
│                               └──────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         │       PostgreSQL          │
         │  • users                  │
         │  • circuits (JSONB)       │
         │  • user_progress          │
         │  • learning_plans         │
         │  • challenge_history      │
         └───────────────────────────┘
```

## Core Features

- **Drag-and-drop circuit builder** — H, X, Y, Z, CNOT, Toffoli gates
- **Real-time simulation** — Qiskit statevector + measurement sampling
- **3D Bloch sphere** — Animated with smooth interpolation using Three.js
- **Step-through mode** — Gate-by-gate animation with live state updates
- **Agentic AI tutor** — Autonomous learning agent with persistent memory
- **Adaptive challenges** — Bell state, teleportation, Grover's, Deutsch-Jozsa
- **Progress tracking** — Per-concept mastery levels, error rates, practice counts
- **Shareable circuits** — UUID-based token links
- **Personalized curriculum** — Agent-managed learning plan that evolves over time

## Project Structure

```
QuantumIQ/
├── backend/
│   ├── app/
│   │   ├── agent/          # Agentic AI system
│   │   │   ├── agent.py    # Agent loop (OODA pattern)
│   │   │   ├── executor.py # Tool implementations
│   │   │   └── tools.py    # OpenAI function schemas
│   │   ├── core/           # Config, DB, security
│   │   ├── models/         # SQLAlchemy models + Pydantic schemas
│   │   ├── routes/         # API endpoints
│   │   └── services/       # Qiskit simulation engine
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── bloch/      # Three.js Bloch sphere
│   │   │   ├── circuit/    # Circuit builder + controls
│   │   │   ├── chat/       # AI chat panel
│   │   │   └── ui/         # Shared UI components
│   │   ├── hooks/          # Auth + circuit state management
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript type definitions
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
└── LEARNING.md             # Deep-dive architecture & interview prep
```

## License

MIT
