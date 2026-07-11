from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router

app = FastAPI(
    title="EcoShield SecureRoute Backend",
    version="1.0.0",
    description="Backend API for EcoShield SecureRoute"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Hackathon only
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {
        "message": "EcoShield Backend Running",
        "version": "1.0.0"
    }