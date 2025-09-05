# ---- build stage ----
    FROM python:3.11-slim AS builder
    WORKDIR /app
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
    RUN apt-get update && apt-get install -y build-essential && rm -rf /var/lib/apt/lists/*
    
    # copy requirements from repo root path
    COPY menuto-backend/requirements.txt .
    RUN pip install --prefix=/install -r requirements.txt
    
    # ---- runtime stage ----
    FROM python:3.11-slim
    WORKDIR /app
    ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
    
    # system deps for pytesseract
    RUN apt-get update && apt-get install -y --no-install-recommends \
        tesseract-ocr libtesseract-dev \
        && rm -rf /var/lib/apt/lists/*
    
    # python deps from builder
    COPY --from=builder /install /usr/local
    
    # app code from repo root path
    COPY menuto-backend/ ./
    
    EXPOSE 8080
    CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8080"]
    