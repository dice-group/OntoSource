import pytest
from fastapi.testclient import TestClient
from rdflib import Graph, URIRef, Literal, RDF, RDFS, OWL

from main import app

NS = "http://example.com/visual#"


@pytest.fixture
def ontology():
    with TestClient(app) as client:
        oid = client.post("/modify/create", json={"ontology_iri": NS}).json()["id"]
        try:
            yield client, oid
        finally:
            client.delete(f"/ontology/{oid}")


def test_triple_crud_updates_exports_and_reasoning(ontology):
    client, oid = ontology
    endpoint = f"/modify/{oid}/triples"
    for cls in ["Person", "Parent"]:
        response = client.post(endpoint, json={"s": NS + cls, "p": str(RDF.type), "o": str(OWL.Class)})
        assert response.status_code == 200, response.text
    original = {"s": NS + "Parent", "p": str(RDFS.subClassOf), "o": NS + "Person"}
    assert client.post(endpoint, json=original).status_code == 200
    for engine in ["structural", "rdflib"]:
        response = client.post(f"/reasoning/{oid}/super-classes", json={"class_iri": NS + "Parent", "reasoner_type": engine})
        assert NS + "Person" in {item["iri"] for item in response.json()["super_classes"]}
    replacement = {"s": NS + "Person", "p": str(RDFS.subClassOf), "o": NS + "Parent"}
    assert client.patch(endpoint, json={"before": original, "after": replacement}).status_code == 200
    graph = Graph().parse(data=client.get(f"/ontology/{oid}/download?format=turtle").content, format="turtle")
    assert (URIRef(original["s"]), RDFS.subClassOf, URIRef(original["o"])) not in graph
    assert (URIRef(replacement["s"]), RDFS.subClassOf, URIRef(replacement["o"])) in graph
    for engine in ["structural", "rdflib"]:
        response = client.post(f"/reasoning/{oid}/super-classes", json={"class_iri": NS + "Person", "reasoner_type": engine})
        assert NS + "Parent" in {item["iri"] for item in response.json()["super_classes"]}
    assert client.request("DELETE", endpoint, json=replacement).status_code == 200
    assert client.request("DELETE", endpoint, json=replacement).status_code == 409


@pytest.mark.parametrize("literal", [
    {"type": "literal", "value": "Grüße", "lang": "de"},
    {"type": "literal", "value": "42", "datatype": "http://www.w3.org/2001/XMLSchema#integer"},
    {"type": "literal", "value": ""},
])
def test_literal_terms_roundtrip(ontology, literal):
    client, oid = ontology
    triple = {"s": NS + "Ann", "p": str(RDFS.label), "o": literal}
    response = client.post(f"/modify/{oid}/triples", json=triple)
    assert response.status_code == 200, response.text
    graph = Graph().parse(data=client.get(f"/ontology/{oid}/download?format=turtle").content, format="turtle")
    assert (URIRef(triple["s"]), RDFS.label, Literal(literal["value"], lang=literal.get("lang"), datatype=literal.get("datatype"))) in graph
    actual = next(t for t in client.get(f"/ontology/{oid}/triples").json()["triples"] if t["s"] == triple["s"])
    assert client.request("DELETE", f"/modify/{oid}/triples", json=actual).status_code == 200


@pytest.mark.parametrize("invalid", [
    {"s": "not an IRI", "p": str(RDFS.label), "o": NS + "Parent"},
    {"s": NS + "Ann", "p": "_:predicate", "o": NS + "Parent"},
    {"s": NS + "Ann", "p": str(RDFS.label), "o": {"value": "42", "lang": "en", "datatype": "urn:type"}},
    {"s": NS + "Ann", "p": str(RDFS.label), "o": {"value": "oops", "datatype": "http://www.w3.org/2001/XMLSchema#integer"}},
    {"s": "_:missing", "p": str(RDFS.label), "o": NS + "Parent"},
])
def test_invalid_replacement_preserves_original(ontology, invalid):
    client, oid = ontology
    endpoint = f"/modify/{oid}/triples"
    original = {"s": NS + "Ann", "p": str(RDFS.label), "o": {"value": "Original"}}
    assert client.post(endpoint, json=original).status_code == 200
    assert client.patch(endpoint, json={"before": original, "after": invalid}).status_code == 422
    assert client.request("DELETE", endpoint, json=original).status_code == 200


def test_blank_nodes_roundtrip():
    content = '@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> . <http://example.com/a> rdfs:seeAlso [ rdfs:label "Blank" ] .'
    with TestClient(app) as client:
        uploaded = client.post("/ontology/upload", files={"file": ("blank.ttl", content.encode())})
        assert uploaded.status_code == 200, uploaded.text
        oid = uploaded.json()["id"]
        try:
            triples = client.get(f"/ontology/{oid}/triples").json()["triples"]
            original = next(t for t in triples if t["s"].startswith("_:"))
            replacement = {**original, "o": {"type": "literal", "value": "Updated"}}
            assert client.patch(f"/modify/{oid}/triples", json={"before": original, "after": replacement}).status_code == 200
            assert client.request("DELETE", f"/modify/{oid}/triples", json=replacement).status_code == 200
        finally:
            client.delete(f"/ontology/{oid}")
