from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Union
import tempfile
import os
import uuid
import asyncio
from threading import Lock

from owlapy.owl_ontology import Ontology
from rdflib import BNode, URIRef, Literal

from store import ONTOLOGY_STORE, ONTOLOGY_LOCKS

router = APIRouter(prefix="/ontology", tags=["ontology"])


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
    summary: Dict[str, Union[int, str]]

class SummaryAllResponse(BaseModel):
    summary: List[OntologyInfo]

class TripleJSON(BaseModel):
    s: str
    p: str
    o: Union[str, dict]

class TriplesResponse(BaseModel):
    id: str
    total: Optional[int] = None
    triples: List[TripleJSON]

class EntityItem(BaseModel):
    iri: str
    name: str

class EntitiesResponse(BaseModel):
    classes: List[EntityItem]
    individuals: List[EntityItem]
    object_properties: List[EntityItem]
    data_properties: List[EntityItem]

def _get_ontology_iri(ont: Ontology) -> Optional[str]:
    try:
        ontology_iri = ont.get_ontology_id().get_ontology_iri().as_str()
        return ontology_iri
    except Exception:
        pass
    return None

def _ontology_summary(ont: Ontology) -> Dict[str, int]:
    classes = sum(1 for _ in ont.classes_in_signature())
    obj_props = sum(1 for _ in ont.object_properties_in_signature())
    data_props = sum(1 for _ in ont.data_properties_in_signature())
    inds = sum(1 for _ in ont.individuals_in_signature())
    
    try:
        triples = len(ont)
    except Exception:
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
    summary = _ontology_summary(ont)
    
    ontology_iri = _get_ontology_iri(ont)
    
    summary_with_namespace = {**summary}
    if ontology_iri:
        summary_with_namespace["namespace"] = ontology_iri
    
    return OntologyInfo(
        id=oid,
        filename=filename,
        ontology_iri=ontology_iri,
        summary=summary_with_namespace
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_ontology(file: UploadFile = File(...)):
    allowed_exts = (".owl", ".rdf", ".xml", ".ttl", ".n3", ".nt")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload an OWL/RDF file: {allowed_exts}"
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(data)
        tmp_path = tmp.name

    try:
        ont = Ontology(tmp_path, load=True)

        oid = None
        oid = str(uuid.uuid4())

        ONTOLOGY_STORE[oid] = (ont, file.filename or "unknown.owl")
        ONTOLOGY_LOCKS[oid] = Lock()

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
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@router.get("", response_model=ListResponse)
def list_ontologies():
    return ListResponse(ids=list(ONTOLOGY_STORE.keys()))


@router.get("/{oid}/summary", response_model=SummaryResponse)
async def get_summary(oid: str):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_summary():
        with lock:
            summary = _ontology_summary(ont)
            ontology_iri = _get_ontology_iri(ont)
            return SummaryResponse(id=oid, ontology_iri=ontology_iri, summary=summary)
    
    return await asyncio.to_thread(_get_summary)

@router.get("/summary_all")
async def get_summary_all():
    def _get_all_summaries():
        summaries = []
        for oid, (ont, filename) in ONTOLOGY_STORE.items():
            lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
            with lock:
                summaries.append(_ontology_info(oid, ont, filename))
        return SummaryAllResponse(summary=summaries)
    
    return await asyncio.to_thread(_get_all_summaries)

@router.delete("/{oid}")
def delete_ontology(oid: str):
    if oid not in ONTOLOGY_STORE:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    del ONTOLOGY_STORE[oid]
    if oid in ONTOLOGY_LOCKS:
        del ONTOLOGY_LOCKS[oid]
    return {"ok": True, "deleted": oid}

@router.get("/{oid}/triples", response_model=TriplesResponse)
async def list_triples(oid: str, limit: Optional[int] = None, offset: int = 0):
    result = ONTOLOGY_STORE.get(oid)
    if not result:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result

    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())

    def _get_triples():
        with lock:
            g = ont._world.as_rdflib_graph()

            total = len(g)

            triples_out: List[TripleJSON] = []
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


@router.get("/{oid}/entities", response_model=EntitiesResponse)
async def get_entities(oid: str):
    result = ONTOLOGY_STORE.get(oid)
    if not result:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_entities():
        with lock:
            classes = []
            for cls in ont.classes_in_signature():
                iri = cls.iri.as_str()
                name = iri.split('#')[-1].split('/')[-1]
                classes.append(EntityItem(iri=iri, name=name))
            
            individuals = []
            for ind in ont.individuals_in_signature():
                iri = ind.iri.as_str()
                name = iri.split('#')[-1].split('/')[-1]
                individuals.append(EntityItem(iri=iri, name=name))
            
            object_properties = []
            for prop in ont.object_properties_in_signature():
                iri = prop.iri.as_str()
                name = iri.split('#')[-1].split('/')[-1]
                object_properties.append(EntityItem(iri=iri, name=name))
            
            data_properties = []
            for prop in ont.data_properties_in_signature():
                iri = prop.iri.as_str()
                name = iri.split('#')[-1].split('/')[-1]
                data_properties.append(EntityItem(iri=iri, name=name))
            
            return EntitiesResponse(
                classes=classes,
                individuals=individuals,
                object_properties=object_properties,
                data_properties=data_properties
            )
    
    return await asyncio.to_thread(_get_entities)

