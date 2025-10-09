from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List, Literal
import asyncio
import tempfile
import os
import uuid

from owlapy.owl_reasoner import EBR
from owlapy.owl_ontology import NeuralOntology
from owlapy.class_expression import OWLClass, OWLClassExpression
from owlapy.iri import IRI

from store import ONTOLOGY_STORE, ONTOLOGY_LOCKS
from utils import build_class_expression

router = APIRouter(prefix="/neural-reasoning", tags=["neural-reasoning"])

# Store for neural ontologies (separate from regular ontologies)
NEURAL_ONTOLOGY_STORE = {}
NEURAL_ONTOLOGY_LOCKS = {}


class IndividualItem(BaseModel):
    iri: str
    name: str


class CreateNeuralOntologyRequest(BaseModel):
    ontology_id: str  # Reference to an existing ontology
    path_neural_embedding: Optional[str] = None  # Path to pre-trained embedding
    retrain: bool = False  # Whether to retrain the model


class CreateNeuralOntologyResponse(BaseModel):
    neural_ontology_id: str
    ontology_id: str
    message: str


class NeuralInstancesRequest(BaseModel):
    class_expression: str  # Class expression in the specified syntax
    syntax: Literal["iri", "dl", "manchester"] = "iri"  # Syntax type for parsing the expression


class NeuralInstancesResponse(BaseModel):
    neural_ontology_id: str
    class_expression: str
    individuals: List[IndividualItem]


class UploadEmbeddingResponse(BaseModel):
    neural_ontology_id: str
    message: str


@router.post("/create", response_model=CreateNeuralOntologyResponse)
async def create_neural_ontology(request: CreateNeuralOntologyRequest):
    """
    Create a Neural Ontology for embedding-based reasoning.
    
    Options:
    - Load from existing embedding: provide path_neural_embedding
    - Train new embedding: set retrain=True
    """
    result = ONTOLOGY_STORE.get(request.ontology_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    
    ont, filename = result
    
    def _create_neural_ontology():
        try:
            neural_oid = str(uuid.uuid4())
            
            if request.path_neural_embedding:
                # Load from existing embedding
                if not os.path.exists(request.path_neural_embedding):
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Embedding path not found: {request.path_neural_embedding}"
                    )
                neural_ont = NeuralOntology(path_neural_embedding=request.path_neural_embedding)
                message = f"Neural ontology created from embedding: {request.path_neural_embedding}"
            
            elif request.retrain:
                # Train new embedding
                # First, we need to save the ontology temporarily
                with tempfile.NamedTemporaryFile(delete=False, suffix=".owl") as tmp:
                    tmp_path = tmp.name
                
                try:
                    ont.save(IRI.create(tmp_path))
                    # Training with default parameters
                    neural_ont = NeuralOntology(path_neural_embedding=tmp_path, train_if_not_exists=True)
                    message = "Neural ontology created."
                finally:
                    try:
                        os.unlink(tmp_path)
                    except Exception:
                        pass
            else:
                raise HTTPException(
                    status_code=400, 
                    detail="Either provide path_neural_embedding or set retrain=True"
                )
            
            NEURAL_ONTOLOGY_STORE[neural_oid] = (neural_ont, request.ontology_id)
            NEURAL_ONTOLOGY_LOCKS[neural_oid] = asyncio.Lock()
            
            return CreateNeuralOntologyResponse(
                neural_ontology_id=neural_oid,
                ontology_id=request.ontology_id,
                message=message
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to create neural ontology: {str(e)}")
    
    return await asyncio.to_thread(_create_neural_ontology)


@router.post("/upload-embedding", response_model=UploadEmbeddingResponse)
async def upload_embedding(
    ontology_id: str,
    embedding_file: UploadFile = File(...)
):
    """
    Upload a pre-trained embedding file for a neural ontology.
    This creates a new neural ontology from the uploaded embedding.
    """
    result = ONTOLOGY_STORE.get(ontology_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Ontology ID not found.")
    
    # Save the uploaded embedding to a temporary location
    # In production, you'd save this to a persistent storage
    embedding_data = await embedding_file.read()
    if not embedding_data:
        raise HTTPException(status_code=400, detail="Empty embedding file.")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        embedding_path = os.path.join(tmpdir, "embedding")
        os.makedirs(embedding_path, exist_ok=True)
        
        # Save the file
        file_path = os.path.join(embedding_path, embedding_file.filename or "model.pt")
        with open(file_path, "wb") as f:
            f.write(embedding_data)
        
        def _create_from_upload():
            try:
                neural_oid = str(uuid.uuid4())
                neural_ont = NeuralOntology(path_neural_embedding=embedding_path)
                
                NEURAL_ONTOLOGY_STORE[neural_oid] = (neural_ont, ontology_id)
                NEURAL_ONTOLOGY_LOCKS[neural_oid] = asyncio.Lock()
                
                return UploadEmbeddingResponse(
                    neural_ontology_id=neural_oid,
                    message=f"Neural ontology created from uploaded embedding: {embedding_file.filename}"
                )
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to create neural ontology: {str(e)}")
        
        return await asyncio.to_thread(_create_from_upload)


@router.post("/{neural_oid}/instances", response_model=NeuralInstancesResponse)
async def get_neural_instances(neural_oid: str, request: NeuralInstancesRequest):
    """
    Get instances of a class expression using embedding-based reasoning (EBR).
    
    EBR uses knowledge graph embeddings to approximate reasoning tasks,
    retrieving instances based on a scoring function rather than strict logical deduction.
    
    Class Expression Syntax:
    - "iri": Simple class IRI (e.g., "http://example.com/family#Person")
    - "dl": Description Logic syntax (e.g., "∃ hasChild.male")
    - "manchester": Manchester syntax (e.g., "female and (hasChild max 2 person)")
    """
    result = NEURAL_ONTOLOGY_STORE.get(neural_oid)
    if result is None:
        raise HTTPException(status_code=404, detail="Neural Ontology ID not found.")
    
    neural_ont, ontology_id = result
    
    # Get the underlying regular ontology for namespace resolution
    ontology_result = ONTOLOGY_STORE.get(ontology_id)
    if ontology_result is None:
        raise HTTPException(status_code=404, detail="Underlying Ontology ID not found.")
    
    ont, _ = ontology_result
    lock = NEURAL_ONTOLOGY_LOCKS.setdefault(neural_oid, asyncio.Lock())
    
    async def _get_instances():
        async with lock:
            try:
                # Initialize EBR
                reasoner = EBR(ontology=neural_ont)
                
                # Parse the class expression with support for complex expressions
                # Use the underlying regular ontology for namespace resolution
                try:
                    class_expression = build_class_expression(
                        request.class_expression,
                        ont,  # Use regular ontology for namespace resolution
                        request.syntax
                    )
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=str(e))
                
                print(class_expression)
                # Get instances
                instances = reasoner.instances(class_expression)
                # Convert to response format
                individuals = []
                for ind in instances:
                    iri_str = ind.iri.as_str()
                    name = iri_str.split('#')[-1].split('/')[-1]
                    individuals.append(IndividualItem(iri=iri_str, name=name))
                
                return NeuralInstancesResponse(
                    neural_ontology_id=neural_oid,
                    class_expression=request.class_expression,
                    individuals=individuals
                )
            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Neural reasoning failed: {str(e)}")
    
    return await _get_instances()


@router.delete("/{neural_oid}")
async def delete_neural_ontology(neural_oid: str):
    """Delete a neural ontology."""
    if neural_oid not in NEURAL_ONTOLOGY_STORE:
        raise HTTPException(status_code=404, detail="Neural Ontology ID not found.")
    
    del NEURAL_ONTOLOGY_STORE[neural_oid]
    if neural_oid in NEURAL_ONTOLOGY_LOCKS:
        del NEURAL_ONTOLOGY_LOCKS[neural_oid]
    
    return {"ok": True, "deleted": neural_oid}


@router.get("")
async def list_neural_ontologies():
    """List all neural ontologies."""
    ontologies = []
    for neural_oid, (_, ontology_id) in NEURAL_ONTOLOGY_STORE.items():
        ontologies.append({
            "neural_ontology_id": neural_oid,
            "ontology_id": ontology_id
        })
    return {"neural_ontologies": ontologies}

