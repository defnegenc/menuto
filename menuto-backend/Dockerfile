# ---- build stage ----
    FROM python:3.11-slim AS builder
    WORKDIR /app
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
    RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
    COPY requirements.txt .
    RUN pip install --prefix=/install -r requirements.txt
    
    # ---- runtime stage ----
    FROM python:3.11-slim
    WORKDIR /app
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
    
    # system deps for pytesseract
    RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr libtesseract-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # copy python deps from builder
    COPY --from=builder /install /usr/local
    
    # app code
    COPY . .
    
    EXPOSE 8080
    
    # optional healthcheck hits /health
    HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
      CMD python - <<'PY' || exit 1
    import urllib.request, json
    try:
        with urllib.request.urlopen("http://127.0.0.1:8080/health", timeout=2) as r:
            import sys, json as j; sys.exit(0 if j.loads(r.read()).get("ok") else 1)
    except Exception:
        exit(1)
    PY
    
    # uvicorn ASGI server (no --reload in prod)
    CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
    