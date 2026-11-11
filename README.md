# Radioloq — Digital Radiology Platform

An independent, full-stack radiology MVP featuring web-based DICOM viewing, Voice AI reporting, online consultations, report templates, clinic-to-cloud PACS bridging, and PDF/Word export.

## Prerequisites
- **Node.js 18+** (tested on Node v22)
- **Docker Desktop** (for PostgreSQL, MinIO, and Orthanc)
- **OpenAI API Key** *(optional — browser Live Speech Recognition + local report structuring fallback work out-of-the-box without an API key)*

## Quick Start

### 1. Start Infrastructure
Start Docker Desktop, then run:
```bash
docker compose up -d
```
Services started:
- **PostgreSQL** (`localhost:5432`)
- **Orthanc DICOM Server** (`localhost:8042`, DICOM AE `localhost:4242`)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env   # On Windows PowerShell: Copy-Item .env.example .env
npm install
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```
Backend API runs on `http://localhost:5000` (health check at `GET /health`).

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:3000`.

## Seeded Demo Accounts
| Role | Email | Password |
|---|---|---|
| Doctor | `doctor@radioloq.com` | `password123` |
| Patient | `patient@radioloq.com` | `password123` |
| Super Admin | `admin@radioloq.com` | `password123` |

## Architecture & Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router v6, TanStack Query, Zustand
- **DICOM Viewer**: `@cornerstonejs/core`, `@cornerstonejs/tools`, `@cornerstonejs/dicom-image-loader`
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL
- **Voice AI**: OpenAI Whisper (`whisper-1`) + `gpt-4o-mini` with Web Speech API + deterministic section-parser fallback
- **Document Export**: `puppeteer-core` (system Chrome/Edge) with `pdfkit` fallback for PDF, and `docx` for Word (`.docx`)

## Core Features
- **Authentication**: JWT access (1h) + refresh (7d) tokens, role-based access (`DOCTOR`, `PATIENT`, `CLINIC_ADMIN`, `SUPER_ADMIN`)
- **DICOM Viewer**: Drag-and-drop local `.dcm` files or load uploaded cloud studies (`?studyId=...`), Window/Level presets (Brain, Lung, Bone, Abdomen), Pan, Zoom, Stack Scroll, Length/Angle/ROI measurements, Invert, Reset
- **Voice AI Reporting**: Live browser dictation, audio recording to Whisper, AI/fallback structuring into 5 radiology sections, template application, save to editor
- **Consultations**: Request form, urgency (`ROUTINE`, `URGENT`, `STAT`), status lifecycle (`PENDING` → `IN_PROGRESS` → `COMPLETED` → `DELIVERED`), messaging thread, linked DICOM study
- **Reports & Templates**: Draft/Final versioning, custom template creator, clinic letterhead preview, PDF & Word export
- **Clinic PACS Bridge**: AE Title & PACS host/port settings, live Orthanc connectivity test, sync logs
- **Doctor Directory**: Searchable specialist directory with one-click consultation booking
- **Profile & Settings**: Personal info, clinic letterhead settings, password update
