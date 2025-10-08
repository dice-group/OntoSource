from fastapi import FastAPI

from routers import ontology

app = FastAPI(title="Ontology Upload API")

app.include_router(ontology.router)
