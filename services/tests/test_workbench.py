from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from rdflib import Graph

from main import app
from store import ONTOLOGIES, NEURAL_ONTOLOGIES
from routers.generate_ontology import GenerateOntologyRequest, provider_connection


@pytest.fixture
def family():
    with TestClient(app) as client:
        response = client.post(
            "/ontology/upload",
            files={
                "file": (
                    "family.owl",
                    (Path(__file__).parents[2] / "family.owl").read_bytes(),
                )
            },
        )
        assert response.status_code == 200, response.text
        oid = response.json()["id"]
        try:
            yield client, oid
        finally:
            client.delete(f"/ontology/{oid}")


def test_rdflib_hierarchy_types_and_expression(family):
    client, oid = family
    base = f"/reasoning/{oid}"
    namespace = "http://www.benchmark.org/family#"
    response = client.post(
        base + "/instances",
        json={"class_expression": namespace + "Person", "reasoner_type": "rdflib"},
    )
    assert response.status_code == 200, response.text
    assert len(response.json()["individuals"]) == 202
    person = response.json()["individuals"][0]["iri"]
    response = client.post(
        base + "/types", json={"individual_iri": person, "reasoner_type": "rdflib"}
    )
    assert response.status_code == 200, response.text
    assert namespace + "Person" in {item["iri"] for item in response.json()["types"]}
    response = client.post(
        base + "/sub-classes",
        json={"class_iri": namespace + "Person", "reasoner_type": "rdflib"},
    )
    assert response.status_code == 200, response.text
    assert response.json()["sub_classes"]
    response = client.post(
        base + "/super-classes",
        json={"class_iri": namespace + "Male", "reasoner_type": "rdflib"},
    )
    assert response.status_code == 200, response.text
    response = client.post(
        base + "/expression",
        json={"class_expression": namespace + "Person", "syntax": "iri"},
    )
    assert response.status_code == 200, response.text
    assert "SELECT" in response.json()["sparql"]
    assert response.json()["manchester"] == "Person"
    assert (
        client.post(
            base + "/expression",
            json={"class_expression": "invalid ???", "syntax": "manchester"},
        ).status_code
        == 400
    )


@pytest.mark.parametrize("format", ["xml", "turtle", "nt"])
def test_download_preserves_edits(family, format):
    client, oid = family
    client.post(
        f"/modify/{oid}/class",
        json={"namespace": "http://example.com/", "class_name": "Added"},
    )
    response = client.get(f"/ontology/{oid}/download", params={"format": format})
    assert response.status_code == 200, response.text
    graph = Graph().parse(data=response.content, format=format)
    assert any(
        str(subject) == "http://example.com/Added" for subject in graph.subjects()
    )
    assert len(graph) >= 2033
    assert "attachment" in response.headers["content-disposition"]
    assert client.get(f"/ontology/{oid}/download?format=invalid").status_code == 422


def test_consistency_with_real_hermit(family):
    client, oid = family
    response = client.post(f"/reasoning/{oid}/consistency", json={"timeout": 30})
    assert response.status_code == 200, response.text
    assert response.json()["consistent"] is True
    from owlapy.class_expression import OWLNothing
    from owlapy.owl_axiom import OWLClassAssertionAxiom
    from owlapy.owl_individual import OWLNamedIndividual

    with ONTOLOGIES.locked(oid) as (ont, _):
        ont.add_axiom(
            OWLClassAssertionAxiom(
                OWLNamedIndividual("http://example.com/impossible"), OWLNothing
            )
        )
    response = client.post(f"/reasoning/{oid}/consistency", json={"timeout": 30})
    assert response.status_code == 200, response.text
    assert response.json()["consistent"] is False


@pytest.mark.parametrize(
    "protocol,base,model,expected_model,expected_base",
    [
        (
            "openai",
            "https://example.com/v1",
            "vendor/model",
            "openai/vendor/model",
            "https://example.com/v1",
        ),
        (
            "anthropic",
            "https://api.anthropic.com/v1",
            "claude-custom",
            "anthropic/claude-custom",
            "https://api.anthropic.com",
        ),
        (
            "gemini",
            "https://generativelanguage.googleapis.com/v1beta",
            "gemini-custom",
            "gemini/gemini-custom",
            "https://generativelanguage.googleapis.com",
        ),
        (
            "ollama",
            "http://localhost:11434/v1",
            "local:latest",
            "ollama_chat/local:latest",
            "http://localhost:11434",
        ),
    ],
)
def test_provider_routing(protocol, base, model, expected_model, expected_base):
    request = GenerateOntologyRequest(
        text="test", model_name=model, api_base=base, api_protocol=protocol
    )
    assert provider_connection(request) == (expected_model, expected_base)


@pytest.mark.parametrize("model", ["DistMult", "Keci", "ComplEx", "TransE"])
def test_real_dice_training_and_predictions(family, model):
    client, oid = family
    response = client.post(
        "/neural-reasoning/create",
        json={
            "ontology_id": oid,
            "retrain": True,
            "model": model,
            "num_epochs": 1,
            "embedding_dim": 16,
            "batch_size": 64,
        },
    )
    assert response.status_code == 200, response.text
    status = client.get(
        "/neural-reasoning/create/status/" + response.json()["job_id"]
    ).json()
    assert status["status"] == "completed", status
    neural_id = status["neural_ontology_id"]
    with NEURAL_ONTOLOGIES.locked(neural_id) as (ont, _):
        head = next(iter(ont.model.entity_to_idx))
        relation = next(iter(ont.model.relation_to_idx))
    response = client.post(
        f"/neural-reasoning/{neural_id}/predict-links",
        json={"head": head, "relation": relation, "top_k": 3},
    )
    assert response.status_code == 200, response.text
    predictions = response.json()["predictions"]
    assert len(predictions) == 3
    assert predictions == sorted(
        predictions, key=lambda item: item["score"], reverse=True
    )
    assert all(0 <= item["score"] <= 1 for item in predictions)
    assert (
        client.post(
            f"/neural-reasoning/{neural_id}/predict-links", json={"head": head}
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/neural-reasoning/{neural_id}/predict-links",
            json={"head": "missing", "relation": relation},
        ).status_code
        == 400
    )
    response = client.post(
        f"/neural-reasoning/{neural_id}/instances",
        json={"class_expression": "http://www.benchmark.org/family#Person"},
    )
    assert response.status_code == 200, response.text


def test_provider_generation_is_isolated_across_threads(monkeypatch):
    import dspy
    from concurrent.futures import ThreadPoolExecutor
    from generation import ProviderGenerator
    from owlapy.agen_kg.graph_extracting_models import DomainGraphExtractor

    def extract(self, **kwargs):
        return dspy.settings.lm.model

    monkeypatch.setattr(DomainGraphExtractor, "generate_ontology", extract)
    before = dspy.settings.lm

    def run(model):
        generator = ProviderGenerator(
            model=model,
            api_key="test",
            api_base="http://localhost",
            temperature=0.1,
            seed=42,
            cache=False,
            enable_logging=False,
            max_tokens=4000,
        )
        return generator.generate_ontology(text="test", ontology_type="domain")

    models = [
        "openai/custom",
        "anthropic/custom",
        "gemini/custom",
        "ollama_chat/custom",
    ]
    with ThreadPoolExecutor(max_workers=4) as pool:
        assert list(pool.map(run, models)) == models
    assert dspy.settings.lm is before


def test_remove_subclass(family):
    client, oid = family
    payload = {
        "subclass_namespace": "http://example.com/",
        "subclass_name": "Child",
        "superclass_namespace": "http://example.com/",
        "superclass_name": "Parent",
    }
    assert client.post(f"/modify/{oid}/subclass-of", json=payload).status_code == 200
    query = {"class_iri": "http://example.com/Child", "reasoner_type": "rdflib"}
    before = client.post(f"/reasoning/{oid}/super-classes", json=query).json()[
        "super_classes"
    ]
    assert any(item["iri"] == "http://example.com/Parent" for item in before)
    assert (
        client.request(
            "DELETE",
            f"/modify/{oid}/axiom",
            json={"axiom_type": "subclass_of", **payload},
        ).status_code
        == 200
    )
    after = client.post(f"/reasoning/{oid}/super-classes", json=query).json()[
        "super_classes"
    ]
    assert not any(item["iri"] == "http://example.com/Parent" for item in after)


@pytest.mark.parametrize(
    "kind,field",
    [
        ("class", "class_name"),
        ("individual", "class_name"),
        ("object-property", "property_name"),
        ("data-property", "property_name"),
    ],
)
def test_remove_declaration(family, kind, field):
    client, oid = family
    assert (
        client.post(
            f"/modify/{oid}/{kind}",
            json={"namespace": "http://example.com/", field: "RemoveMe"},
        ).status_code
        == 200
    )
    response = client.request(
        "DELETE",
        f"/modify/{oid}/axiom",
        json={"axiom_type": "declaration", "entity_iri": "http://example.com/RemoveMe"},
    )
    assert response.status_code == 200, response.text
    graph = Graph().parse(
        data=client.get(f"/ontology/{oid}/download").content, format="xml"
    )
    from rdflib import URIRef

    assert not list(graph.triples((URIRef("http://example.com/RemoveMe"), None, None)))


def test_provider_preserves_vendor_prefix_in_model_id():
    request = GenerateOntologyRequest(
        text="test",
        model_name="openai/provider-model",
        api_base="https://gateway.example/v1",
        api_protocol="openai",
    )
    assert provider_connection(request) == (
        "openai/openai/provider-model",
        "https://gateway.example/v1",
    )
