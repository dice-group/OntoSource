from pydantic import BaseModel
from .modify import CreateOntologyResponse
from fastapi import APIRouter, HTTPException, BackgroundTasks
from owlapy.agen_kg.agent import AGenKG
from typing import Optional, List
from threading import Lock
from enum import Enum
import uuid
import asyncio
import tempfile
import os
from store import ONTOLOGY_STORE, ONTOLOGY_LOCKS

router = APIRouter(prefix="/generate", tags=["generate"])

class JobStatus(str, Enum):
	PENDING = "pending"
	PROCESSING = "processing"
	COMPLETED = "completed"
	FAILED = "failed"

class GenerateOntologyRequest(BaseModel):
	text: str
	model_name: str = "gpt-4o"
	api_key: str
	api_base: str = "https://models.github.ai/inference"
	ontology_namespace: str = "http://example.com/ontogen#"
	filename: Optional[str] = "generated_ontology.owl"
	ontology_type: str = "domain"
	query: Optional[str] = None
	domain: Optional[str] = None
	entity_types: Optional[List[str]] = None
	generate_types: bool = False
	extract_spl_triples: bool = False
	create_class_hierarchy: bool = False
	entity_clustering: bool = True
	use_chunking: Optional[bool] = None
	use_incremental_merging: bool = False
	fact_reassurance: bool = True
	temperature: float = 0.1
	seed: int = 42
	cache: bool = False
	enable_logging: bool = False
	max_tokens: int = 4000
	chunk_size: Optional[int] = None
	overlap: Optional[int] = None
	chunking_strategy: Optional[str] = None
	auto_chunk_threshold: Optional[int] = None

class GenerateOntologyJobResponse(BaseModel):
	job_id: str
	status: str
	message: str

# Store for generation jobs
GENERATION_JOBS = {}

@router.post("/generate_ontology", response_model=GenerateOntologyJobResponse)
async def generate_ontology(request: GenerateOntologyRequest, background_tasks: BackgroundTasks):
	"""
	Start ontology generation as a background job.
	Returns a job ID that can be used to check the generation status.
	"""
	job_id = str(uuid.uuid4())

	# Initialize job status
	GENERATION_JOBS[job_id] = {
		"status": JobStatus.PENDING,
		"ontology_id": None,
		"filename": None,
		"ontology_iri": None,
		"message": None,
		"error": None
	}

	# Start background task
	background_tasks.add_task(_generate_ontology_background, job_id, request)

	return {
		"job_id": job_id,
		"status": JobStatus.PENDING,
		"message": "Ontology generation started"
	}

async def _generate_ontology_background(job_id: str, request: GenerateOntologyRequest):
	"""Background task to generate ontology"""
	GENERATION_JOBS[job_id]["status"] = JobStatus.PROCESSING

	try:
		def _generate():
			agenkg = AGenKG(
				model=request.model_name,
				api_key=request.api_key,
				api_base=request.api_base,
				temperature=request.temperature,
				seed=request.seed,
				cache=request.cache,
				enable_logging=request.enable_logging,
				max_tokens=request.max_tokens
			)

			# Apply chunking configuration if any params were specified
			chunking_params = {k: v for k, v in {
				"chunk_size": request.chunk_size,
				"overlap": request.overlap,
				"strategy": request.chunking_strategy,
				"auto_chunk_threshold": request.auto_chunk_threshold,
			}.items() if v is not None}
			if chunking_params:
				agenkg.configure_chunking(**chunking_params)

			temp_dir = tempfile.gettempdir()
			temp_path = os.path.join(temp_dir, f"ontology_{uuid.uuid4()}.owl")

			kwargs = dict(
				ontology_namespace=request.ontology_namespace,
				entity_types=request.entity_types,
				generate_types=request.generate_types,
				extract_spl_triples=request.extract_spl_triples,
				create_class_hierarchy=request.create_class_hierarchy,
				use_chunking=request.use_chunking,
				use_incremental_merging=request.use_incremental_merging,
				fact_reassurance=request.fact_reassurance,
				save_path=temp_path
			)
			if request.ontology_type == "domain":
				kwargs["domain"] = request.domain
			else:
				kwargs["entity_clustering"] = request.entity_clustering

			ontology = agenkg.generate_ontology(
				text=request.text,
				ontology_type=request.ontology_type,
				query=request.query,
				**kwargs
			)

			if os.path.exists(temp_path):
				try:
					os.remove(temp_path)
				except Exception:
					pass

			oid = str(uuid.uuid4())
			ONTOLOGY_STORE[oid] = (ontology, request.filename)
			ONTOLOGY_LOCKS[oid] = Lock()

			return oid, request.filename, str(ontology.get_ontology_id().get_ontology_iri().as_str())

		oid, filename, ontology_iri = await asyncio.to_thread(_generate)

		GENERATION_JOBS[job_id] = {
			"status": JobStatus.COMPLETED,
			"ontology_id": oid,
			"filename": filename,
			"ontology_iri": ontology_iri,
			"message": f"Ontology '{filename}' generated successfully",
			"error": None
		}
	except Exception as e:
		GENERATION_JOBS[job_id] = {
			"status": JobStatus.FAILED,
			"ontology_id": None,
			"filename": None,
			"ontology_iri": None,
			"message": None,
			"error": str(e)
		}

@router.get("/generate_ontology/status/{job_id}")
async def get_generation_status(job_id: str):
	"""Check status of ontology generation job"""
	job = GENERATION_JOBS.get(job_id)
	if not job:
		raise HTTPException(status_code=404, detail="Job not found")
	return job
