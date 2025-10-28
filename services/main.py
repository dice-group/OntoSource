from fastapi import FastAPI

from routers import ontology, modify, reasoning, neural_reasoning, generate_ontology
import store

app = FastAPI(title="Ontology Upload API")

app.state.ontology_store = store.ONTOLOGY_STORE
app.state.ontology_locks = store.ONTOLOGY_LOCKS

app.include_router(ontology.router)
app.include_router(modify.router)
app.include_router(reasoning.router)
app.include_router(neural_reasoning.router)
app.include_router(generate_ontology.router)
