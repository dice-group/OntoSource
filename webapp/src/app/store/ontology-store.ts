import { create } from 'zustand'

export interface Triple {
  s: string
  p: string
  o: string | {
    type: 'literal'
    value: string
    datatype?: string
    lang?: string
  }
}

export interface OntologySummary {
  triples: number
  classes: number
  object_properties: number
  data_properties: number
  individuals: number
  namespace?: string
}

export interface Ontology {
  id: string
  filename: string
  ontology_iri?: string
  summary: OntologySummary
}

interface OntologyState {
  ontologies: Ontology[]
  selectedOntologyId: string | null
  isLoading: boolean
  error: string | null
}

interface OntologyActions {
  setOntologies: (ontologies: Ontology[]) => void
  addOntology: (ontology: Ontology) => void
  removeOntology: (id: string) => void
  setSelectedOntology: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const useOntologyStore = create<OntologyState & OntologyActions>((set) => ({
  ontologies: [],
  selectedOntologyId: null,
  isLoading: false,
  error: null,
  
  setOntologies: (ontologies) => set({ ontologies }),
  addOntology: (ontology) => set((state) => ({ 
    ontologies: [...state.ontologies, ontology] 
  })),
  removeOntology: (id) => set((state) => ({ 
    ontologies: state.ontologies.filter(ont => ont.id !== id),
    selectedOntologyId: state.selectedOntologyId === id ? null : state.selectedOntologyId
  })),
  setSelectedOntology: (id) => set({ selectedOntologyId: id }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}))

// Expose only the actions and selectors, not the whole store
export const useOntologies = () => useOntologyStore((state) => state.ontologies)
export const useSelectedOntologyId = () => useOntologyStore((state) => state.selectedOntologyId)
export const useOntologyLoading = () => useOntologyStore((state) => state.isLoading)
export const useOntologyError = () => useOntologyStore((state) => state.error)

// Individual action selectors to avoid re-render issues
export const useSetOntologies = () => useOntologyStore((state) => state.setOntologies)
export const useAddOntology = () => useOntologyStore((state) => state.addOntology)
export const useRemoveOntology = () => useOntologyStore((state) => state.removeOntology)
export const useSetSelectedOntology = () => useOntologyStore((state) => state.setSelectedOntology)
export const useSetOntologyLoading = () => useOntologyStore((state) => state.setLoading)
export const useSetOntologyError = () => useOntologyStore((state) => state.setError) 