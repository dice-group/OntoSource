from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Literal, List
import os
import jpype
import tempfile
from contextlib import contextmanager

from owlapy import (
    owl_expression_to_dl,
    owl_expression_to_manchester,
    owl_expression_to_sparql,
)
from owlapy.owl_reasoner import StructuralReasoner, SyncReasoner
from owlapy.owl_reasoner_rdflib import RDFLibReasoner
from owlapy.class_expression import OWLClass
from owlapy.iri import IRI
from owlapy.owl_ontology import SyncOntology

from store import ONTOLOGIES
from utils import build_class_expression

router = APIRouter(prefix="/reasoning", tags=["reasoning"])


@contextmanager
def _sync_reasoner_for(ont, reasoner_name: str):
    """Persist the in-memory ontology to a temp OWL file and yield a SyncReasoner bound to it."""
    fd, tmp_path = tempfile.mkstemp(suffix=".owl")
    os.close(fd)
    try:
        ont.save(IRI.create(tmp_path))
        sync_ont = SyncOntology(tmp_path)
        with SyncReasoner(sync_ont, reasoner=reasoner_name) as reasoner:
            yield reasoner
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        if jpype.isJVMStarted():
            jpype.java.lang.Thread.detach()


@contextmanager
def _build_reasoner(ont, request):
    """Yield the reasoner selected by request.reasoner_type."""
    if request.reasoner_type in ("structural", "rdflib"):
        reasoner_class = (
            RDFLibReasoner if request.reasoner_type == "rdflib" else StructuralReasoner
        )
        yield reasoner_class(
            ont,
            property_cache=request.property_cache,
            negation_default=request.negation_default,
            sub_properties=request.sub_properties,
        )
    elif request.reasoner_type == "sync":
        sync_name = getattr(request, "sync_reasoner_name", None) or "HermiT"
        with _sync_reasoner_for(ont, sync_name) as reasoner:
            yield reasoner
    else:
        raise HTTPException(
            status_code=400, detail=f"Unknown reasoner type: {request.reasoner_type}"
        )


class IndividualItem(BaseModel):
    iri: str
    name: str


class InstancesRequest(BaseModel):
    class_expression: str  # Class expression in the specified syntax
    syntax: Literal["iri", "dl", "manchester"] = (
        "iri"  # Syntax type for parsing the expression
    )
    reasoner_type: Literal["structural", "rdflib", "sync"] = "structural"
    # For StructuralReasoner
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False
    # For SyncReasoner
    sync_reasoner_name: Optional[
        Literal["HermiT", "Pellet", "ELK", "JFact", "Openllet", "Structural"]
    ] = "HermiT"


class InstancesResponse(BaseModel):
    ontology_id: str
    class_expression: str
    reasoner_type: str
    individuals: List[IndividualItem]


@router.post("/{oid}/instances", response_model=InstancesResponse)
def get_instances(oid: str, request: InstancesRequest):
    """
    Get instances of a class expression using a reasoner.

    Supports:
    - StructuralReasoner: Fast reasoner with configurable options
    - SyncReasoner: Full reasoning using Java reasoners (HermiT, Pellet, ELK, etc.)

    Class Expression Syntax:
    - "iri": Simple class IRI (e.g., "http://example.com/family#Person")
    - "dl": Description Logic syntax (e.g., "∃ hasChild.male")
    - "manchester": Manchester syntax (e.g., "female and (hasChild max 2 person)")
    """
    with ONTOLOGIES.locked(oid) as (ont, _):
        try:
            try:
                class_expression = build_class_expression(
                    request.class_expression, ont, request.syntax
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))

            with _build_reasoner(ont, request) as reasoner:
                instances = reasoner.instances(class_expression)

                individuals = []
                for ind in instances:
                    iri_str = ind.iri.as_str()
                    name = iri_str.split("#")[-1].split("/")[-1]
                    individuals.append(IndividualItem(iri=iri_str, name=name))

            return InstancesResponse(
                ontology_id=oid,
                class_expression=request.class_expression,
                reasoner_type=request.reasoner_type,
                individuals=individuals,
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")


class SuperClassesRequest(BaseModel):
    class_iri: str
    reasoner_type: Literal["structural", "rdflib", "sync"] = "structural"
    direct: bool = False
    only_named: bool = True
    # For StructuralReasoner
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False
    # For SyncReasoner
    sync_reasoner_name: Optional[
        Literal["HermiT", "Pellet", "ELK", "JFact", "Openllet", "Structural"]
    ] = "HermiT"


class ClassItem(BaseModel):
    iri: Optional[str]
    name: str


def _class_item(expression):
    if isinstance(expression, OWLClass):
        iri = expression.iri.as_str()
        return ClassItem(iri=iri, name=iri.split("#")[-1].split("/")[-1])
    return ClassItem(iri=None, name=owl_expression_to_dl(expression))


class SuperClassesResponse(BaseModel):
    ontology_id: str
    class_iri: str
    super_classes: List[ClassItem]


@router.post("/{oid}/super-classes", response_model=SuperClassesResponse)
def get_super_classes(oid: str, request: SuperClassesRequest):
    """Get super classes of a class using a reasoner."""
    with ONTOLOGIES.locked(oid) as (ont, _):
        try:
            class_iri = IRI.create(request.class_iri)
            owl_class = OWLClass(class_iri)

            with _build_reasoner(ont, request) as reasoner:
                if request.reasoner_type == "sync":
                    super_classes = reasoner.super_classes(
                        owl_class, direct=request.direct
                    )
                    if request.only_named:
                        super_classes = [
                            c for c in super_classes if isinstance(c, OWLClass)
                        ]
                else:
                    super_classes = reasoner.super_classes(
                        owl_class, direct=request.direct, only_named=request.only_named
                    )

                classes = [_class_item(cls) for cls in super_classes]

            return SuperClassesResponse(
                ontology_id=oid, class_iri=request.class_iri, super_classes=classes
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")


class SubClassesRequest(BaseModel):
    class_iri: str
    reasoner_type: Literal["structural", "rdflib", "sync"] = "structural"
    direct: bool = False
    only_named: bool = True
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False
    # For SyncReasoner
    sync_reasoner_name: Optional[
        Literal["HermiT", "Pellet", "ELK", "JFact", "Openllet", "Structural"]
    ] = "HermiT"


class SubClassesResponse(BaseModel):
    ontology_id: str
    class_iri: str
    sub_classes: List[ClassItem]


@router.post("/{oid}/sub-classes", response_model=SubClassesResponse)
def get_sub_classes(oid: str, request: SubClassesRequest):
    """Get sub classes of a class using a reasoner."""
    with ONTOLOGIES.locked(oid) as (ont, _):
        try:
            class_iri = IRI.create(request.class_iri)
            owl_class = OWLClass(class_iri)

            with _build_reasoner(ont, request) as reasoner:
                if request.reasoner_type == "sync":
                    sub_classes = reasoner.sub_classes(owl_class, direct=request.direct)
                    if request.only_named:
                        sub_classes = [
                            c for c in sub_classes if isinstance(c, OWLClass)
                        ]
                else:
                    sub_classes = reasoner.sub_classes(
                        owl_class, direct=request.direct, only_named=request.only_named
                    )

                classes = [_class_item(cls) for cls in sub_classes]

            return SubClassesResponse(
                ontology_id=oid, class_iri=request.class_iri, sub_classes=classes
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")


class TypesRequest(BaseModel):
    individual_iri: str
    reasoner_type: Literal["structural", "rdflib", "sync"] = "structural"
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False
    direct: bool = False
    # For SyncReasoner
    sync_reasoner_name: Optional[
        Literal["HermiT", "Pellet", "ELK", "JFact", "Openllet", "Structural"]
    ] = "HermiT"


class TypesResponse(BaseModel):
    ontology_id: str
    individual_iri: str
    types: List[ClassItem]


@router.post("/{oid}/types", response_model=TypesResponse)
def get_types(oid: str, request: TypesRequest):
    """Get all types of an individual using a reasoner."""
    with ONTOLOGIES.locked(oid) as (ont, _):
        try:
            from owlapy.owl_individual import OWLNamedIndividual

            individual_iri = IRI.create(request.individual_iri)
            individual = OWLNamedIndividual(individual_iri)

            with _build_reasoner(ont, request) as reasoner:
                types = list(reasoner.types(individual, direct=request.direct))

            classes = []
            for cls in types:
                iri_str = cls.iri.as_str()
                name = iri_str.split("#")[-1].split("/")[-1]
                classes.append(ClassItem(iri=iri_str, name=name))

            return TypesResponse(
                ontology_id=oid, individual_iri=request.individual_iri, types=classes
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")


class ConsistencyRequest(BaseModel):
    sync_reasoner_name: Literal["HermiT", "Pellet", "JFact", "Openllet"] = "HermiT"
    timeout: int = Field(default=60, ge=1, le=300)


@router.post("/{oid}/consistency")
def check_consistency(oid: str, request: ConsistencyRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        try:
            with _sync_reasoner_for(ont, request.sync_reasoner_name) as reasoner:
                consistent = reasoner.has_consistent_ontology(timeout=request.timeout)
            return {
                "ontology_id": oid,
                "consistent": consistent,
                "reasoner": request.sync_reasoner_name,
            }
        except TimeoutError as exc:
            raise HTTPException(
                status_code=504,
                detail="Consistency check timed out. Try a smaller ontology or a longer timeout.",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Consistency check failed: {exc}"
            ) from exc


class ExpressionRequest(BaseModel):
    class_expression: str = Field(min_length=1)
    syntax: Literal["iri", "dl", "manchester"] = "iri"


@router.post("/{oid}/expression")
def convert_expression(oid: str, request: ExpressionRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        try:
            expression = build_class_expression(
                request.class_expression, ont, request.syntax
            )
            return {
                "dl": owl_expression_to_dl(expression),
                "manchester": owl_expression_to_manchester(expression),
                "sparql": owl_expression_to_sparql(expression),
            }
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Cannot convert expression: {exc}"
            ) from exc
