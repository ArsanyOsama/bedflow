# BedFlow 🏥⚡

**Real-Time Cross-Hospital Bed Intelligence** *Built by Team VEROW · ECU 2026*

---

## 📖 About The Project

Egypt has 121,617 hospital beds, but tonight, none of them know about each other. Emergency transfers currently cost operators 22 minutes and 3–8 manual phone calls while operating entirely blind. 

**BedFlow does not fix Egyptian healthcare. Egypt's doctors do that. BedFlow fixes the 22 minutes.** We are an infrastructure layer solving coordination failure. By connecting fragmented private hospitals (~400 nationally with 50+ beds) and the new Law 87/2024 concession operators, BedFlow provides a real-time, city-wide view of bed availability. 

**Our Core UVP:** *We don't sell software. We sell bed-days.*

### Key Features
* **Live City Map:** Real-time visibility of hospital bed availability across Greater Cairo.
* **Ward Nurse Mobile App:** A 2-tap React Native interface for nurses to update bed statuses, featuring an SQLite offline queue for network resilience.
* **Ops Director Dashboard:** A comprehensive React web application for monitoring capacity, surge warnings, and EMS requests.
* **Automated PDF Reporting:** Auto-generated weekly ROI and efficiency reports designed for hospital ownership.
* **EMS Dispatch API:** Sub-200ms API endpoints allowing ambulances to find the nearest available bed instantly.
* **Zero Patient-ID Data:** Compliant with Egypt's Data Protection Law 151/2020 by architecture—tracking only beds, never patient identities.

---

## 🏗️ Architecture & Tech Stack

BedFlow is built as a highly scalable monorepo.

* **Backend:** FastAPI (Python 3.11+)
* **Frontend (Dashboard):** React.js 18 + TypeScript + Vite + Tailwind CSS + Recharts + Leaflet.js
* **Mobile App:** React Native (Expo SDK 51+) + SQLite
* **Database & Auth:** Supabase (PostgreSQL 15) with Row-Level Security (RLS) and Realtime pub/sub
* **Cloud Infrastructure:** Vercel (Web), Railway (API), AWS UAE `me-central-1` (Scale)

---

## 📂 Repository Structure

```text
bedflow/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── main.py          # API Entrypoint
│   │   ├── database.py      # Supabase Client
│   │   └── routes/          # API Endpoints (beds, hospitals, reports, ems)
│   └── requirements.txt
├── dashboard/               # React Web Dashboard (Ops Directors)
│   ├── src/
│   │   ├── components/      # UI Components (BedGrid, Sidebar, etc.)
│   │   ├── pages/           # Views (Dashboard, CityMap, Reports, Alerts)
│   │   ├── hooks/           # Custom React Hooks (Auth, RealtimeBeds)
│   │   └── lib/             # Supabase & Utils
│   └── tailwind.config.js
├── nurse-app/               # Expo React Native App (Ward Nurses)
│   ├── app/                 # Expo Router Screens
│   ├── constants/           # Theme Colors & Status Labels
│   └── lib/                 # Supabase & SQLite Offline Cache
└── supabase/                # Database Migrations & Seeds
    ├── migrations/          # SQL Schema & DB Triggers
    └── seed.sql             # Demo Data
```

---

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed on your machine:
* **Node.js** (v20+) & **pnpm** (`npm install -g pnpm`)
* **Python** (v3.11+)
* **Expo CLI** (`npm install -g @expo/cli eas-cli`)
* **Supabase Project** (Hosted in `eu-central-1` Frankfurt for optimal latency to Egypt)

---

## 🚀 Setup & Installation

### 1. Database Setup (Supabase)
1. Navigate to your Supabase project's SQL Editor.
2. Run the full schema from `supabase/migrations/001_initial_schema.sql`.
3. Run the Phase 2 patches (`Migration 003`) to update triggers and add views.
4. Run `supabase/seed.sql` to populate mock hospitals (e.g., Cairo Specialized, Maadi Medical).

### 2. Backend Initialization (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
pip install -r requirements.txt
```

Create a `backend/.env` file:
```env
SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
EMS_API_KEY=bedflow-ems-secret-2026
```

### 3. Dashboard Initialization (React/Vite)
```bash
cd dashboard
pnpm install
```

Create a `dashboard/.env.local` file:
```env
VITE_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

### 4. Nurse App Initialization (Expo)
```bash
cd nurse-app
npm install
```

Create a `nurse-app/.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=[https://your-project.supabase.co](https://your-project.supabase.co)
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=http://localhost:8000
```

---

## 🏃 Running the Project Locally

To run the full stack, you will need three terminal windows:

**Terminal 1: Start the Backend API**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2: Start the Web Dashboard**
```bash
cd dashboard
pnpm run dev
```

**Terminal 3: Start the Mobile App**
```bash
cd nurse-app
npx expo start
```
*Use the Expo Go app on your mobile device to scan the generated QR code.*

---

## 👥 Team VEROW
* **Arsany Osama** — CEO · Product · Backend Architecture
* **Thomas Ayman** — CBO · Market Strategy · Finance
* **Mina Emad** — Frontend Engineering
* **Loay Yasser** — Data Engineering
* **Adham Yasser** — Sales & Partnerships
* **Philopateer Magdy** — UX/UI Design
* **Youssef Essam** — QA & Operations

*Supervised by Dr. Ahmed Mahran*
