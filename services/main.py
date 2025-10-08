from fastapi import FastAPI

from routers import ontology, modify
import store

app = FastAPI(title="Ontology Upload API")

app.state.ontology_store = store.ONTOLOGY_STORE
app.state.ontology_locks = store.ONTOLOGY_LOCKS

app.include_router(ontology.router)
app.include_router(modify.router)
