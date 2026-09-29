import asyncio
import sys
import threading
import types
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from main import app
from routers import generate_ontology, neural_reasoning
from store import NEURAL_ONTOLOGIES, ONTOLOGIES, OntologyNotFound, OntologyStore


@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client
    for store in (NEURAL_ONTOLOGIES, ONTOLOGIES):
        for oid in store.ids():
            store.delete(oid)


@pytest.fixture
def oid(client):
    response = client.post(
        "/modify/create", json={"ontology_iri": "http://example.com/test"}
    )
    assert response.status_code == 200
    return response.json()["id"]


def test_edit_reason_and_delete(client, oid):
    base = f"/modify/{oid}"
    assert (
        client.post(
            base + "/class",
            json={"namespace": "http://example.com/test", "class_name": "Person"},
        ).status_code
        == 200
    )
    assert (
        client.post(
            base + "/class-assertion",
            json={
                "individual_iri": "http://example.com/test#Alice",
                "class_namespace": "http://example.com/test",
                "class_name": "Person",
            },
        ).status_code
        == 200
    )
    response = client.post(
        f"/reasoning/{oid}/instances",
        json={"class_expression": "http://example.com/test#Person"},
    )
    assert response.status_code == 200
    assert response.json()["individuals"] == [
        {"iri": "http://example.com/test#Alice", "name": "Alice"}
    ]
    neural_id = NEURAL_ONTOLOGIES.add((object(), oid))
    assert client.delete(f"/ontology/{oid}").json()["deleted"] == oid
    assert client.get(f"/ontology/{oid}/summary").status_code == 404
    assert neural_id not in NEURAL_ONTOLOGIES.ids()


@pytest.mark.parametrize(
    "literal,expected",
    [
        (
            {"value": "7", "datatype": "http://www.w3.org/2001/XMLSchema#integer"},
            {"value": "7", "lang": None},
        ),
        ({"value": "hello", "lang": "en"}, {"value": "hello", "lang": "en"}),
        ({"value": False}, {"value": "false", "lang": None}),
    ],
)
def test_literal_roundtrip(client, oid, literal, expected):
    payload = {
        "subject_iri": "http://example.com/test#Alice",
        "property_namespace": "http://example.com/test",
        "property_name": "value",
        "literal": literal,
    }
    response = client.post(f"/modify/{oid}/data-property-assertion", json=payload)
    assert response.status_code == 200, response.text
    triples = client.get(f"/ontology/{oid}/triples").json()["triples"]
    objects = [t["o"] for t in triples if t["p"] == "http://example.com/test#value"]
    assert len(objects) == 1
    assert all(objects[0][key] == value for key, value in expected.items())
    response = client.request(
        "DELETE",
        f"/modify/{oid}/axiom",
        json={"axiom_type": "data_property_assertion", **payload},
    )
    assert response.status_code == 200
    assert not [
        t
        for t in client.get(f"/ontology/{oid}/triples").json()["triples"]
        if t["p"] == "http://example.com/test#value"
    ]


@pytest.mark.parametrize("extension", ["ttl", "n3", "nt", "owl", "rdf", "xml"])
def test_upload_formats(client, extension):
    from rdflib import Graph

    data = "<http://example.com/test#Person> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/2002/07/owl#Class> ."
    if extension in ("owl", "rdf", "xml"):
        data = Graph().parse(data=data, format="nt").serialize(format="xml")
    response = client.post(
        "/ontology/upload", files={"file": (f"test.{extension}", data)}
    )
    assert response.status_code == 200, response.text
    assert response.json()["summary"]["classes"] == 1


def test_invalid_requests(client, oid):
    assert client.get(f"/ontology/{oid}/triples?offset=-1").status_code == 422
    assert client.get(f"/ontology/{oid}/triples?limit=-1").status_code == 422
    assert client.get(f"/ontology/{oid}/triples?limit=0").json()["triples"] == []
    assert (
        client.request(
            "DELETE", f"/modify/{oid}/axiom", json={"axiom_type": "class_assertion"}
        ).status_code
        == 422
    )
    assert (
        client.post("/neural-reasoning/create", json={"ontology_id": oid}).status_code
        == 422
    )
    assert (
        client.post(
            "/modify/create",
            json={"ontology_iri": "http://example.com/test", "filename": None},
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/reasoning/{oid}/instances", json={"class_expression": " "}
        ).status_code
        == 400
    )


def test_store_delete_waits_for_active_operation():
    store = OntologyStore()
    oid = store.add("ontology")
    started = threading.Event()

    def delete():
        started.set()
        store.delete(oid)

    with ThreadPoolExecutor(max_workers=1) as executor:
        with store.locked(oid) as value:
            task = executor.submit(delete)
            assert started.wait(2)
            assert value == "ontology"
            assert not task.done()
        task.result(timeout=2)
    with pytest.raises(OntologyNotFound):
        with store.locked(oid):
            pass


def test_neural_training_does_not_block_status(client, oid, monkeypatch):
    started = threading.Event()
    release = threading.Event()

    def train(**kwargs):
        started.set()
        assert release.wait(5)
        return object()

    monkeypatch.setattr(neural_reasoning, "NeuralOntology", train)
    with ThreadPoolExecutor(max_workers=1) as executor:
        task = executor.submit(
            client.post,
            "/neural-reasoning/create",
            json={"ontology_id": oid, "retrain": True},
        )
        try:
            assert started.wait(5)
            response = client.get("/ontology")
            assert response.status_code == 200
            assert oid in response.json()["ids"]
        finally:
            release.set()
        response = task.result(timeout=5)
    job = client.get(
        "/neural-reasoning/create/status/" + response.json()["job_id"]
    ).json()
    assert job["status"] == "completed"


def test_failed_generation_cleans_temporary_file(monkeypatch, tmp_path):
    output = []

    class Generator:
        def __init__(self, **kwargs):
            pass

        def generate_ontology(self, **kwargs):
            from pathlib import Path

            path = Path(kwargs["save_path"])
            path.write_text("partial output")
            output.append(path)
            raise ValueError("generation failed")

    monkeypatch.setitem(
        sys.modules, "generation", types.SimpleNamespace(ProviderGenerator=Generator)
    )
    job_id = "failure-test"
    generate_ontology.GENERATION_JOBS[job_id] = {}
    request = generate_ontology.GenerateOntologyRequest(text="test", api_key="test")
    asyncio.run(generate_ontology._generate_ontology_background(job_id, request))
    assert generate_ontology.GENERATION_JOBS[job_id]["status"] == "failed"
    assert output and not output[0].exists()


def test_embedding_archive_upload(client, oid, monkeypatch):
    import io
    import zipfile
    from pathlib import Path

    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as archive:
        archive.writestr("model/configuration.json", "{}")
        archive.writestr("model/model.pt", "model data")
    model_paths = []

    def load(**kwargs):
        path = Path(kwargs["path_neural_embedding"])
        assert (path / "configuration.json").exists()
        assert (path / "model.pt").exists()
        model_paths.append(path)
        return object()

    monkeypatch.setattr(neural_reasoning, "NeuralOntology", load)
    response = client.post(
        f"/neural-reasoning/upload-embedding?ontology_id={oid}",
        files={"embedding_file": ("model.zip", data.getvalue())},
    )
    assert response.status_code == 200, response.text
    assert response.json()["neural_ontology_id"] in NEURAL_ONTOLOGIES.ids()
    assert not model_paths[0].exists()


def test_embedding_archive_rejects_path_traversal(client, oid):
    import io
    import zipfile

    data = io.BytesIO()
    with zipfile.ZipFile(data, "w") as archive:
        archive.writestr("../configuration.json", "{}")
    response = client.post(
        f"/neural-reasoning/upload-embedding?ontology_id={oid}",
        files={"embedding_file": ("model.zip", data.getvalue())},
    )
    assert response.status_code == 400
    assert "invalid path" in response.json()["detail"]


@pytest.mark.parametrize(
    "route,method,key",
    [
        ("super-classes", "super_classes", "super_classes"),
        ("sub-classes", "sub_classes", "sub_classes"),
    ],
)
def test_anonymous_hierarchy_expressions(client, oid, monkeypatch, route, method, key):
    from contextlib import contextmanager
    from owlapy.class_expression import OWLClass, OWLObjectSomeValuesFrom
    from owlapy.owl_property import OWLObjectProperty
    from routers import reasoning

    expression = OWLObjectSomeValuesFrom(
        OWLObjectProperty("http://example.com/test#hasChild"),
        OWLClass("http://example.com/test#Person"),
    )

    @contextmanager
    def reasoner(*args):
        yield types.SimpleNamespace(**{method: lambda *a, **kw: [expression]})

    monkeypatch.setattr(reasoning, "_build_reasoner", reasoner)
    response = client.post(
        f"/reasoning/{oid}/{route}",
        json={"class_iri": "http://example.com/test#Person", "only_named": False},
    )
    assert response.status_code == 200
    assert response.json()[key][0]["iri"] is None
    assert "hasChild" in response.json()[key][0]["name"]
