from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Literal, Union, List
import asyncio
from threading import Lock
import uuid

from owlapy.owl_ontology import Ontology
from owlapy.iri import IRI
from owlapy.class_expression import OWLClass
from owlapy.owl_property import OWLObjectProperty, OWLDataProperty
from owlapy.owl_axiom import (
    OWLDeclarationAxiom,
    OWLClassAssertionAxiom,
    OWLObjectPropertyAssertionAxiom,
    OWLDataPropertyAssertionAxiom,
    OWLSubClassOfAxiom,
)
from owlapy.owl_individual import OWLNamedIndividual
from owlapy.owl_literal import OWLLiteral

from store import ONTOLOGY_STORE, ONTOLOGY_LOCKS

router = APIRouter(prefix="/modify", tags=["modify"])


def normalize_namespace(namespace: str) -> str:
    if not namespace:
        return namespace
    if namespace[-1] not in ("/", ":", "#"):
        return namespace + "#"
    return namespace


class CreateOntologyRequest(BaseModel):
    ontology_iri: str
    filename: Optional[str] = "new_ontology.owl"


class CreateOntologyResponse(BaseModel):
    id: str
    filename: str
    ontology_iri: str


class AddClassRequest(BaseModel):
    namespace: str
    class_name: str


class AddPropertyRequest(BaseModel):
    namespace: str
    property_name: str


class AddClassAssertionRequest(BaseModel):
    individual_iri: str
    class_namespace: str
    class_name: str


class AddObjectPropertyAssertionRequest(BaseModel):
    subject_iri: str
    property_namespace: str
    property_name: str
    object_iri: str


class LiteralValue(BaseModel):
    value: Union[str, int, float, bool]
    datatype: Optional[str] = None
    lang: Optional[str] = None


class AddDataPropertyAssertionRequest(BaseModel):
    subject_iri: str
    property_namespace: str
    property_name: str
    literal: LiteralValue


class AddSubClassOfRequest(BaseModel):
    subclass_namespace: str
    subclass_name: str
    superclass_namespace: str
    superclass_name: str


class RemoveAxiomRequest(BaseModel):
    axiom_type: Literal[
        "class_assertion",
        "object_property_assertion",
        "data_property_assertion",
        "declaration"
    ]
    individual_iri: Optional[str] = None
    class_namespace: Optional[str] = None
    class_name: Optional[str] = None
    property_namespace: Optional[str] = None
    property_name: Optional[str] = None
    subject_iri: Optional[str] = None
    object_iri: Optional[str] = None
    literal: Optional[LiteralValue] = None
    entity_iri: Optional[str] = None


class SaveOntologyRequest(BaseModel):
    path: str


class OperationResponse(BaseModel):
    success: bool
    message: str


@router.post("/create", response_model=CreateOntologyResponse)
async def create_ontology(request: CreateOntologyRequest):
    try:
        normalized_iri = normalize_namespace(request.ontology_iri)
        ont = Ontology(IRI.create(normalized_iri), load=False)
        
        oid = str(uuid.uuid4())
        
        ONTOLOGY_STORE[oid] = (ont, request.filename)
        ONTOLOGY_LOCKS[oid] = Lock()
        
        return CreateOntologyResponse(
            id=oid,
            filename=request.filename,
            ontology_iri=normalized_iri
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create ontology: {e}")


@router.post("/{oid}/class", response_model=OperationResponse)
async def add_class(oid: str, request: AddClassRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_class():
        with lock:
            namespace = normalize_namespace(request.namespace)
            iri = IRI(namespace, request.class_name)
            owl_class = OWLClass(iri)
            declaration_axiom = OWLDeclarationAxiom(owl_class)
            ont.add_axiom(declaration_axiom)
            return OperationResponse(
                success=True,
                message=f"Class '{request.class_name}' added successfully."
            )
    
    return await asyncio.to_thread(_add_class)


@router.post("/{oid}/object-property", response_model=OperationResponse)
async def add_object_property(oid: str, request: AddPropertyRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_object_property():
        with lock:
            namespace = normalize_namespace(request.namespace)
            iri = IRI(namespace, request.property_name)
            obj_property = OWLObjectProperty(iri)
            declaration_axiom = OWLDeclarationAxiom(obj_property)
            ont.add_axiom(declaration_axiom)
            return OperationResponse(
                success=True,
                message=f"Object property '{request.property_name}' added successfully."
            )
    
    return await asyncio.to_thread(_add_object_property)


@router.post("/{oid}/data-property", response_model=OperationResponse)
async def add_data_property(oid: str, request: AddPropertyRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_data_property():
        with lock:
            namespace = normalize_namespace(request.namespace)
            iri = IRI(namespace, request.property_name)
            data_property = OWLDataProperty(iri)
            declaration_axiom = OWLDeclarationAxiom(data_property)
            ont.add_axiom(declaration_axiom)
            return OperationResponse(
                success=True,
                message=f"Data property '{request.property_name}' added successfully."
            )
    
    return await asyncio.to_thread(_add_data_property)


@router.post("/{oid}/individual", response_model=OperationResponse)
async def add_individual(oid: str, request: AddClassRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_individual():
        with lock:
            namespace = normalize_namespace(request.namespace)
            iri = IRI(namespace, request.class_name)
            individual = OWLNamedIndividual(iri)
            declaration_axiom = OWLDeclarationAxiom(individual)
            ont.add_axiom(declaration_axiom)
            return OperationResponse(
                success=True,
                message=f"Individual '{request.class_name}' added successfully."
            )
    
    return await asyncio.to_thread(_add_individual)


@router.post("/{oid}/class-assertion", response_model=OperationResponse)
async def add_class_assertion(oid: str, request: AddClassAssertionRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_class_assertion():
        with lock:
            individual = OWLNamedIndividual(IRI.create(request.individual_iri))
            class_namespace = normalize_namespace(request.class_namespace)
            owl_class = OWLClass(IRI(class_namespace, request.class_name))
            assertion_axiom = OWLClassAssertionAxiom(individual, owl_class)
            ont.add_axiom(assertion_axiom)
            return OperationResponse(
                success=True,
                message=f"Class assertion added successfully."
            )
    
    return await asyncio.to_thread(_add_class_assertion)


@router.post("/{oid}/object-property-assertion", response_model=OperationResponse)
async def add_object_property_assertion(oid: str, request: AddObjectPropertyAssertionRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_object_property_assertion():
        with lock:
            subject = OWLNamedIndividual(IRI.create(request.subject_iri))
            property_namespace = normalize_namespace(request.property_namespace)
            prop = OWLObjectProperty(IRI(property_namespace, request.property_name))
            obj = OWLNamedIndividual(IRI.create(request.object_iri))
            assertion_axiom = OWLObjectPropertyAssertionAxiom(subject, prop, obj)
            ont.add_axiom(assertion_axiom)
            return OperationResponse(
                success=True,
                message=f"Object property assertion added successfully."
            )
    
    return await asyncio.to_thread(_add_object_property_assertion)


@router.post("/{oid}/data-property-assertion", response_model=OperationResponse)
async def add_data_property_assertion(oid: str, request: AddDataPropertyAssertionRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_data_property_assertion():
        with lock:
            subject = OWLNamedIndividual(IRI.create(request.subject_iri))
            property_namespace = normalize_namespace(request.property_namespace)
            prop = OWLDataProperty(IRI(property_namespace, request.property_name))
            
            if request.literal.datatype:
                literal = OWLLiteral(request.literal.value, IRI.create(request.literal.datatype))
            elif request.literal.lang:
                literal = OWLLiteral(request.literal.value, lang=request.literal.lang)
            else:
                literal = OWLLiteral(request.literal.value)
            
            assertion_axiom = OWLDataPropertyAssertionAxiom(subject, prop, literal)
            ont.add_axiom(assertion_axiom)
            return OperationResponse(
                success=True,
                message=f"Data property assertion added successfully."
            )
    
    return await asyncio.to_thread(_add_data_property_assertion)


@router.post("/{oid}/subclass-of", response_model=OperationResponse)
async def add_subclass_of(oid: str, request: AddSubClassOfRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _add_subclass_of():
        with lock:
            subclass_namespace = normalize_namespace(request.subclass_namespace)
            superclass_namespace = normalize_namespace(request.superclass_namespace)
            subclass = OWLClass(IRI(subclass_namespace, request.subclass_name))
            superclass = OWLClass(IRI(superclass_namespace, request.superclass_name))
            subclass_axiom = OWLSubClassOfAxiom(subclass, superclass)
            ont.add_axiom(subclass_axiom)
            return OperationResponse(
                success=True,
                message=f"Subclass axiom added successfully."
            )
    
    return await asyncio.to_thread(_add_subclass_of)


@router.delete("/{oid}/axiom", response_model=OperationResponse)
async def remove_axiom(oid: str, request: RemoveAxiomRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _remove_axiom():
        with lock:
            axiom = None
            
            if request.axiom_type == "class_assertion":
                individual = OWLNamedIndividual(IRI.create(request.individual_iri))
                class_namespace = normalize_namespace(request.class_namespace)
                owl_class = OWLClass(IRI(class_namespace, request.class_name))
                axiom = OWLClassAssertionAxiom(individual, owl_class)
                
            elif request.axiom_type == "object_property_assertion":
                subject = OWLNamedIndividual(IRI.create(request.subject_iri))
                property_namespace = normalize_namespace(request.property_namespace)
                prop = OWLObjectProperty(IRI(property_namespace, request.property_name))
                obj = OWLNamedIndividual(IRI.create(request.object_iri))
                axiom = OWLObjectPropertyAssertionAxiom(subject, prop, obj)
                
            elif request.axiom_type == "data_property_assertion":
                subject = OWLNamedIndividual(IRI.create(request.subject_iri))
                property_namespace = normalize_namespace(request.property_namespace)
                prop = OWLDataProperty(IRI(property_namespace, request.property_name))
                
                if request.literal.datatype:
                    literal = OWLLiteral(request.literal.value, IRI.create(request.literal.datatype))
                elif request.literal.lang:
                    literal = OWLLiteral(request.literal.value, lang=request.literal.lang)
                else:
                    literal = OWLLiteral(request.literal.value)
                
                axiom = OWLDataPropertyAssertionAxiom(subject, prop, literal)
                
            elif request.axiom_type == "declaration":
                entity_iri = IRI.create(request.entity_iri)
                
                for cls in ont.classes_in_signature():
                    if cls.get_iri() == entity_iri:
                        axiom = OWLDeclarationAxiom(cls)
                        break
                
                if axiom is None:
                    for prop in ont.object_properties_in_signature():
                        if prop.get_iri() == entity_iri:
                            axiom = OWLDeclarationAxiom(prop)
                            break
                
                if axiom is None:
                    for prop in ont.data_properties_in_signature():
                        if prop.get_iri() == entity_iri:
                            axiom = OWLDeclarationAxiom(prop)
                            break
                
                if axiom is None:
                    for ind in ont.individuals_in_signature():
                        if ind.get_iri() == entity_iri:
                            axiom = OWLDeclarationAxiom(ind)
                            break
            
            if axiom is None:
                raise HTTPException(status_code=400, detail="Could not construct axiom from request.")
            
            ont.remove_axiom(axiom)
            return OperationResponse(
                success=True,
                message=f"Axiom removed successfully."
            )
    
    return await asyncio.to_thread(_remove_axiom)


@router.post("/{oid}/save", response_model=OperationResponse)
async def save_ontology(oid: str, request: SaveOntologyRequest):
    result = ONTOLOGY_STORE.get(oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    ont, _ = result
    
    lock = ONTOLOGY_LOCKS.setdefault(oid, Lock())
    
    def _save_ontology():
        with lock:
            save_iri = IRI.create(request.path)
            ont.save(save_iri)
            return OperationResponse(
                success=True,
                message=f"Ontology saved to '{request.path}' successfully."
            )
    
    return await asyncio.to_thread(_save_ontology)

