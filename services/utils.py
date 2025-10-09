"""Shared utility functions for the OntoSource services."""

from typing import Literal, Union
from owlapy.class_expression import OWLClass, OWLClassExpression
from owlapy.iri import IRI
from owlapy import dl_to_owl_expression, manchester_to_owl_expression
from owlapy.owl_ontology import Ontology, NeuralOntology


def build_class_expression(
    expression_str: str, 
    ontology: Union[Ontology, NeuralOntology],
    syntax: Literal["iri", "dl", "manchester"] = "iri"
) -> OWLClassExpression:
    """
    Build an OWL class expression from a string representation.
    
    Supports three syntax types:
    - "iri": Simple class IRI (e.g., "http://example.com/family#Person")
    - "dl": Description Logic syntax (e.g., "∃ hasChild.male")
    - "manchester": Manchester syntax (e.g., "female and (hasChild max 2 person)")
    
    Args:
        expression_str: The class expression as a string
        ontology: The OWL ontology for namespace resolution. 
                  For neural ontologies, pass the underlying regular Ontology
                  as NeuralOntology does not preserve namespace information.
        syntax: The syntax type to use for parsing
        
    Returns:
        An OWLClassExpression object
        
    Raises:
        ValueError: If the expression cannot be parsed
    """
    try:
        if syntax == "iri":
            # Simple IRI - create a named class
            class_iri = IRI.create(expression_str)
            return OWLClass(class_iri)
        elif syntax == "dl":
            # Description Logic syntax
            # Get the namespace from the ontology IRI
            try:
                namespace = ontology.get_ontology_id().get_ontology_iri().as_str()
                # Add # separator if not already present
                if not namespace.endswith("#") and not namespace.endswith("/"):
                    namespace += "#"
            except:
                # Fallback to a default namespace if ontology IRI is not available
                namespace = "http://www.example.org/ontology#"
            return dl_to_owl_expression(expression_str, namespace)
        elif syntax == "manchester":
            # Manchester syntax
            # Get the namespace from the ontology IRI
            try:
                namespace = ontology.get_ontology_id().get_ontology_iri().as_str()
                # Add # separator if not already present
                if not namespace.endswith("#") and not namespace.endswith("/"):
                    namespace += "#"
            except:
                # Fallback to a default namespace if ontology IRI is not available
                namespace = "http://www.example.org/ontology#"
            return manchester_to_owl_expression(expression_str, namespace)
        else:
            raise ValueError(f"Unknown syntax type: {syntax}")
    except ValueError:
        raise
    except Exception as e:
        raise ValueError(f"Failed to parse class expression '{expression_str}' with syntax '{syntax}': {str(e)}")

