"""
Backend API — Entry Point
=========================
FastAPI application per il progetto app_prova.
Avvia con: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carica variabili d'ambiente dal file .env nella root del progetto
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(
    title="App Prova API",
    description="Backend API per il progetto App Prova",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────
# Permetti al frontend Next.js di comunicare con il backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Health-check endpoint."""
    return {"status": "ok", "message": "Backend is running 🚀"}


@app.get("/health")
async def health():
    """Endpoint di health-check dettagliato."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "debug": os.getenv("DEBUG", "false"),
    }
