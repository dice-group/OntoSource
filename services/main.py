import os
import shutil

if not os.environ.get("JAVA_HOME") and not shutil.which("java"):
    from jdk4py import JAVA_HOME

    os.environ["JAVA_HOME"] = str(JAVA_HOME)

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from routers import ontology, modify, reasoning, neural_reasoning, generate_ontology, triples
import store

app = FastAPI(title="Ontology Upload API")

app.state.ontology_store = store.ONTOLOGIES


@app.exception_handler(store.OntologyNotFound)
async def ontology_not_found(request, exc):
    return JSONResponse(status_code=404, content={"detail": "Ontology ID not found."})


app.include_router(ontology.router)
app.include_router(modify.router)
app.include_router(reasoning.router)
app.include_router(neural_reasoning.router)
app.include_router(generate_ontology.router)

app.include_router(triples.router)
