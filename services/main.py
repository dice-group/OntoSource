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
import asyncio
from threading import Lock

from owlapy.owl_ontology import Ontology
from rdflib import BNode, URIRef, Literal

app = FastAPI(title="Ontology Upload API")

# In-memory store: maps an ID (string) -> (Ontology instance, filename)
ONTOLOGY_STORE: Dict[str, tuple[Ontology, str]] = {}

# Thread locks for each ontology to prevent concurrent access
ONTOLOGY_LOCKS: Dict[str, Lock] = {}


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

class OntologyInfo(BaseModel):
    id: str
    filename: str
    ontology_iri: Optional[str] = None
    summary: Dict[str, Union[int, str]]  # includes both counts and namespace

class SummaryAllResponse(BaseModel):
    summary: List[OntologyInfo]

class TripleJSON(BaseModel):
    s: str
    p: str
    o: Union[str, dict]  # string for URIs/blank nodes; dict for literals

class TriplesResponse(BaseModel):
    id: str
    total: Optional[int] = None
    triples: List[TripleJSON]

def _get_ontology_iri(ont: Ontology) -> Optional[str]:
    """
    Extracts the ontology IRI from an Ontology instance.
    Returns the IRI as a string, or None if it cannot be extracted.
    """
    try:
        ontology_iri = ont.get_ontology_id().get_ontology_iri().as_str()
        return ontology_iri
    except Exception:
        pass
    return None

def _ontology_summary(ont: Ontology) -> Dict[str, int]:
    """Returns just the numeric counts for an ontology."""
    classes = sum(1 for _ in ont.classes_in_signature())
    obj_props = sum(1 for _ in ont.object_properties_in_signature())
    data_props = sum(1 for _ in ont.data_properties_in_signature())
    inds = sum(1 for _ in ont.individuals_in_signature())
    
    # Use rdflib graph to count triples, as len(ont) can fail with database issues
    try:
        triples = len(ont)
    except Exception:
        # Fallback to counting via rdflib graph for any error (TypeError, AttributeError, sqlite3.InterfaceError, etc.)
        g = ont._world.as_rdflib_graph()
        triples = len(g)

    return {
        "triples": triples,
        "classes": classes,
        "object_properties": obj_props,
        "data_properties": data_props,
        "individuals": inds,
    }

def _ontology_info(oid: str, ont: Ontology, filename: str) -> OntologyInfo:
    """Returns full ontology info including id, filename, iri, and summary with namespace."""
    summary = _ontology_summary(ont)
    
    # Get namespace/ontology IRI using helper function
    ontology_iri = _get_ontology_iri(ont)
    
    # Add namespace to summary
    summary_with_namespace = {**summary}
    if ontology_iri:
        summary_with_namespace["namespace"] = ontology_iri
    
    return OntologyInfo(
        id=oid,
        filename=filename,
        ontology_iri=ontology_iri,
        summary=summary_with_namespace
    )



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

        oid = None
        oid = str(uuid.uuid4())

        ONTOLOGY_STORE[oid] = (ont, file.filename or "unknown.owl")
        ONTOLOGY_LOCKS[oid] = Lock()  # Create a lock for this ontology

        # Summarize
        summary = _ontology_summary(ont)
        ontology_iri = _get_ontology_iri(ont)

        return UploadResponse(
            id=oid,
            filename=file.filename or "unknown.owl",
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
async def get_summary(oid: str):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    # Get or create lock for this ontology
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_summary():
        with lock:
            summary = _ontology_summary(ont)
            ontology_iri = _get_ontology_iri(ont)
            return SummaryResponse(id=oid, ontology_iri=ontology_iri, summary=summary)
    
    return await asyncio.to_thread(_get_summary)

@app.get("/ontology/summary_all")
async def get_summary_all():
    def _get_all_summaries():
        summaries = []
        for oid, (ont, filename) in ONTOLOGY_STORE.items():
            # Get or create lock for this ontology
            lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
            with lock:
                summaries.append(_ontology_info(oid, ont, filename))
        return SummaryAllResponse(summary=summaries)
    
    return await asyncio.to_thread(_get_all_summaries)

@app.delete("/ontology/{oid}")
def delete_ontology(oid: str):
    if oid not in ONTOLOGY_STORE:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    del ONTOLOGY_STORE[oid]
    # Also remove the lock for this ontology
    if oid in ONTOLOGY_LOCKS:
        del ONTOLOGY_LOCKS[oid]
    return {"ok": True, "deleted": oid}

@app.get("/ontology/{oid}/triples", response_model=TriplesResponse)
async def list_triples(oid: str, limit: Optional[int] = None, offset: int = 0):
    result = ONTOLOGY_STORE.get(oid)
    if not result:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result

    # Get or create lock for this ontology
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())

    def _get_triples():
        with lock:
            # rdflib view over the owlready2 world
            g = ont._world.as_rdflib_graph()

            # optional total count (can be expensive on huge graphs—omit if not needed)
            total = len(g)

            triples_out: List[TripleJSON] = []
            # paginate
            for i, (s, p, o) in enumerate(g.triples((None, None, None))):
                if i < offset: 
                    continue
                if limit is not None and len(triples_out) >= limit:
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
    
    return await asyncio.to_thread(_get_triples)