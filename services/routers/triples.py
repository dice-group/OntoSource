import re
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, model_validator
from rdflib import BNode, Literal as RDFLiteral, URIRef

from store import ONTOLOGIES

router = APIRouter(prefix="/modify", tags=["modify"])


class LiteralTerm(BaseModel):
    type: Literal["literal"] = "literal"
    value: str
    datatype: str | None = None
    lang: str | None = None

    @model_validator(mode="after")
    def validate_language(self):
        if self.datatype and self.lang:
            raise ValueError("Choose a datatype or a language, not both.")
        if self.lang and not re.fullmatch(r"[a-zA-Z]+(?:-[a-zA-Z0-9]+)*", self.lang):
            raise ValueError("Enter a valid language tag, such as en or de-DE.")
        return self


class TripleRequest(BaseModel):
    s: str
    p: str
    o: str | LiteralTerm


class ReplaceTripleRequest(BaseModel):
    before: TripleRequest
    after: TripleRequest


def _resource(value: str, blank_nodes: bool = True):
    if blank_nodes and value.startswith("_:") and len(value) > 2:
        return BNode(value[2:])
    if not re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:.+$", value) or re.search(
        r'[\s<>"{}|^`\\]', value
    ):
        raise HTTPException(422, "Use an absolute IRI for resources and predicates.")
    return URIRef(value)


def _triple(request: TripleRequest):
    if isinstance(request.o, str):
        obj = _resource(request.o)
    else:
        obj = RDFLiteral(
            request.o.value,
            datatype=_resource(request.o.datatype, False) if request.o.datatype else None,
            lang=request.o.lang or None,
            normalize=False,
        )
    return _resource(request.s), _resource(request.p, False), obj


def _validate_new(graph, triple):
    for term in triple:
        if isinstance(term, BNode) and not (
            any(graph.triples((term, None, None)))
            or any(graph.triples((None, None, term)))
        ):
            raise HTTPException(422, "Blank nodes must already exist in this ontology.")
    if isinstance(triple[2], RDFLiteral) and triple[2].ill_typed:
        raise HTTPException(422, "The literal value does not match its datatype.")


def _change(oid, before=None, after=None):
    old = _triple(before) if before else None
    new = _triple(after) if after else None
    with ONTOLOGIES.locked(oid) as (ont, _):
        graph = ont._world.as_rdflib_graph()
        if old is not None and old not in graph:
            raise HTTPException(409, "This triple no longer exists. Refresh the graph and select it again.")
        if new is not None:
            _validate_new(graph, new)
        if old == new:
            return {"success": True}
        already_present = new in graph if new is not None else False
        with ont._onto:
            try:
                if old is not None:
                    graph.remove(old)
                if new is not None:
                    graph.add(new)
            except Exception as exc:
                if new is not None and not already_present:
                    graph.remove(new)
                if old is not None:
                    graph.add(old)
                raise HTTPException(422, "This triple could not be stored. Check the RDF terms and datatype.") from exc
        ont.is_modified = True
    return {"success": True}


@router.post("/{oid}/triples")
def add_triple(oid: str, request: TripleRequest):
    return _change(oid, after=request)


@router.patch("/{oid}/triples")
def replace_triple(oid: str, request: ReplaceTripleRequest):
    return _change(oid, before=request.before, after=request.after)


@router.delete("/{oid}/triples")
def remove_triple(oid: str, request: TripleRequest):
    return _change(oid, before=request)
