---
title: FaceMark AI Vision Service
emoji: 👁️
colorFrom: indigo
colorTo: purple
sdk: docker
app_port: 8000
pinned: false
---

# FaceMark AI Facial Recognition Microservice

High-performance facial recognition and embedding generation engine powered by **DeepFace**, **Facenet512**, and **FastAPI**.

## Public API Endpoints
- `GET /health`: Liveness and embedding catalog status probe.
- `POST /upload/batch`: Model 1 - Process batch face images and generate canonical 512-d embeddings.
- `POST /recognize`: Model 2 - Real-time camera frame recognition matching against registered student embeddings.
- `GET /docs`: Interactive OpenAPI / Swagger documentation.

## Deployment on Hugging Face Spaces (Free 16GB RAM)
1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Select **Docker** SDK and **CPU Basic (2 vCPU, 16GB RAM, Free)**.
3. Push this directory or mirror from GitHub.
4. Set the resulting public space URL as `AI_SERVICE_URL` in your NestJS backend environment variables.
