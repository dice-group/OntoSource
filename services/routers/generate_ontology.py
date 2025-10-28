from pydantic import BaseModel
from .modify import CreateOntologyResponse
from fastapi import APIRouter, HTTPException
from owlapy.ontogen.data_extraction import GraphExtractor



router = APIRouter(prefix="/generate")

class GenerateOntologyRequest(BaseModel):
	text: str
	model: str
	api_key: str
	

@router.get("/generate_ontology", reponse_model=CreateOntologyResponse)
async def generate_ontology(request: GenerateOntologyRequest):
	try: 
		api_key = request.api_key
		model = request.model 
		text = request.text
		ontogen = GraphExtractor