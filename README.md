# ⚛️ Quantum State Visualizer — Bloch Verse

> An advanced, full-stack quantum computing visualization and education platform. Explore quantum states, simulate circuits, run real jobs on IBM Quantum hardware, and harness AI-powered quantum medical analysis — all in one place.

[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python%203.11-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF?logo=vite)](https://vitejs.dev/)
[![Qiskit](https://img.shields.io/badge/Qiskit-IBM%20Quantum-6929C4?logo=ibm)](https://qiskit.org/)

---

## 🚀 Project Overview

**Bloch Verse** is a comprehensive quantum computing platform built for researchers, students, and enthusiasts. It combines:

- 🌐 **Interactive 3D Bloch Sphere** visualizations powered by Three.js
- 🔬 **Drag-and-drop Quantum Circuit Builder** with real-time state simulation
- 🧠 **AI Quantum Tutor** (powered by Google Gemini) for deep learning assistance
- 🏥 **Quantum-enhanced Medical Imaging & Symptom Analysis** via ML primitives
- 💻 **IBM Quantum Hardware Integration** (run circuits on real quantum computers)
- 📈 **VQE / VQA Playgrounds**, Noise Simulation, Error Correction & more
- 🎮 **Gamification System** with achievements and progress tracking

---

## ✨ Key Features

### Core Quantum Tools
| Feature | Description |
|---|---|
| **Bloch Sphere 3D** | Real-time 3D qubit state visualization with drag-to-rotate |
| **Circuit Builder** | Drag-and-drop gate placement, multi-qubit support |
| **Step-by-Step Execution** | Watch your circuit execute gate-by-gate |
| **State Vector Display** | Amplitudes, probabilities, Dirac notation |
| **Entanglement Analysis** | Concurrence, von Neumann entropy, partial traces |
| **Noise Simulator** | Simulate real-world quantum decoherence |
| **Error Correction** | Interactive quantum error correction protocols |

### Advanced Modules
| Feature | Description |
|---|---|
| **VQE Playground** | Variational Quantum Eigensolver experiments |
| **VQA Playground** | Variational Quantum Algorithm sandbox |
| **Quantum ML** | Feature maps, quantum kernels, VQC classifier training |
| **Medical Imaging** | Quantum-enhanced image analysis with Pillow + scikit-image |
| **Symptom Analyzer** | Trained on medical CSV dataset (supporting Google Drive input) |
| **AI Tutor** | Gemini-powered contextual quantum learning assistant |
| **Research Tools** | Advanced analytics and reporting suite |
| **Gamification** | Achievements, XP, and progress tracking for learners |

### IBM Quantum Integration
- Authenticate with IBM Quantum token or IBM Cloud IAM API key
- Fetch available quantum backends
- Submit circuits, monitor job status, and download results
- Auto-connect on startup if `IBM_QUANTUM_TOKEN` is set in `.env`

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type-safe development |
| Vite | 5.4.19 | Build tool & dev server |
| Three.js | 0.160.1 | 3D rendering engine |
| @react-three/fiber | 8.18.0 | React renderer for Three.js |
| @react-three/drei | 9.122.0 | Three.js helpers |
| Framer Motion | 10.18.0 | Animations |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui (Radix) | latest | UI component library |
| TanStack Query | 5.83.0 | Server-state management |
| React Router DOM | 6.30.1 | Client-side routing |
| Recharts | 2.15.4 | Data charts |
| Monaco Editor | 0.52.2 | In-app code editor |
| React Markdown | 10.1.0 | Markdown rendering |
| Axios | 1.12.2 | HTTP client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| FastAPI | latest | REST API framework |
| Uvicorn | latest | ASGI server |
| Qiskit | latest | Quantum circuit simulation |
| Qiskit-Aer | latest | Local quantum simulator |
| scikit-learn | latest | ML for medical analysis |
| Pandas / NumPy | latest | Data processing |
| Pillow / scikit-image | latest | Image processing |
| google-generativeai | latest | Gemini AI integration |
| SQLAlchemy (async) | latest | Database ORM |
| gdown | latest | Google Drive dataset downloader |
| python-dotenv | latest | Environment variable management |
| aiohttp | latest | Async HTTP client |

---

## 📁 Project Structure

```
quantum-state-visualizer/
├── src/                          # Frontend source code
│   ├── components/
│   │   ├── advanced/             # Feature-rich modules
│   │   │   ├── AITutor.tsx
│   │   │   ├── AdvancedAnalytics.tsx
│   │   │   ├── GamificationSystem.tsx
│   │   │   ├── NoiseSimulator.tsx
│   │   │   ├── QuantumErrorCorrection.tsx
│   │   │   ├── QuantumMedicalImaging.tsx
│   │   │   ├── QuantumMLTrainingPipeline.tsx
│   │   │   ├── VQEPlayground.tsx
│   │   │   ├── VQAPlayground.tsx
│   │   │   └── ...
│   │   ├── core/                 # Core quantum visualization
│   │   │   ├── CircuitBuilder.tsx
│   │   │   └── ...
│   │   ├── general/              # Shared UI components
│   │   ├── modals/               # Modal dialogs
│   │   ├── tools/                # Utility tools
│   │   └── ui/                   # shadcn/ui base components
│   ├── contexts/                 # React context providers
│   │   └── IBMQuantumContext.tsx  # IBM Quantum global state
│   ├── hooks/                    # Custom React hooks
│   ├── pages/
│   │   ├── Landing.tsx           # Landing page
│   │   ├── Workspace.tsx         # Main application workspace
│   │   ├── Auth.tsx              # Authentication page
│   │   └── NotFound.tsx
│   ├── services/                 # API service layer
│   ├── utils/                    # Quantum simulation utilities
│   │   ├── gates.ts              # Gate matrix definitions
│   │   ├── matrixOperations.ts   # Linear algebra helpers
│   │   ├── densityMatrix.ts      # Quantum state analysis
│   │   ├── circuitOperations.ts  # Circuit execution engine
│   │   └── ...
│   └── config/                   # App configuration & themes
├── backend/                      # Python FastAPI backend
│   ├── main.py                   # Main application & all API routes
│   ├── routers/                  # Versioned API routers
│   │   ├── v1.py
│   │   ├── v2.py
│   │   ├── analytics.py
│   │   ├── gamification.py
│   │   └── tutor.py
│   ├── ibm_service.py            # IBM Quantum integration
│   ├── medical_core.py           # Medical ML pipeline
│   ├── symptom_analysis.py       # Symptom detection ML
│   ├── gemini_service.py         # Google Gemini AI service
│   ├── quantum_executor.py       # Local quantum execution
│   ├── quantum_ml_primitives.py  # QML feature maps & classifiers
│   ├── quantum_simulator.py      # Qiskit-based simulator
│   ├── database.py               # Async SQLAlchemy DB
│   ├── models.py                 # Pydantic request/response models
│   ├── config.py                 # Application configuration
│   ├── requirements.txt          # Python dependencies
│   └── ...
├── public/                       # Static assets
├── .env                          # Environment variables (local only)
├── package.json                  # Frontend dependencies & scripts
├── vite.config.ts                # Vite configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── render.yaml                   # Render.com deployment config
└── vercel.json                   # Vercel deployment config
```

---

## ⚙️ Setup & Installation

### Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org/)
- **Python 3.11+** — [Download](https://www.python.org/)
- **npm** (comes with Node.js) or **bun**
- A modern browser with WebGL support (Chrome, Firefox, Edge)

### 1. Clone the Repository

```bash
git clone https://github.com/jagadeesh08-s/ml-git.git
cd ml-git
```

### 2. Configure Environment Variables

Copy the example and fill in your keys:

```bash
# Create .env in the project root
```

Edit `.env`:

```env
# Backend API URL (default port: 3005)
VITE_API_BASE_URL=http://localhost:3005
REACT_APP_API_URL=http://localhost:3005

# IBM Quantum (get token from https://quantum.ibm.com/account)
VITE_IBM_QUANTUM_TOKEN=your_ibm_token_here
IBM_QUANTUM_TOKEN=your_ibm_token_here

# Google Gemini AI (get key from https://aistudio.google.com/app/apikey)
VITE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Medical dataset (Google Drive CSV link)
VITE_MEDICAL_DATASET_URL=your_google_drive_url_here
MEDICAL_DATASET_URL=your_google_drive_url_here

# App settings
VITE_APP_NAME=Bloch Verse
VITE_APP_VERSION=1.0.0
VITE_DEFAULT_SHOTS=1024
VITE_MAX_QUBITS=100
```

### 3. Install Frontend Dependencies

```bash
npm install
```

### 4. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
cd ..
```

Or use the npm shortcut:

```bash
npm run backend:install
```

---

## ▶️ Running the Application

### Option A — Start Both Together (Recommended)

```bash
npm run full:dev
```

This starts both the **frontend** and the **Python backend** concurrently.

### Option B — Start Separately

**Terminal 1 — Frontend (Vite dev server):**

```bash
npm run dev
```

The frontend will be available at: **[http://localhost:8080](http://localhost:8080)** *(or the port shown in your terminal)*

**Terminal 2 — Backend (FastAPI / Uvicorn on port 3005):**

```bash
npm run backend:dev
```

The backend API will be available at: **[http://localhost:3005](http://localhost:3005)**

- Interactive API docs (Swagger): [http://localhost:3005/docs](http://localhost:3005/docs)
- Alternative docs (ReDoc): [http://localhost:3005/redoc](http://localhost:3005/redoc)
- Health check: [http://localhost:3005/health](http://localhost:3005/health)

---

## 📜 Available Scripts

```bash
# ─── Frontend ──────────────────────────────────────────────────────────────
npm run dev              # Start Vite development server (frontend only)
npm run build            # Build frontend for production
npm run build:dev        # Build frontend in development mode
npm run preview          # Preview the production build locally
npm run lint             # Run ESLint on frontend code

# ─── Backend ───────────────────────────────────────────────────────────────
npm run backend:dev      # Start FastAPI backend with hot-reload (port 3005)
npm run backend:start    # Start FastAPI backend in production mode (port 3005)
npm run backend:install  # Install Python backend dependencies

# ─── Combined ──────────────────────────────────────────────────────────────
npm run full:dev         # Start frontend + backend simultaneously
npm run full:install     # Install both frontend (npm) and backend (pip) dependencies

# ─── Testing ───────────────────────────────────────────────────────────────
npm run test             # Run Vitest tests (watch mode)
npm run test:run         # Run Vitest tests (single pass)
npm run test:ui          # Open Vitest UI
```

---

## 🌐 API Endpoints

The FastAPI backend exposes the following key endpoints:

### Health & System
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Full health check with dependency verification |
| GET | `/api/status` | Detailed system status, cache, and worker info |
| GET | `/docs` | Swagger UI (interactive API explorer) |
| GET | `/redoc` | ReDoc API documentation |

### Quantum Simulation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/quantum/execute` | Execute a quantum circuit locally or on Aer simulator |

### IBM Quantum
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ibm/connect` | Connect & validate an IBM Quantum token |
| GET | `/api/ibm/backends` | List available IBM quantum backends |
| POST | `/api/ibm/execute` | Submit a circuit to IBM hardware |
| GET | `/api/ibm/job/{job_id}` | Get status/results for a submitted job |
| GET | `/api/ibm/jobs` | List recent IBM job history |
| GET | `/api/ibm/job/{job_id}/results/download` | Download job results as JSON |
| POST | `/api/ibm/authenticate-cloud` | Authenticate via IBM Cloud IAM API key |

### AI & Medical
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/update-config` | Update Gemini key / Drive URL at runtime (no restart needed) |
| POST | `/api/quantum-study` | Run a quantum advantage study |
| GET | `/api/quantum-report/{job_id}` | Generate a research report for a job |

---

## 🔬 Quantum Gate Reference

### Single-Qubit Gates
| Gate | Symbol | Effect on \|0⟩ | Effect on \|1⟩ |
|---|---|---|---|
| **I** | I | \|0⟩ | \|1⟩ |
| **X** | X | \|1⟩ | \|0⟩ |
| **Y** | Y | i\|1⟩ | -i\|0⟩ |
| **Z** | Z | \|0⟩ | -\|1⟩ |
| **H** | H | (\|0⟩+\|1⟩)/√2 | (\|0⟩-\|1⟩)/√2 |
| **S** | S | \|0⟩ | i\|1⟩ |
| **T** | T | \|0⟩ | e^(iπ/4)\|1⟩ |
| **RX(θ)** | Rx | cos(θ/2)\|0⟩ − i·sin(θ/2)\|1⟩ | cos(θ/2)\|1⟩ − i·sin(θ/2)\|0⟩ |
| **RY(θ)** | Ry | cos(θ/2)\|0⟩ + sin(θ/2)\|1⟩ | cos(θ/2)\|1⟩ − sin(θ/2)\|0⟩ |
| **RZ(θ)** | Rz | e^(−iθ/2)\|0⟩ | e^(iθ/2)\|1⟩ |
| **SX** | √X | Half-flip (superposition) | - |

### Multi-Qubit Gates
| Gate | Name | Effect |
|---|---|---|
| **CNOT** | Controlled-NOT | Flips target if control = \|1⟩ |
| **CZ** | Controlled-Z | Applies −1 phase if both qubits = \|1⟩ |
| **SWAP** | Swap | Exchanges two qubit states |
| **CY** | Controlled-Y | Applies Y to target if control = \|1⟩ |
| **CH** | Controlled-H | Applies H to target if control = \|1⟩ |
| **CCNOT** | Toffoli | Flips target if both controls = \|1⟩ |
| **FREDKIN** | CSWAP | Swaps two targets if control = \|1⟩ |

---

## 🏗️ Architecture Overview

```
Browser (React + Three.js)
        │
        │  REST/JSON  (http://localhost:3005)
        ▼
FastAPI Backend (Python 3.11 / Uvicorn)
 ├── IBM Quantum Service  ──►  IBM Quantum Cloud
 ├── Gemini AI Service    ──►  Google AI Studio
 ├── Medical Core         ──►  Dataset (Google Drive CSV)
 ├── Quantum Simulator    ──►  Qiskit-Aer (local)
 ├── SQLite Database      ──►  quantum.db (persistent)
 └── Async Job Queue      ──►  Background tasks
```

- The **frontend** communicates exclusively with the FastAPI backend via HTTP.
- The **backend** forwards IBM Quantum and Gemini requests to their respective cloud services.
- Medical data is downloaded from Google Drive via `gdown` and trained locally with `scikit-learn`.

---

## 🌍 Deployment

### Render.com (Backend)

The `render.yaml` file is pre-configured for deploying the backend to [Render](https://render.com/):

- **Runtime**: Python 3.11
- **Build command**: `pip install -r requirements.txt`
- **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Root directory**: `backend/`

Set the following environment variables in your Render dashboard:
- `GEMINI_API_KEY`
- `IBM_QUANTUM_TOKEN`
- `MEDICAL_DATASET_URL`

### Vercel (Frontend)

The `vercel.json` is pre-configured for deploying the frontend to [Vercel](https://vercel.com/).

Set `VITE_API_BASE_URL` in your Vercel project environment variables to point to your deployed backend URL.

---

## ⚠️ Known Limitations

- **WebGL Required**: The 3D Bloch Sphere visualization requires a browser with WebGL support.
- **IBM Quantum Token**: Real hardware job submission requires a valid IBM Quantum account token.
- **Medical Dataset**: The symptom analyzer requires a properly formatted CSV dataset from Google Drive.
- **Python 3.11**: The backend is tested on Python 3.11. Other versions may work but are not guaranteed.
- **Redis (Optional)**: The backend includes Redis cache support, but falls back gracefully without it.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add my feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Open a Pull Request

**Code style guidelines:**
- Use TypeScript for all frontend code
- Follow the existing React component structure (functional components + hooks)
- Add proper error handling in all async operations
- Keep quantum math functions well-commented

---

## 📄 License

This project is developed for educational and research purposes in quantum computing visualization and simulation.

---

## 🙏 Acknowledgments

- **IBM Quantum** — For providing access to real quantum computing hardware via the IBM Quantum Platform
- **Qiskit** — Open-source quantum computing SDK
- **Google Gemini** — AI capabilities powering the AI Tutor
- **Three.js Community** — Excellent 3D graphics tools
- **React & Vite Community** — Fast and modern web development ecosystem
- **FastAPI** — Elegant and high-performance Python API framework

---

> **Bloch Verse** — *Explore the beauty of quantum mechanics through interactive visualization.* 🌌⚛️
