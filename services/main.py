# app.py
# FastAPI endpoint to upload an ontology and store it in memory.
# Assumes your OWL classes (Ontology, IRI, etc.) are importable.
# If they’re in the same file/module, adjust the import accordingly.

from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Literal, Optional, Union
import tempfile
import os
import uuid

from owlapy.owl_ontology import Ontology
from rdflib import BNode, URIRef, Literal

app = FastAPI(title="Ontology Upload API")

# In-memory store: maps an ID (string) -> Ontology instance
ONTOLOGY_STORE: Dict[str, Ontology] = {}


# ---------- Models ----------

class UploadResponse(BaseModel):
    id: str
    filename: str
    ontology_iri: Optional[str] = None
    summary: Dict[str, int]


class ListResponse(BaseModel):
    ids: List[str]


class SummaryResponse(BaseModel):
    id: str
    ontology_iri: Optional[str] = None
    summary: Dict[str, int]

class TripleJSON(BaseModel):
    s: str
    p: str
    o: Union[str, dict]  # string for URIs/blank nodes; dict for literals

class TriplesResponse(BaseModel):
    id: str
    total: Optional[int] = None
    triples: List[TripleJSON]

def _ontology_summary(ont: Ontology) -> Dict[str, int]:

    classes = sum(1 for _ in ont.classes_in_signature())
    obj_props = sum(1 for _ in ont.object_properties_in_signature())
    data_props = sum(1 for _ in ont.data_properties_in_signature())
    inds = sum(1 for _ in ont.individuals_in_signature())
    triples = len(ont)

    return {
        "triples": triples,
        "classes": classes,
        "object_properties": obj_props,
        "data_properties": data_props,
        "individuals": inds,
    }


# ---------- Routes ----------

@app.post("/ontology/upload", response_model=UploadResponse)
async def upload_ontology(file: UploadFile = File(...)):
    # Basic content-type / extension sanity check
    allowed_exts = (".owl", ".rdf", ".xml", ".ttl", ".n3", ".nt")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload an OWL/RDF file: {allowed_exts}"
        )

    # Persist to a temp file so Ontology(...) can load it
    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        # Load ontology into memory (owlready2 world inside your Ontology class)
        ont = Ontology(tmp_path, load=True)

        # Prefer the ontology IRI as a stable key if present; otherwise use a UUID
        oid = None
        try:
            onto_id = ont.get_ontology_id()
            if onto_id:
                doc_iri = onto_id.get_ontology_iri() or onto_id.get_version_iri()
                oid = doc_iri.str()
        except Exception:
            pass
        if not oid:
            oid = str(uuid.uuid4())

        ONTOLOGY_STORE[oid] = ont

        # Summarize
        summary = _ontology_summary(ont)
        ontology_iri = None
        try:
            ontology_iri = ont.get_ontology_id().get_ontology_iri().str()
        except Exception:
            pass

        return UploadResponse(
            id=oid,
            filename=file.filename,
            ontology_iri=ontology_iri,
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse ontology: {e}")
    finally:
        # We keep only the in-memory world/ontology; temp file can go
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.get("/ontology", response_model=ListResponse)
def list_ontologies():
    return ListResponse(ids=list(ONTOLOGY_STORE.keys()))


@app.get("/ontology/{oid}/summary", response_model=SummaryResponse)
def get_summary(oid: str):
    ont = ONTOLOGY_STORE.get(oid)
    if ont is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    summary = _ontology_summary(ont)
    ontology_iri = None
    try:
        ontology_iri = ont.get_ontology_id().get_ontology_iri().str()
    except Exception:
        pass
    return SummaryResponse(id=oid, ontology_iri=ontology_iri, summary=summary)


@app.delete("/ontology/{oid}")
def delete_ontology(oid: str):
    if oid not in ONTOLOGY_STORE:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    del ONTOLOGY_STORE[oid]
    return {"ok": True, "deleted": oid}

@app.get("/ontology/{oid}/triples", response_model=TriplesResponse)
def list_triples(oid: str, limit: int = 1000, offset: int = 0):
    ont = ONTOLOGY_STORE.get(oid)
    if not ont:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")

    # rdflib view over the owlready2 world
    g = ont._world.as_rdflib_graph()

    # optional total count (can be expensive on huge graphs—omit if not needed)
    total = len(g)

    triples_out: List[TripleJSON] = []
    # paginate
    for i, (s, p, o) in enumerate(g.triples((None, None, None))):
        if i < offset: 
            continue
        if len(triples_out) >= limit:
            break

        def node_to_json(x):
            if isinstance(x, Literal):
                return {
                    "type": "literal",
                    "value": str(x),
                    "datatype": str(x.datatype) if x.datatype else None,
                    "lang": x.language,
                }
            elif isinstance(x, (URIRef, BNode)):
                return str(x)
            return str(x)

        triples_out.append(TripleJSON(s=str(s), p=str(p), o=node_to_json(o)))

    return TriplesResponse(id=oid, total=total, triples=triples_out)