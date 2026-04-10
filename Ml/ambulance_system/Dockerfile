# ─────────────────────────────────────────────────────────
#  Stage 1: dependency builder
#  Installs heavy C-extensions (GDAL, GEOS, OSMnx) once and
#  copies only the compiled site-packages into the final image.
# ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# System-level build deps needed to compile GeoPandas / OSMnx
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libgdal-dev \
        libproj-dev \
        libgeos-dev \
        g++ \
    && rm -rf /var/lib/apt/lists/*

ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────────────────
#  Stage 2: runtime image  (much smaller – no build tools)
# ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Runtime-only C libraries (not build tools)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgdal32 \
        libproj25 \
        libgeos3.11.1 \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled Python packages from builder
COPY --from=builder /install /usr/local

WORKDIR /app

# Copy source code (venv and __pycache__ are excluded by .dockerignore)
COPY . .

# OSMnx caches graph data here; map it to a named volume so
# repeated runs don't re-download the Bengaluru road graph.
ENV OSMNX_CACHE_DIR=/app/cache
RUN mkdir -p /app/cache

# Output path – override at runtime via docker-compose environment
ENV OUTPUT_PATH=/app/output/ambulance_map.html
RUN mkdir -p /app/output

CMD ["python", "main.py"]
