from enum import Enum
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, model_validator, Field
from typing import Optional, List, Literal
import asyncio
import tempfile
import os
import uuid
import io
import zipfile
from pathlib import Path, PurePosixPath

from owlapy.owl_reasoner import EBR
from owlapy.owl_ontology import NeuralOntology
from owlapy.iri import IRI

from store import ONTOLOGIES, NEURAL_ONTOLOGIES, OntologyNotFound
from utils import build_class_expression

router = APIRouter(prefix="/neural-reasoning", tags=["neural-reasoning"])


class IndividualItem(BaseModel):
    iri: str
    name: str


class CreateNeuralOntologyRequest(BaseModel):
    ontology_id: str  # Reference to an existing ontology
    path_neural_embedding: Optional[str] = None  # Path to pre-trained embedding
    retrain: bool = False  # Whether to retrain the model

    model: Literal["Keci", "DistMult", "ComplEx", "TransE"] = "Keci"
    num_epochs: int = Field(default=100, ge=1, le=2000)
    embedding_dim: int = Field(default=128, ge=16, le=1024, multiple_of=8)
    batch_size: int = Field(default=64, ge=2, le=4096)

    @model_validator(mode="after")
    def validate_source(self):
        if not self.path_neural_embedding and not self.retrain:
            raise ValueError("Either provide path_neural_embedding or set retrain=True")
        return self


class CreateNeuralOntologyResponse(BaseModel):
    neural_ontology_id: str
    ontology_id: str
    message: str


class CreateNeuralOntologyJobResponse(BaseModel):
    job_id: str
    status: str
    message: str


class NeuralInstancesRequest(BaseModel):
    class_expression: str  # Class expression in the specified syntax
    syntax: Literal["iri", "dl", "manchester"] = (
        "iri"  # Syntax type for parsing the expression
    )


class NeuralInstancesResponse(BaseModel):
    neural_ontology_id: str
    class_expression: str
    individuals: List[IndividualItem]


class UploadEmbeddingResponse(BaseModel):
    neural_ontology_id: str
    message: str


class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


# Add job store
NEURAL_ONTOLOGY_JOBS = {}


@router.post("/create", response_model=CreateNeuralOntologyJobResponse)
def create_neural_ontology(
    request: CreateNeuralOntologyRequest, background_tasks: BackgroundTasks
):
    """Start neural ontology creation as background job"""
    with ONTOLOGIES.locked(request.ontology_id):
        pass
    job_id = str(uuid.uuid4())

    # Initialize job status
    NEURAL_ONTOLOGY_JOBS[job_id] = {
        "status": JobStatus.PENDING,
        "neural_ontology_id": None,
        "message": None,
        "error": None,
    }

    # Start background task
    background_tasks.add_task(_create_neural_ontology_background, job_id, request)

    return {
        "job_id": job_id,
        "status": JobStatus.PENDING,
        "message": "Neural ontology creation started",
    }


def _create_neural_ontology_background(
    job_id: str, request: CreateNeuralOntologyRequest
):
    """Background task to create neural ontology"""
    NEURAL_ONTOLOGY_JOBS[job_id]["status"] = JobStatus.PROCESSING

    try:
        if request.path_neural_embedding:
            if not os.path.exists(request.path_neural_embedding):
                raise ValueError(
                    f"Embedding path not found: {request.path_neural_embedding}"
                )
            neural_ont = NeuralOntology(
                path_neural_embedding=request.path_neural_embedding
            )
            message = f"Neural ontology created from embedding: {request.path_neural_embedding}"
        elif request.retrain:
            with tempfile.TemporaryDirectory(
                prefix="ontosource-training-"
            ) as directory:
                tmp_path = os.path.join(directory, "ontology.owl")
                with ONTOLOGIES.locked(request.ontology_id) as (ont, _):
                    ont.save(IRI.create(tmp_path))
                neural_ont = NeuralOntology(
                    path_neural_embedding=tmp_path,
                    train_if_not_exists=True,
                    device="cpu",
                    training_params={
                        "model": request.model,
                        "num_epochs": request.num_epochs,
                        "embedding_dim": request.embedding_dim,
                        "batch_size": request.batch_size,
                        "trainer": "torchCPUTrainer",
                        "scoring_technique": "KvsAll",
                        "eval_model": None,
                        "num_core": 0,
                    },
                )
                message = f"Neural ontology trained with {request.model}."
        else:
            raise ValueError("Either provide path_neural_embedding or set retrain=True")

        with ONTOLOGIES.locked(request.ontology_id):
            neural_oid = NEURAL_ONTOLOGIES.add((neural_ont, request.ontology_id))

        NEURAL_ONTOLOGY_JOBS[job_id] = {
            "status": JobStatus.COMPLETED,
            "neural_ontology_id": neural_oid,
            "ontology_id": request.ontology_id,
            "message": message,
            "error": None,
        }
    except Exception as e:
        NEURAL_ONTOLOGY_JOBS[job_id] = {
            "status": JobStatus.FAILED,
            "neural_ontology_id": None,
            "message": None,
            "error": str(e),
        }


@router.get("/create/status/{job_id}")
async def get_job_status(job_id: str):
    """Check status of neural ontology creation job"""
    job = NEURAL_ONTOLOGY_JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/upload-embedding", response_model=UploadEmbeddingResponse)
async def upload_embedding(ontology_id: str, embedding_file: UploadFile = File(...)):
    embedding_data = await embedding_file.read()
    if not embedding_data:
        raise HTTPException(status_code=400, detail="Empty embedding file.")

    def create_from_upload():
        with ONTOLOGIES.locked(ontology_id):
            pass
        try:
            with tempfile.TemporaryDirectory() as directory:
                with zipfile.ZipFile(io.BytesIO(embedding_data)) as archive:
                    for member in archive.infolist():
                        path = PurePosixPath(member.filename.replace("\\", "/"))
                        if path.is_absolute() or ".." in path.parts:
                            raise ValueError(
                                "Embedding archive contains an invalid path."
                            )
                    archive.extractall(directory)
                configs = list(Path(directory).rglob("configuration.json"))
                if len(configs) != 1:
                    raise ValueError(
                        "Upload a ZIP containing one complete pretrained model with configuration.json."
                    )
                neural_ont = NeuralOntology(
                    path_neural_embedding=str(configs[0].parent)
                )
                with ONTOLOGIES.locked(ontology_id):
                    neural_oid = NEURAL_ONTOLOGIES.add((neural_ont, ontology_id))
            return UploadEmbeddingResponse(
                neural_ontology_id=neural_oid,
                message="Neural ontology created from uploaded embedding.",
            )
        except OntologyNotFound:
            raise
        except zipfile.BadZipFile as exc:
            raise HTTPException(
                status_code=400,
                detail="Upload a ZIP containing the complete pretrained model.",
            ) from exc
        except Exception as exc:
            raise HTTPException(
                status_code=400, detail=f"Failed to create neural ontology: {exc}"
            ) from exc

    return await asyncio.to_thread(create_from_upload)


@router.post("/{neural_oid}/instances", response_model=NeuralInstancesResponse)
def get_neural_instances(neural_oid: str, request: NeuralInstancesRequest):
    with NEURAL_ONTOLOGIES.locked(neural_oid) as (_, ontology_id):
        pass
    with ONTOLOGIES.locked(ontology_id) as (ont, _):
        with NEURAL_ONTOLOGIES.locked(neural_oid) as (neural_ont, _):
            try:
                expression = build_class_expression(
                    request.class_expression, ont, request.syntax
                )
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
            try:
                reasoner = EBR(ontology=neural_ont)
                individuals = [
                    IndividualItem(
                        iri=ind.str, name=ind.str.split("#")[-1].split("/")[-1]
                    )
                    for ind in reasoner.instances(expression)
                ]
                return NeuralInstancesResponse(
                    neural_ontology_id=neural_oid,
                    class_expression=request.class_expression,
                    individuals=individuals,
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=500, detail=f"Neural reasoning failed: {exc}"
                ) from exc


@router.delete("/{neural_oid}")
def delete_neural_ontology(neural_oid: str):
    NEURAL_ONTOLOGIES.delete(neural_oid)
    return {"ok": True, "deleted": neural_oid}


@router.get("")
def list_neural_ontologies():
    ontologies = []
    for neural_oid in NEURAL_ONTOLOGIES.ids():
        try:
            with NEURAL_ONTOLOGIES.locked(neural_oid) as (_, ontology_id):
                ontologies.append(
                    {"neural_ontology_id": neural_oid, "ontology_id": ontology_id}
                )
        except OntologyNotFound:
            continue
    return {"neural_ontologies": ontologies}


class LinkPredictionRequest(BaseModel):
    head: Optional[str] = None
    relation: Optional[str] = None
    tail: Optional[str] = None
    top_k: int = Field(default=10, ge=1, le=100)

    @model_validator(mode="after")
    def validate_query(self):
        if sum(bool(value) for value in (self.head, self.relation, self.tail)) != 2:
            raise ValueError(
                "Provide exactly two of head, relation and tail; leave the prediction target empty."
            )
        return self


@router.post("/{neural_oid}/predict-links")
def predict_links(neural_oid: str, request: LinkPredictionRequest):
    with NEURAL_ONTOLOGIES.locked(neural_oid) as (neural_ont, _):
        model = neural_ont.model
        for value, vocabulary in (
            (request.head, model.entity_to_idx),
            (request.tail, model.entity_to_idx),
            (request.relation, model.relation_to_idx),
        ):
            if value and value not in vocabulary:
                raise HTTPException(
                    status_code=400,
                    detail=f"The trained model does not contain {value}",
                )
        try:
            vocabulary = (
                model.relation_to_idx if not request.relation else model.entity_to_idx
            )
            rows = model.predict_topk(
                h=[request.head] if request.head else None,
                r=[request.relation] if request.relation else None,
                t=[request.tail] if request.tail else None,
                topk=min(request.top_k, len(vocabulary)),
            )
            return {
                "predictions": [
                    {"iri": iri, "score": float(score)}
                    for row in rows
                    for iri, score in row
                ]
            }
        except Exception as exc:
            raise HTTPException(
                status_code=500, detail=f"Link prediction failed: {exc}"
            ) from exc
