# Deployment & Operations Guide

PulseCloud is designed for flexible deployment: zero-dependency local development on Windows/Linux/macOS or enterprise containerized deployments via Docker Compose and Kubernetes.

---

## 1. Local Development Mode (Zero Cloud Costs)

PulseCloud includes a built-in AsyncIO scheduler and SQLite database fallback. You do **not** need a paid cloud account or running Redis to develop or test locally.

### Prerequisites
- Python 3.11+
- Node.js 18+ & npm

### Starting Backend & Frontend
1. Start the FastAPI backend:
   ```bash
   cd backend
   .\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
   ```

2. Start the Vite React frontend:
   ```bash
   cd frontend
   cmd /c "npm run dev"
   ```

3. Open your browser:
   - Dashboard: `http://localhost:5173`
   - API Docs: `http://127.0.0.1:8000/docs`

---

## 2. Docker Compose Deployment (Multi-Container Architecture)

For full distributed monitoring with PostgreSQL, Redis, Celery workers, and Nginx:

1. Configure `.env` from template:
   ```bash
   cp .env.example .env
   ```

2. Build and launch all services:
   ```bash
   docker compose up --build -d
   ```

3. Verify service health:
   ```bash
   docker compose ps
   ```

4. Scale monitoring workers horizontally:
   ```bash
   docker compose up -d --scale worker=4
   ```

5. Stop all services:
   ```bash
   docker compose down -v
   ```

---

## 3. Connecting Managed Cloud Services (AWS / GCP / Azure)

- **PostgreSQL**: Set `DATABASE_URL=postgresql://user:password@rds-instance.rds.amazonaws.com:5432/pulsecloud`
- **Redis**: Set `REDIS_URL=redis://elasticache-cluster:6379/0`
- **Container Registry**: Push Docker images to Amazon ECR or Google Artifact Registry.
