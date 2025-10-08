from typing import Dict
from threading import Lock
from owlapy.owl_ontology import Ontology

ONTOLOGY_STORE: Dict[str, tuple[Ontology, str]] = {}
ONTOLOGY_LOCKS: Dict[str, Lock] = {}

