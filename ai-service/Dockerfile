# FaceMark AI Vision Service - Production Dockerfile
# Optimized for Hugging Face Spaces (Free 16GB RAM CPU Tier) & Koyeb / Render
FROM python:3.11-slim

# Prevent interactive prompts and set Python UTF-8 encoding
ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    PYTHONIOENCODING=utf-8 \
    TF_ENABLE_ONEDNN_OPTS=0 \
    PORT=8000

# Install system dependencies for OpenCV and image processing
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set up standard Hugging Face Spaces non-root user (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install Python dependencies into user directory
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Pre-download Facenet512 weights into DeepFace cache to ensure instant cold start (<2s)
RUN mkdir -p $HOME/.deepface/weights && \
    curl -L -o $HOME/.deepface/weights/facenet512_weights.h5 \
    https://github.com/serengil/deepface_models/releases/download/v1.0/facenet512_weights.h5

# Copy application source code
COPY --chown=user:user . .

# Ensure storage directories exist with write permissions
RUN mkdir -p embeddings faces

EXPOSE 8000 7860

# Healthcheck for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
