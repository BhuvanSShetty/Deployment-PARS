<p align="center">
  <img src="Frontend/public/favicon.svg" alt="PARS Logo" width="80" />
</p>

<h1 align="center">PARS — Pre-Hospital AI Risk Scoring</h1>

<p align="center">
  <strong>A real-time ambulance management system that streams patient vitals from the field, computes mortality risk scores with machine learning, and gives hospitals a live heads-up display of who's coming — before the ambulance even arrives.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/ML-FastAPI%20%2B%20XGBoost-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Realtime-Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white" />
  <img src="https://img.shields.io/badge/Dockerized-100%25-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Our Solution](#our-solution)
3. [System Architecture](#system-architecture)
4. [How the Risk Scoring Works](#how-the-risk-scoring-works)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Features](#features)
8. [API Reference](#api-reference)
9. [WebSocket Events](#websocket-events)
10. [Getting Started](#getting-started)
11. [Docker Deployment](#docker-deployment)
12. [Environment Variables](#environment-variables)
13. [Design System](#design-system)
14. [User Flows](#user-flows)
15. [Team](#team)

---

## Problem Statement

India's pre-hospital emergency system suffers from:

- **Blind arrivals** — Hospitals find out what's coming when the stretcher rolls through the door
- **Manual pre-alerts** — A paramedic calls ahead, a nurse writes it on a sticky note, the surgeon never sees it
- **No triage en route** — Risk assessment only begins after the patient reaches the ER
- **Opaque fleet status** — Dispatchers rely on phone calls to figure out which ambulance is free
- **Wasted golden minutes** — The first 10 minutes in the ER are spent figuring out what's happening instead of treating it

> **Result:** Delayed care, unprepared trauma bays, untyped blood, and preventable deaths in the window that matters most.

---

## Our Solution

**PARS** replaces the phone-call-and-sticky-note chain with a live digital bridge between the ambulance and the hospital:

| Capability | How PARS Implements It |
|---|---|
| **Live Vitals Streaming** | Paramedics enter patient vitals on the road. Those numbers flow to the hospital dashboard in real time via **Socket.IO** WebSockets. |
| **AI Risk Scoring** | An **XGBoost** model scores each patient's mortality risk (HIGH / MEDIUM / LOW) automatically — the ER knows severity before arrival. |
| **Fleet Visibility** | Dispatchers see every ambulance's status (available, en route, maintenance) and every hospital's open bed count on a single screen. |
| **Pre-Alert Dashboard** | Hospital staff get a live heads-up display of incoming patients with auto-updating vitals and color-coded risk flags. |
| **Hub Optimization** | A simulation engine uses **weighted K-Means** + **OSMnx isochrones** to compute optimal ambulance station placements for a city. |
| **Public Caller Portal** | Anyone can report an emergency without logging in — the intake form captures location, symptoms, and complaint. |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 + Vite)                    │
│                                                                  │
│  Landing Page  │  Login  │  Caller Form  │  Role Dashboards      │
│  (Public)      │  (Auth) │  (Public)     │  (JWT-Protected)      │
│                │         │               │                       │
│                │         │               ├── Ambulance Dashboard  │
│                │         │               ├── Dispatcher Console   │
│                │         │               ├── Hospital Dashboard   │
│                │         │               └── Admin Panel          │
│                                                                  │
│  Port 5173                                                       │
└────────────┬──────────────────────────────────┬──────────────────┘
             │  REST API + Socket.IO            │
             ▼                                  │
┌──────────────────────────────────┐            │
│     BACKEND (Node.js + Express)  │            │
│                                  │            │
│  Auth ── Patients ── Ambulances  │            │
│   │        │            │        │            │
│   │   ┌────▼────┐  ┌────▼────┐   │            │
│   │   │ Vitals  │  │ Fleet   │   │            │
│   │   │ Service │  │ Manager │   │            │
│   │   └────┬────┘  └─────────┘   │            │
│   │        │                     │            │
│   │        │  POST /predict      │            │
│   │        ▼                     │            │
│   │   ┌──────────┐              │            │
│   │   │ ML API   │◄─────────────┼────────────┘
│   │   │ (FastAPI) │              │
│   │   │ :8000    │              │
│   │   └──────────┘              │
│   │                             │
│   │   Socket.IO Hub             │
│   │   (live vitals broadcast)   │
│   │                             │
│   │   Port 5050                 │
└───┼─────────────────────────────┘
    │
    ▼
┌──────────┐
│ MongoDB  │
│ (Atlas / │
│  local)  │
└──────────┘
```

Additionally, the **ML Simulation Runner** (`Ml/ambulance_system/`) is a one-shot tool that:

1. Generates synthetic risk-weighted emergency data (`agent_data`)
2. Runs weighted K-Means + gap-fill hub placement (`agent_math`)
3. Calculates traffic-adjusted isochrones via OSMnx (`agent_gis`)
4. Renders an interactive Folium map (`agent_ui`)
5. Writes the HTML map to `Frontend/public/` for the Dispatcher dashboard

---

## How the Risk Scoring Works

### Step 1: Vitals Capture

The paramedic enters patient data on the Ambulance Dashboard. The system captures **12 features**:

| # | Feature | Type |
|---|---------|------|
| 1 | `age` | Integer |
| 2 | `sex` | Male / Female / Other |
| 3 | `systolicBP` | Float (mmHg) |
| 4 | `diastolicBP` | Float (mmHg) |
| 5 | `heartRate` | Float (bpm) |
| 6 | `respiratoryRate` | Float (breaths/min) |
| 7 | `temperature` | Float (°C) |
| 8 | `painScore` | Float (0–10) |
| 9 | `spo2` | Float (%) |
| 10 | `hypertension` | Boolean (history) |
| 11 | `diabetes` | Boolean (history) |
| 12 | `cardiacHistory` | Boolean (history) |

### Step 2: XGBoost Prediction

```
Vitals JSON ──POST /predict──▶ FastAPI ──▶ XGBoost model ──▶ Risk Output
                                  │
                                  ├── score:    0.0 – 1.0 probability
                                  ├── category: LOW / MEDIUM / HIGH
                                  └── level:    1 – 5 severity scale
```

**Classification thresholds:**

| Score Range | Category | Level |
|-------------|----------|-------|
| `≥ 0.85` | HIGH | 1 |
| `0.65 – 0.84` | HIGH | 2 |
| `0.35 – 0.64` | MEDIUM | 3 |
| `0.15 – 0.34` | LOW | 4 |
| `< 0.15` | LOW | 5 |

### Step 3: Heuristic Fallback

When no trained model is available, the API uses a **rule-based engine**:

```
danger_signals = (
    systolicBP > 180 or systolicBP < 90   → +1
    spo2 < 90                             → +1
    heartRate > 120 or heartRate < 50     → +1
    painScore ≥ 8                         → +1
    cardiacHistory = true                 → +1
)

risk_score = min(danger_signals / 5.0, 1.0)
```

### Step 4: Live Broadcast

The scored vitals are broadcast to all connected clients via Socket.IO — the Hospital Dashboard updates in real time without polling.

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 18** | Runtime |
| **Express 5** | REST API framework |
| **MongoDB + Mongoose 9** | Document database with schema validation |
| **Socket.IO** | Real-time bidirectional vitals streaming |
| **jsonwebtoken** | JWT-based role authentication |
| **bcryptjs** | Password hashing |
| **Axios** | HTTP client for ML API communication |

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 8** | Build tool & dev server |
| **React Router 7** | Client-side routing |
| **Socket.IO Client** | Real-time vitals subscription |
| **Leaflet + React-Leaflet** | Interactive maps |
| **Leaflet.heat** | Heatmap layer for dispatch view |

### ML Risk Scoring API
| Technology | Purpose |
|---|---|
| **Python 3.10+** | Runtime |
| **FastAPI** | High-performance REST API |
| **XGBoost** | Gradient-boosted tree classifier |
| **NumPy** | Feature vector construction |
| **Pickle** | Model serialization |

### ML Simulation Engine
| Technology | Purpose |
|---|---|
| **OSMnx** | OpenStreetMap road network analysis |
| **Folium** | Interactive map generation |
| **GeoPandas** | Geospatial data manipulation |
| **scikit-learn** | K-Means clustering for hub placement |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Containerized deployment (4 services) |
| **MongoDB 6.0** | Containerized database |

---

## Project Structure

```
PARS/
├── docker-compose.yml              # Orchestrates all services
├── README.md                       # ← You are here
│
├── Backend/
│   ├── Dockerfile
│   ├── server.js                   # Express + Socket.IO entry point
│   ├── package.json
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js              # MongoDB connection
│   │   ├── models/
│   │   │   ├── user.js            # Auth (admin, hospital, paramedic, driver, dispatcher)
│   │   │   ├── hospital.js        # Facility registry (beds, capabilities, level)
│   │   │   ├── ambulance.js       # Vehicle + driver + equipment + GPS
│   │   │   ├── patient.js         # Vitals + risk prediction + ambulance link
│   │   │   ├── incident.js        # Emergency call → dispatch → resolution
│   │   │   └── firstResponder.js  # First responder profile
│   │   ├── controllers/
│   │   │   ├── authController.js      # Register & login (bcrypt + JWT)
│   │   │   ├── adminController.js     # Stats, fleet, hospitals, patients
│   │   │   ├── patientController.js   # CRUD + vitals → ML scoring pipeline
│   │   │   ├── ambulanceController.js # Fleet management + GPS updates
│   │   │   └── dispatchController.js  # Incident lifecycle management
│   │   ├── routes/
│   │   │   ├── authRoutes.js          # POST /login, /register
│   │   │   ├── adminRoutes.js         # Dashboard + registration endpoints
│   │   │   ├── patientRoutes.js       # CRUD + hospital-scoped queries
│   │   │   ├── ambulanceRoutes.js     # Fleet + location + status
│   │   │   ├── dispatchRoutes.js      # Incidents + assignment
│   │   │   └── callRoutes.js          # Public emergency intake
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js      # JWT Bearer token guard
│   │   │   └── roleMiddleware.js      # Role-based access control
│   │   ├── services/
│   │   │   ├── socket.js             # WebSocket hub (vitals broadcast)
│   │   │   └── patientService.js     # Vitals → ML API → risk score pipeline
│   │   └── utils/
│   │       └── authUtils.js          # Password hashing, token generation
│   └── .env                          # MongoDB URI, JWT secret, ML API URL
│
├── Frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html                    # Entry HTML (favicon + title)
│   ├── public/
│   │   └── favicon.svg              # Steel blue medical cross
│   ├── src/
│   │   ├── main.jsx                 # React entry point
│   │   ├── App.jsx                  # Router + nav + auth state
│   │   ├── App.css                  # Navigation bar styles
│   │   ├── index.css                # Global design tokens + card system
│   │   ├── assets/
│   │   │   ├── bg.png              # Medical background texture
│   │   │   └── ambulance_hero.png  # Landing page hero image
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx          # Marketing / value proposition
│   │   │   ├── LoginPage.jsx            # Auth gateway + demo accounts
│   │   │   ├── CallerPage.jsx           # Public emergency intake form
│   │   │   ├── AmbulancePage.jsx        # Paramedic dashboard + vitals
│   │   │   ├── AmbulanceSessionPage.jsx # Active patient session view
│   │   │   ├── DispatcherPage.jsx       # Dispatch console + incidents
│   │   │   ├── HospitalPage.jsx         # ER dashboard + incoming patients
│   │   │   ├── AdminPage.jsx            # System overview + fleet mgmt
│   │   │   ├── AdminHospitalRegisterPage.jsx  # Hospital registration
│   │   │   └── AdminAmbulanceRegisterPage.jsx # Ambulance registration
│   │   ├── styles/                  # Per-page CSS files
│   │   └── utils/
│   │       └── locationUtils.js     # GPS capture helper
│
├── Ml/
│   ├── Dockerfile
│   ├── api.py                       # FastAPI risk-scoring endpoint
│   ├── requirements.txt
│   ├── models/
│   │   └── risk_model.pkl          # Trained XGBoost model
│   ├── training/                    # Model training scripts
│   └── ambulance_system/           # Simulation + hub placement engine
│       ├── Dockerfile
│       ├── main.py                 # Pipeline orchestrator
│       ├── agent_data.py           # Synthetic emergency point generator
│       ├── agent_math.py           # Weighted K-Means hub optimizer
│       ├── agent_gis.py            # OSMnx isochrone calculator
│       └── agent_ui.py             # Folium map renderer
│
└── LOCATION_TRACKING.md            # GPS tracking documentation
```

---

## Features

### Public (No Login Required)

- **Landing Page** — Value proposition with hero image and problem/solution overview
- **Emergency Caller Form** — Two-column layout with live sidebar, GPS capture, and form progress tracker
- **Back-to-Login Navigation** — Easy access from public pages to the auth gateway

### Ambulance Dashboard (Paramedic / Driver)

- **Patient Session Management** — Start session, enter vitals, monitor patient
- **Live Vitals Streaming** — Numbers flow to the hospital in real time via WebSocket
- **Automatic Risk Scoring** — ML model computes mortality risk in the background
- **GPS Location Tracking** — Live ambulance position updates

### Dispatcher Console

- **Incident Management** — Create, assign, and resolve emergency incidents
- **Fleet Overview** — See all ambulances (available / en route / maintenance)
- **Hospital Assignment** — Route patients to the nearest capable hospital
- **Interactive Map** — Folium-generated hub placement + isochrone visualization

### Hospital Dashboard (ER Staff)

- **Incoming Patient Feed** — Live dashboard of patients en route with auto-updating vitals
- **Risk-Coded Alerts** — Color-coded HIGH / MEDIUM / LOW severity flags
- **Pre-Alert Preparation** — Know what's coming and prep the right bay, team, and equipment

### Admin Panel

- **System Statistics** — Total patients, ambulances, hospitals, risk distribution
- **Fleet Management** — Register and monitor ambulances with driver details
- **Hospital Registry** — Register hospitals with bed capacity and capability data
- **Patient Records** — Full table with risk levels, vitals, and data export
- **Tabbed Navigation** — Overview, Ambulances, Patients, and Hospitals tabs

### Security & Auth

- **JWT Authentication** — bcrypt password hashing + Bearer token protection
- **Role-Based Access Control** — 5 roles: admin, hospital, paramedic, driver, dispatcher
- **Protected Routes** — Each dashboard only accessible to its assigned role

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | Public | Returns JWT + user object |
| `POST` | `/api/auth/register` | Public | Create new user account |

### Admin Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/stats` | JWT | Dashboard statistics (patients, ambulances, hospitals, risk counts) |
| `GET` | `/api/admin/ambulances` | JWT | Fleet grouped by status (available, on-duty, maintenance) |
| `GET` | `/api/admin/patients` | JWT | All patient records with ambulance data |
| `GET` | `/api/admin/hospitals` | JWT | All registered hospitals |
| `POST` | `/api/admin/hospitals/register` | JWT | Create hospital + login account in one step |
| `POST` | `/api/admin/ambulances/register` | JWT | Create ambulance + login account in one step |
| `GET` | `/api/admin/analytics/ambulance-status` | JWT | Ambulance availability percentage |
| `GET` | `/api/admin/analytics/risk-distribution` | JWT | HIGH / MEDIUM / LOW patient breakdown |

### Patient Records
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/patients` | JWT | List all patients |
| `GET` | `/api/patients/:id` | JWT | Single patient detail |
| `POST` | `/api/patients` | JWT | Create patient record |
| `PUT` | `/api/patients/:id` | JWT | Update patient |
| `DELETE` | `/api/patients/:id` | JWT | Remove patient record |
| `POST` | `/api/patients/vitals` | JWT | Submit vitals → triggers ML risk scoring |
| `GET` | `/api/patients/hospital` | JWT | Hospital-scoped patient list |

### Ambulance Fleet
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/ambulances` | JWT | All ambulances |
| `GET` | `/api/ambulances/:id` | JWT | Single ambulance detail |
| `PUT` | `/api/ambulances/:id/status` | JWT | Update status (available / on-duty / maintenance) |
| `PUT` | `/api/ambulances/:id/location` | JWT | Update GPS coordinates |

### Dispatch & Incidents
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/dispatch/incidents` | JWT | All active incidents |
| `POST` | `/api/dispatch/incidents` | JWT | Create new incident from call |
| `PUT` | `/api/dispatch/incidents/:id/assign` | JWT | Assign ambulance to incident |
| `PUT` | `/api/dispatch/incidents/:id/hospital` | JWT | Assign destination hospital |

### Emergency Calls (Public)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/calls` | Public | Submit emergency call (no login required) |

### ML Risk Scoring
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `:8000/health` | Public | Model status check |
| `POST` | `:8000/predict` | Internal | Single patient risk score |
| `POST` | `:8000/predict/batch` | Internal | Batch risk scoring |

---

## WebSocket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `sendVitals` | Client → Server | `{ patientId, vitals }` | Ambulance submits patient vitals |
| `liveVitals` | Server → All Clients | `{ patientId, vitals, timestamp }` | Broadcast live vitals stream |
| `deviceVitals` | Bidirectional | `{ deviceId, readings }` | Wearable / monitor data relay |

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Python** 3.10+
- **MongoDB** running locally or a connection string (Atlas works too)
- **Docker** (optional, but recommended)

### Local Development (Without Docker)

**1. Clone the repository**

```bash
git clone <repository-url>
cd "Ambulance Proj"
```

**2. Backend**

```bash
cd Backend
npm install
```

Create `Backend/.env`:

```env
PORT=5050
MONGO_URI=mongodb://localhost:27017/pars
JWT_SECRET=your_secret_key
ML_API_URL=http://localhost:8000
```

```bash
node --watch server.js    # Starts on :5050
```

**3. ML Risk Scoring API**

```bash
cd Ml
pip install -r requirements.txt
uvicorn api:app --host 0.0.0.0 --port 8000    # Starts on :8000
```

**4. Frontend**

```bash
cd Frontend
npm install
npm run dev    # Starts Vite on :5173
```

**5. Seed Demo Data**

```bash
cd Backend
node seed.js
```

Open **http://localhost:5173** in your browser.

### Demo Accounts

| Role | Email | Password | Dashboard |
|------|-------|----------|-----------|
| Admin | `admin@hospital.com` | `admin123` | System overview + fleet management |
| Dispatcher | `dispatch@ems.com` | `dispatch123` | Incident console + fleet tracking |
| Ambulance | `paramedic@ambulance.com` | `para123` | Vitals input + patient session |
| Hospital | `hospital@health.com` | `hosp123` | ER dashboard + incoming patients |

---

## Docker Deployment

The entire stack is containerized with a single command.

### Services Overview

| Service | Container | Port | Description |
|---------|-----------|------|-------------|
| `backend` | Node.js 18 | 5050 | Express API + Socket.IO server |
| `frontend` | Vite dev server | 5173 | React application |
| `ml-api` | Python FastAPI | 8000 | XGBoost risk scoring endpoint |
| `ml-sim` | Python (one-shot) | — | Hub placement simulation runner |

### One-Command Launch

```bash
docker compose up --build
```

This will:
1. Build Backend, Frontend, and ML API images
2. Start all services with correct networking
3. Backend waits for ML API health check before starting
4. Frontend connects to Backend on `:5050`

### Run the Simulation (One-Shot)

```bash
docker compose run --rm ml-sim
```

Generates the Folium map and writes it to `Frontend/public/ambulance_map.html`.

### Verify Everything Works

```bash
# Check all containers
docker compose ps

# Test Backend
curl http://localhost:5050/test

# Test ML API
curl http://localhost:8000/health
# → {"status":"ok","model_loaded":true}

# View logs
docker compose logs -f
```

### Stop & Clean Up

```bash
docker compose down        # Stop all containers
docker compose down -v     # Stop + delete volumes
```

---

## Environment Variables

### Backend (`Backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5050` | Backend server port |
| `MONGO_URI` | — | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for JWT signing |
| `ML_API_URL` | `http://localhost:8000` | ML risk scoring API base URL |

### ML API (`Ml/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_PATH` | `models/risk_model.pkl` | Path to trained XGBoost model |

### ML Simulation

| Variable | Default | Description |
|----------|---------|-------------|
| `OUTPUT_PATH` | `/app/output/ambulance_map.html` | Where to write the generated map |
| `OSMNX_CACHE_DIR` | `/app/cache` | Cache directory for OSM road data |

---

## Design System

The UI follows a warm, organic aesthetic built around natural tones:

| Token | Hex | Usage |
|-------|-----|-------|
| **Knit Sweater** | `#EEE6DE` | Page background |
| **Midnight** | `#37514D` | Primary text, dark buttons |
| **Steel Blue** | `#90AEB2` | Accents, focus rings, hovers |
| **Cranberry** | `#B6594C` | Errors, critical alerts |
| **Ceramic Mug** | `#DDBE75` | Warnings |
| **Camel Coat** | `#BE845E` | Secondary warnings |

**Typography:** Georgia for headings (warm, editorial), system font stack for body text (fast, native).

**Cards:** Frosted glass (`backdrop-filter: blur`) over a slowly panning medical background texture, giving a subtle sense of depth and motion.

**Hover behavior:** Cards lift 3px with a softened shadow — no bouncing, no scaling, no `!important`.

---

## User Flows

### Public Flow

```
Landing Page (Hero + Problem/Solution)
        │
        ▼
  "Get Started" → Login Page
        │              │
        │              ├── Enter credentials → Role-based dashboard
        │              ├── Use demo account → Auto-fill + login
        │              └── "Open the caller form" → Caller Page
        │
        └── Caller Page (no login needed)
              ├── Two-column layout
              ├── Live sidebar (summary + GPS + progress bar)
              ├── Emergency intake form
              └── Submit → Incident created for dispatch
```

### Ambulance Flow

```
Login (paramedic / driver)
        │
        ▼
  Ambulance Dashboard
        ├── View assigned ambulance details
        ├── Start Patient Session
        │     ├── Enter vitals (BP, HR, SpO2, temp, pain, history)
        │     ├── Vitals → Backend → ML API → Risk Score
        │     ├── Score broadcast via Socket.IO → Hospital Dashboard
        │     └── Live session view with updating readings
        └── Update ambulance status + GPS location
```

### Hospital Flow

```
Login (hospital role)
        │
        ▼
  Hospital Dashboard
        ├── Incoming Patients Feed (live via Socket.IO)
        │     ├── Patient ID + Risk Category (color-coded)
        │     ├── Live vitals: BP, HR, SpO2, Temp
        │     └── Auto-refresh — no manual polling
        └── Prepare bay, team, and equipment before arrival
```

### Dispatch Flow

```
Login (dispatcher role)
        │
        ▼
  Dispatcher Console
        ├── Active Incidents List
        │     ├── Create new incident from incoming call
        │     ├── Assign ambulance to incident
        │     └── Assign destination hospital
        ├── Fleet Status Overview
        │     ├── Available ambulances
        │     ├── On-duty ambulances (en route)
        │     └── Maintenance vehicles
        └── Interactive Map (Folium hub placement)
```

### Admin Flow

```
Login (admin role)
        │
        ▼
  Admin Panel
        ├── Overview Tab
        │     ├── Stat cards: patients, risk levels, fleet, hospitals
        │     └── Recent patient activity feed
        ├── Ambulances Tab
        │     ├── Available / On-Duty / Maintenance groups
        │     └── Vehicle + driver details per unit
        ├── Patients Tab
        │     ├── Full patient table (ID, age, sex, risk, vitals)
        │     └── Export data as JSON
        ├── Hospitals Tab
        │     └── Registered hospitals (name, level, beds, status)
        │
        └── Registration (via nav links)
              ├── Register Hospital → Creates hospital + login account
              └── Register Ambulance → Creates ambulance + login account
```

---

## Team

| Name |
|------|
| **Bhuvan S Shetty** |
| **Rohit Bhat** |
| **Chirag Anand** |
| **Tejus** |

---

<p align="center">
  <strong>Built because the gap between a 911 call and a prepared trauma bay shouldn't exist.</strong>
</p>
