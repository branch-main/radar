from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import ai, jobs
from app.core.settings import settings

app = FastAPI(
    title="Radar API",
    version="0.1.0",
    description=(
        "API de servicios de IA para Radar. Las apps gestionan datos en Supabase "
        "directamente y usan este backend para clasificación y matching de reportes."
    ),
    openapi_tags=[
        {
            "name": "ai",
            "description": "Servicios de IA y clasificación de reportes.",
        },
        {
            "name": "jobs",
            "description": "Trabajos programados del backend.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai.router)
app.include_router(jobs.router)
