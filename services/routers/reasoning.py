from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal, List
import asyncio

from owlapy.owl_reasoner import StructuralReasoner, SyncReasoner
from owlapy.class_expression import OWLClass, OWLClassExpression
from owlapy.iri import IRI
from owlapy.owl_ontology import Ontology

from store import ONTOLOGY_STORE, ONTOLOGY_LOCKS
from utils import build_class_expression

router = APIRouter(prefix="/reasoning", tags=["reasoning"])


class IndividualItem(BaseModel):
    iri: str
    name: str


class InstancesRequest(BaseModel):
    class_expression: str  # Class expression in the specified syntax
    syntax: Literal["iri", "dl", "manchester"] = "iri"  # Syntax type for parsing the expression
    reasoner_type: Literal["structural", "sync"] = "structural"
    # For StructuralReasoner
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False
    # For SyncReasoner
    sync_reasoner_name: Optional[Literal["HermiT", "Pellet", "ELK", "JFact", "Openllet", "Structural"]] = "HermiT"


class InstancesResponse(BaseModel):
    ontology_id: str
    class_expression: str
    reasoner_type: str
    individuals: List[IndividualItem]


@router.post("/{oid}/instances", response_model=InstancesResponse)
async def get_instances(oid: str, request: InstancesRequest):
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
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    from threading import Lock
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_instances():
        with lock:
            try:
                # Initialize the appropriate reasoner
                if request.reasoner_type == "structural":
                    reasoner = StructuralReasoner(
                        ont,
                        property_cache=request.property_cache,
                        negation_default=request.negation_default,
                        sub_properties=request.sub_properties
                    )
                elif request.reasoner_type == "sync":
                    # For SyncReasoner, we need to pass the ontology path or a SyncOntology
                    # Since we're working with already loaded ontologies, we'll need to handle this differently
                    # For now, we'll use StructuralReasoner as fallback
                    # TODO: Add support for SyncReasoner by saving ontology temporarily
                    raise HTTPException(
                        status_code=501, 
                        detail="SyncReasoner not yet implemented. Please use 'structural' reasoner type."
                    )
                else:
                    raise HTTPException(status_code=400, detail=f"Unknown reasoner type: {request.reasoner_type}")
                
                # Parse the class expression with support for complex expressions
                try:
                    class_expression = build_class_expression(
                        request.class_expression,
                        ont,
                        request.syntax
                    )
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=str(e))
                
                # Get instances
                instances = reasoner.instances(class_expression)
                
                # Convert to response format
                individuals = []
                for ind in instances:
                    iri_str = ind.iri.as_str()
                    name = iri_str.split('#')[-1].split('/')[-1]
                    individuals.append(IndividualItem(iri=iri_str, name=name))
                
                return InstancesResponse(
                    ontology_id=oid,
                    class_expression=request.class_expression,
                    reasoner_type=request.reasoner_type,
                    individuals=individuals
                )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")
    
    return await asyncio.to_thread(_get_instances)


class SuperClassesRequest(BaseModel):
    class_iri: str
    reasoner_type: Literal["structural", "sync"] = "structural"
    direct: bool = False
    only_named: bool = True
    # For StructuralReasoner
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False


class ClassItem(BaseModel):
    iri: str
    name: str


class SuperClassesResponse(BaseModel):
    ontology_id: str
    class_iri: str
    super_classes: List[ClassItem]


@router.post("/{oid}/super-classes", response_model=SuperClassesResponse)
async def get_super_classes(oid: str, request: SuperClassesRequest):
    """Get super classes of a class using a reasoner."""
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    from threading import Lock
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_super_classes():
        with lock:
            try:
                if request.reasoner_type == "structural":
                    reasoner = StructuralReasoner(
                        ont,
                        property_cache=request.property_cache,
                        negation_default=request.negation_default,
                        sub_properties=request.sub_properties
                    )
                else:
                    raise HTTPException(
                        status_code=501, 
                        detail="SyncReasoner not yet implemented. Please use 'structural' reasoner type."
                    )
                
                class_iri = IRI.create(request.class_iri)
                owl_class = OWLClass(class_iri)
                
                super_classes = reasoner.super_classes(owl_class, direct=request.direct, only_named=request.only_named)
                
                classes = []
                for cls in super_classes:
                    iri_str = cls.iri.as_str()
                    name = iri_str.split('#')[-1].split('/')[-1]
                    classes.append(ClassItem(iri=iri_str, name=name))
                
                return SuperClassesResponse(
                    ontology_id=oid,
                    class_iri=request.class_iri,
                    super_classes=classes
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")
    
    return await asyncio.to_thread(_get_super_classes)


class SubClassesRequest(BaseModel):
    class_iri: str
    reasoner_type: Literal["structural", "sync"] = "structural"
    direct: bool = False
    only_named: bool = True
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False


class SubClassesResponse(BaseModel):
    ontology_id: str
    class_iri: str
    sub_classes: List[ClassItem]


@router.post("/{oid}/sub-classes", response_model=SubClassesResponse)
async def get_sub_classes(oid: str, request: SubClassesRequest):
    """Get sub classes of a class using a reasoner."""
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    from threading import Lock
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_sub_classes():
        with lock:
            try:
                if request.reasoner_type == "structural":
                    reasoner = StructuralReasoner(
                        ont,
                        property_cache=request.property_cache,
                        negation_default=request.negation_default,
                        sub_properties=request.sub_properties
                    )
                else:
                    raise HTTPException(
                        status_code=501, 
                        detail="SyncReasoner not yet implemented. Please use 'structural' reasoner type."
                    )
                
                class_iri = IRI.create(request.class_iri)
                owl_class = OWLClass(class_iri)
                
                sub_classes = reasoner.sub_classes(owl_class, direct=request.direct, only_named=request.only_named)
                
                classes = []
                for cls in sub_classes:
                    iri_str = cls.iri.as_str()
                    name = iri_str.split('#')[-1].split('/')[-1]
                    classes.append(ClassItem(iri=iri_str, name=name))
                
                return SubClassesResponse(
                    ontology_id=oid,
                    class_iri=request.class_iri,
                    sub_classes=classes
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")
    
    return await asyncio.to_thread(_get_sub_classes)


class TypesRequest(BaseModel):
    individual_iri: str
    reasoner_type: Literal["structural", "sync"] = "structural"
    property_cache: bool = True
    negation_default: bool = True
    sub_properties: bool = False


class TypesResponse(BaseModel):
    ontology_id: str
    individual_iri: str
    types: List[ClassItem]


@router.post("/{oid}/types", response_model=TypesResponse)
async def get_types(oid: str, request: TypesRequest):
    """Get all types of an individual using a reasoner."""
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    from threading import Lock
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _get_types():
        with lock:
            try:
                from owlapy.owl_individual import OWLNamedIndividual
                
                if request.reasoner_type == "structural":
                    reasoner = StructuralReasoner(
                        ont,
                        property_cache=request.property_cache,
                        negation_default=request.negation_default,
                        sub_properties=request.sub_properties
                    )
                else:
                    raise HTTPException(
                        status_code=501, 
                        detail="SyncReasoner not yet implemented. Please use 'structural' reasoner type."
                    )
                
                individual_iri = IRI.create(request.individual_iri)
                individual = OWLNamedIndividual(individual_iri)
                
                types = reasoner.types(individual)
                
                classes = []
                for cls in types:
                    iri_str = cls.iri.as_str()
                    name = iri_str.split('#')[-1].split('/')[-1]
                    classes.append(ClassItem(iri=iri_str, name=name))
                
                return TypesResponse(
                    ontology_id=oid,
                    individual_iri=request.individual_iri,
                    types=classes
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Reasoning failed: {str(e)}")
    
    return await asyncio.to_thread(_get_types)

