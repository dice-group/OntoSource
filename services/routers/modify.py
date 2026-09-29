from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator
from typing import Optional, Literal, Union

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
from owlapy.owl_datatype import OWLDatatype
from rdflib import Literal as RDFLiteral, URIRef

from store import ONTOLOGIES
from utils import normalize_namespace

router = APIRouter(prefix="/modify", tags=["modify"])


class CreateOntologyRequest(BaseModel):
    ontology_iri: str
    filename: str = "new_ontology.owl"


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

    @model_validator(mode="after")
    def validate_literal(self):
        if self.datatype and self.lang:
            raise ValueError("A literal cannot have both a datatype and a language.")
        if self.lang and not isinstance(self.value, str):
            raise ValueError("Language-tagged literals must contain text.")
        return self


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
        "declaration",
        "subclass_of",
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
    subclass_namespace: Optional[str] = None
    subclass_name: Optional[str] = None
    superclass_namespace: Optional[str] = None
    superclass_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_axiom_fields(self):
        required = {
            "class_assertion": ("individual_iri", "class_namespace", "class_name"),
            "object_property_assertion": (
                "subject_iri",
                "property_namespace",
                "property_name",
                "object_iri",
            ),
            "data_property_assertion": (
                "subject_iri",
                "property_namespace",
                "property_name",
                "literal",
            ),
            "declaration": ("entity_iri",),
            "subclass_of": (
                "subclass_namespace",
                "subclass_name",
                "superclass_namespace",
                "superclass_name",
            ),
        }
        missing = [
            name for name in required[self.axiom_type] if not getattr(self, name)
        ]
        if missing:
            raise ValueError("Missing required fields: " + ", ".join(missing))
        return self


class SaveOntologyRequest(BaseModel):
    path: str


class OperationResponse(BaseModel):
    success: bool
    message: str


def _change_data_assertion(ont, subject, prop, literal, remove=False):
    if literal.lang:
        triple = (
            URIRef(subject.str),
            URIRef(prop.str),
            RDFLiteral(literal.value, lang=literal.lang),
        )
        with ont._onto:
            graph = ont._world.as_rdflib_graph()
            if remove:
                graph.remove(triple)
            else:
                ont.add_axiom(OWLDeclarationAxiom(subject))
                ont.add_axiom(OWLDeclarationAxiom(prop))
                graph.add(triple)
        ont.is_modified = True
        return
    try:
        datatype = (
            OWLDatatype(IRI.create(literal.datatype)) if literal.datatype else None
        )
        value = OWLLiteral(literal.value, datatype)
    except (ValueError, TypeError, AssertionError) as exc:
        raise HTTPException(
            status_code=400, detail="Invalid literal value or datatype."
        ) from exc
    axiom = OWLDataPropertyAssertionAxiom(subject, prop, value)
    if remove:
        ont.remove_axiom(axiom)
    else:
        ont.add_axiom(axiom)


@router.post("/create", response_model=CreateOntologyResponse)
def create_ontology(request: CreateOntologyRequest):
    try:
        normalized_iri = normalize_namespace(request.ontology_iri)
        ont = Ontology(IRI.create(normalized_iri), load=False)

        oid = ONTOLOGIES.add((ont, request.filename))

        return CreateOntologyResponse(
            id=oid, filename=request.filename, ontology_iri=normalized_iri
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create ontology: {e}")


@router.post("/{oid}/class", response_model=OperationResponse)
def add_class(oid: str, request: AddClassRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        namespace = normalize_namespace(request.namespace)
        iri = IRI(namespace, request.class_name)
        owl_class = OWLClass(iri)
        declaration_axiom = OWLDeclarationAxiom(owl_class)
        ont.add_axiom(declaration_axiom)
        return OperationResponse(
            success=True, message=f"Class '{request.class_name}' added successfully."
        )


@router.post("/{oid}/object-property", response_model=OperationResponse)
def add_object_property(oid: str, request: AddPropertyRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        namespace = normalize_namespace(request.namespace)
        iri = IRI(namespace, request.property_name)
        obj_property = OWLObjectProperty(iri)
        declaration_axiom = OWLDeclarationAxiom(obj_property)
        ont.add_axiom(declaration_axiom)
        return OperationResponse(
            success=True,
            message=f"Object property '{request.property_name}' added successfully.",
        )


@router.post("/{oid}/data-property", response_model=OperationResponse)
def add_data_property(oid: str, request: AddPropertyRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        namespace = normalize_namespace(request.namespace)
        iri = IRI(namespace, request.property_name)
        data_property = OWLDataProperty(iri)
        declaration_axiom = OWLDeclarationAxiom(data_property)
        ont.add_axiom(declaration_axiom)
        return OperationResponse(
            success=True,
            message=f"Data property '{request.property_name}' added successfully.",
        )


@router.post("/{oid}/individual", response_model=OperationResponse)
def add_individual(oid: str, request: AddClassRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        namespace = normalize_namespace(request.namespace)
        iri = IRI(namespace, request.class_name)
        individual = OWLNamedIndividual(iri)
        declaration_axiom = OWLDeclarationAxiom(individual)
        ont.add_axiom(declaration_axiom)
        return OperationResponse(
            success=True,
            message=f"Individual '{request.class_name}' added successfully.",
        )


@router.post("/{oid}/class-assertion", response_model=OperationResponse)
def add_class_assertion(oid: str, request: AddClassAssertionRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        individual = OWLNamedIndividual(IRI.create(request.individual_iri))
        class_namespace = normalize_namespace(request.class_namespace)
        owl_class = OWLClass(IRI(class_namespace, request.class_name))
        assertion_axiom = OWLClassAssertionAxiom(individual, owl_class)
        ont.add_axiom(assertion_axiom)
        return OperationResponse(
            success=True, message="Class assertion added successfully."
        )


@router.post("/{oid}/object-property-assertion", response_model=OperationResponse)
def add_object_property_assertion(oid: str, request: AddObjectPropertyAssertionRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        subject = OWLNamedIndividual(IRI.create(request.subject_iri))
        property_namespace = normalize_namespace(request.property_namespace)
        prop = OWLObjectProperty(IRI(property_namespace, request.property_name))
        obj = OWLNamedIndividual(IRI.create(request.object_iri))
        assertion_axiom = OWLObjectPropertyAssertionAxiom(subject, prop, obj)
        ont.add_axiom(assertion_axiom)
        return OperationResponse(
            success=True, message="Object property assertion added successfully."
        )


@router.post("/{oid}/data-property-assertion", response_model=OperationResponse)
def add_data_property_assertion(oid: str, request: AddDataPropertyAssertionRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        subject = OWLNamedIndividual(IRI.create(request.subject_iri))
        property_namespace = normalize_namespace(request.property_namespace)
        prop = OWLDataProperty(IRI(property_namespace, request.property_name))

        _change_data_assertion(ont, subject, prop, request.literal)
        return OperationResponse(
            success=True, message="Data property assertion added successfully."
        )


@router.post("/{oid}/subclass-of", response_model=OperationResponse)
def add_subclass_of(oid: str, request: AddSubClassOfRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        subclass_namespace = normalize_namespace(request.subclass_namespace)
        superclass_namespace = normalize_namespace(request.superclass_namespace)
        subclass = OWLClass(IRI(subclass_namespace, request.subclass_name))
        superclass = OWLClass(IRI(superclass_namespace, request.superclass_name))
        subclass_axiom = OWLSubClassOfAxiom(subclass, superclass)
        ont.add_axiom(subclass_axiom)
        return OperationResponse(
            success=True, message="Subclass axiom added successfully."
        )


@router.delete("/{oid}/axiom", response_model=OperationResponse)
def remove_axiom(oid: str, request: RemoveAxiomRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
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

            _change_data_assertion(ont, subject, prop, request.literal, remove=True)
            return OperationResponse(
                success=True, message="Axiom removed successfully."
            )

        elif request.axiom_type == "subclass_of":
            axiom = OWLSubClassOfAxiom(
                OWLClass(
                    IRI(
                        normalize_namespace(request.subclass_namespace),
                        request.subclass_name,
                    )
                ),
                OWLClass(
                    IRI(
                        normalize_namespace(request.superclass_namespace),
                        request.superclass_name,
                    )
                ),
            )

        elif request.axiom_type == "declaration":
            entity_iri = IRI.create(request.entity_iri)

            for cls in ont.classes_in_signature():
                if cls.iri == entity_iri:
                    axiom = OWLDeclarationAxiom(cls)
                    break

            if axiom is None:
                for prop in ont.object_properties_in_signature():
                    if prop.iri == entity_iri:
                        axiom = OWLDeclarationAxiom(prop)
                        break

            if axiom is None:
                for prop in ont.data_properties_in_signature():
                    if prop.iri == entity_iri:
                        axiom = OWLDeclarationAxiom(prop)
                        break

            if axiom is None:
                for ind in ont.individuals_in_signature():
                    if ind.iri == entity_iri:
                        axiom = OWLDeclarationAxiom(ind)
                        break

        if axiom is None:
            raise HTTPException(
                status_code=400, detail="Could not construct axiom from request."
            )

        ont.remove_axiom(axiom)
        return OperationResponse(success=True, message="Axiom removed successfully.")


@router.post("/{oid}/save", response_model=OperationResponse)
def save_ontology(oid: str, request: SaveOntologyRequest):
    with ONTOLOGIES.locked(oid) as (ont, _):
        save_iri = IRI.create(request.path)
        ont.save(save_iri)
        return OperationResponse(
            success=True, message=f"Ontology saved to '{request.path}' successfully."
        )
