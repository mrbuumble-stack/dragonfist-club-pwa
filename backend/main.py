"""
DragonFist Club — Backend API
==============================
FastAPI backend che legge i dati dei membri dal Google Sheet pubblico
e li espone come API REST per la PWA frontend.

Avvia con: uvicorn main:app --reload --host 0.0.0.0 --port 8000
"""

import os
import csv
import io
import time
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Carica variabili d'ambiente
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI(
    title="DragonFist Club API",
    description="API per la PWA dell'associazione DragonFist Club",
    version="0.1.0",
)

# ── CORS ──────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Google Sheets Config ──────────────────────────────
SHEET_ID = os.getenv(
    "GOOGLE_SHEET_ID",
    "1BVBIw8dl2Q5CiPewZV4x4ZP8MPVgrKkD2fHAkvbkff4",
)
SHEET_CSV_URL = (
    f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv"
)

# ── Cache in memoria ─────────────────────────────────
# Evitiamo di martellare Google Sheets ad ogni richiesta.
# I dati vengono ri-fetchati ogni 5 minuti.
CACHE_TTL_SECONDS = 300  # 5 minuti
_cache: dict = {"data": None, "timestamp": 0}


async def _fetch_members() -> list[dict]:
    """
    Fetcha il CSV dal Google Sheet pubblico, parsa le righe
    e restituisce una lista di dizionari.
    Usa cache in memoria con TTL di 5 minuti.
    """
    now = time.time()

    # Restituisci dalla cache se ancora valida
    if _cache["data"] is not None and (now - _cache["timestamp"]) < CACHE_TTL_SECONDS:
        return _cache["data"]

    # Fetch CSV dal Google Sheet
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(SHEET_CSV_URL)

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Impossibile raggiungere il Google Sheet. Riprova più tardi.",
        )

    # Parsa il CSV
    text = response.text
    reader = csv.DictReader(io.StringIO(text))
    members = []
    for row in reader:
        members.append(
            {
                "nome": (row.get("Nome") or "").strip(),
                "cognome": (row.get("Cognome") or "").strip(),
                "email": (row.get("Email") or "").strip().lower(),
                "foto": (row.get("Foto") or "").strip(),
                "punti": _parse_int(row.get("Punti", "0")),
            }
        )

    # Aggiorna la cache
    _cache["data"] = members
    _cache["timestamp"] = now

    return members


def _parse_int(value: str) -> int:
    """Parsa un intero in modo sicuro, restituendo 0 se non valido."""
    try:
        return int(value.strip())
    except (ValueError, AttributeError):
        return 0


# ── Endpoints ─────────────────────────────────────────


@app.get("/")
async def root():
    """Health-check endpoint."""
    return {"status": "ok", "service": "DragonFist Club API 🐉"}


@app.get("/health")
async def health():
    """Health-check dettagliato."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "sheet_id": SHEET_ID,
    }


@app.get("/api/member")
async def get_member(email: str = Query(..., description="Email del membro")):
    """
    Restituisce i dati di un membro cercandolo per email.
    Se l'email compare più volte nel foglio, restituisce la somma dei punti.
    """
    email_lower = email.strip().lower()
    members = await _fetch_members()

    # Filtra tutti i record per questa email
    matches = [m for m in members if m["email"] == email_lower]

    if not matches:
        raise HTTPException(
            status_code=404,
            detail="Membro non trovato. Controlla l'email e riprova.",
        )

    # Combina i dati: somma i punti di tutti i record con la stessa email
    first = matches[0]
    total_punti = sum(m["punti"] for m in matches)

    return {
        "nome": first["nome"],
        "cognome": first["cognome"],
        "email": first["email"],
        "foto": first["foto"],
        "punti": total_punti,
    }


@app.get("/api/members/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    Restituisce la classifica dei membri per punti (top N).
    I punti vengono aggregati per email.
    """
    members = await _fetch_members()

    # Aggrega punti per email
    aggregated: dict[str, dict] = {}
    for m in members:
        key = m["email"]
        if key in aggregated:
            aggregated[key]["punti"] += m["punti"]
        else:
            aggregated[key] = {**m}

    # Ordina per punti decrescenti
    leaderboard = sorted(aggregated.values(), key=lambda x: x["punti"], reverse=True)

    return {"leaderboard": leaderboard[:limit]}
