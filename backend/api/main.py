import os

from dotenv import load_dotenv
from fastapi import FastAPI
from supabase import Client, create_client

load_dotenv()

supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SECRET_KEY"],
)

app = FastAPI(title="Radar API")


@app.get("/health")
def health():
    return {"status": "ok"}
