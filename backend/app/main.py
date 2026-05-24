from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router


def create_app() -> FastAPI:
    app = FastAPI(
        title="AI Blog Generator - Advanced",
        description="LangGraph-powered blog generation, section editing, metadata editing, and Q&A",
        version="2.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(router)
    return app


app = create_app()
