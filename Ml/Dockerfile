# ─────────────────────────────────────────────────────────
#  Risk-Scoring ML API  (XGBoost + FastAPI)
#  Exposes a REST API that the Backend can call for
#  real-time patient risk predictions.
# ─────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Runtime deps only – no spatial libs needed for the scoring API
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy model artefacts (training/ and models/) and the API layer
COPY . .

EXPOSE 8000

# Use uvicorn; the app entry-point is api.py:app
# If you don't have api.py yet, a placeholder is created in docker-compose
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
