from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional, Union
import tempfile
import os
import asyncio

from owlapy.owl_ontology import Ontology
from rdflib import BNode, URIRef, Literal, Graph

from store import ONTOLOGIES, NEURAL_ONTOLOGIES, OntologyNotFound

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
        summary=summary_with_namespace,
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_ontology(file: UploadFile = File(...)):
    allowed_exts = (".owl", ".rdf", ".xml", ".ttl", ".n3", ".nt")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload an OWL/RDF file: {allowed_exts}",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty upload.")

    def load_upload():
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "ontology" + ext)
            try:
                if ext in (".ttl", ".n3", ".nt"):
                    graph = Graph().parse(
                        data=data,
                        format={".ttl": "turtle", ".n3": "n3", ".nt": "nt"}[ext],
                    )
                    path = os.path.join(directory, "ontology.owl")
                    graph.serialize(destination=path, format="xml")
                else:
                    with open(path, "wb") as output:
                        output.write(data)
                ont = Ontology(path, load=True)
                summary = _ontology_summary(ont)
                ontology_iri = _get_ontology_iri(ont)
                filename = file.filename or "unknown.owl"
                oid = ONTOLOGIES.add((ont, filename))
                return UploadResponse(
                    id=oid,
                    filename=filename,
                    ontology_iri=ontology_iri,
                    summary=summary,
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=400, detail=f"Failed to parse ontology: {exc}"
                ) from exc

    return await asyncio.to_thread(load_upload)


@router.get("", response_model=ListResponse)
def list_ontologies():
    return ListResponse(ids=ONTOLOGIES.ids())


@router.get("/{oid}/summary", response_model=SummaryResponse)
def get_summary(oid: str):
    with ONTOLOGIES.locked(oid) as (ont, _):
        summary = _ontology_summary(ont)
        ontology_iri = _get_ontology_iri(ont)
        return SummaryResponse(id=oid, ontology_iri=ontology_iri, summary=summary)


@router.get("/summary_all", response_model=SummaryAllResponse)
def get_summary_all():
    summaries = []
    for oid in ONTOLOGIES.ids():
        try:
            with ONTOLOGIES.locked(oid) as (ont, filename):
                summaries.append(_ontology_info(oid, ont, filename))
        except OntologyNotFound:
            continue
    return SummaryAllResponse(summary=summaries)


@router.delete("/{oid}")
def delete_ontology(oid: str):
    with ONTOLOGIES.locked(oid):
        for neural_oid in NEURAL_ONTOLOGIES.ids():
            try:
                with NEURAL_ONTOLOGIES.locked(neural_oid) as (_, source_id):
                    if source_id == oid:
                        NEURAL_ONTOLOGIES.delete(neural_oid)
            except OntologyNotFound:
                continue
        ONTOLOGIES.delete(oid)
    return {"ok": True, "deleted": oid}


@router.get("/{oid}/triples", response_model=TriplesResponse)
def list_triples(
    oid: str,
    limit: Optional[int] = Query(default=None, ge=0),
    offset: int = Query(default=0, ge=0),
):
    with ONTOLOGIES.locked(oid) as (ont, _):
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
                elif isinstance(x, BNode):
                    return "_:" + str(x)
                elif isinstance(x, URIRef):
                    return str(x)
                return str(x)

            triples_out.append(TripleJSON(s=node_to_json(s), p=str(p), o=node_to_json(o)))

        return TriplesResponse(id=oid, total=total, triples=triples_out)


@router.get("/{oid}/entities", response_model=EntitiesResponse)
def get_entities(oid: str):
    with ONTOLOGIES.locked(oid) as (ont, _):
        classes = []
        for cls in ont.classes_in_signature():
            iri = cls.iri.as_str()
            name = iri.split("#")[-1].split("/")[-1]
            classes.append(EntityItem(iri=iri, name=name))

        individuals = []
        for ind in ont.individuals_in_signature():
            iri = ind.iri.as_str()
            name = iri.split("#")[-1].split("/")[-1]
            individuals.append(EntityItem(iri=iri, name=name))

        object_properties = []
        for prop in ont.object_properties_in_signature():
            iri = prop.iri.as_str()
            name = iri.split("#")[-1].split("/")[-1]
            object_properties.append(EntityItem(iri=iri, name=name))

        data_properties = []
        for prop in ont.data_properties_in_signature():
            iri = prop.iri.as_str()
            name = iri.split("#")[-1].split("/")[-1]
            data_properties.append(EntityItem(iri=iri, name=name))

        return EntitiesResponse(
            classes=classes,
            individuals=individuals,
            object_properties=object_properties,
            data_properties=data_properties,
        )


@router.get("/{oid}/download")
def download_ontology(
    oid: str, format: str = Query("xml", pattern="^(xml|turtle|nt)$")
):
    from fastapi import Response
    from owlapy.iri import IRI
    from pathlib import Path
    from urllib.parse import quote

    with ONTOLOGIES.locked(oid) as (ont, filename):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "ontology.owl")
            ont.save(IRI.create(path))
            graph = Graph().parse(path)
            content = graph.serialize(format=format, encoding="utf-8")
    suffix, media_type = {
        "xml": ("owl", "application/rdf+xml"),
        "turtle": ("ttl", "text/turtle"),
        "nt": ("nt", "application/n-triples"),
    }[format]
    name = f"{Path(filename).stem}.{suffix}"
    return Response(
        content,
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(name, safe='')}"
        },
    )
