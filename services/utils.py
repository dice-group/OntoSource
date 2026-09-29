from typing import Literal

from owlapy import dl_to_owl_expression, manchester_to_owl_expression
from owlapy.class_expression import OWLClass, OWLClassExpression
from owlapy.iri import IRI


def normalize_namespace(namespace: str) -> str:
    if namespace and not namespace.endswith(("#", "/", ":")):
        return namespace + "#"
    return namespace


def build_class_expression(
    expression_str: str,
    ontology,
    syntax: Literal["iri", "dl", "manchester"] = "iri",
) -> OWLClassExpression:
    expression_str = expression_str.strip()
    if not expression_str:
        raise ValueError("Class expression must not be empty.")
    try:
        if syntax == "iri":
            return OWLClass(IRI.create(expression_str))
        parsers = {
            "dl": dl_to_owl_expression,
            "manchester": manchester_to_owl_expression,
        }
        if syntax not in parsers:
            raise ValueError(f"Unknown syntax type: {syntax}")
        iri = ontology.get_ontology_id().get_ontology_iri()
        namespace = (
            normalize_namespace(iri.as_str())
            if iri
            else "http://www.example.org/ontology#"
        )
        return parsers[syntax](expression_str, namespace)
    except Exception as exc:
        raise ValueError(
            f"Failed to parse class expression '{expression_str}' with syntax '{syntax}': {exc}"
        ) from exc
