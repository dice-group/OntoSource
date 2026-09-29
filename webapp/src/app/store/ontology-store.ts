import { create } from "zustand";

export interface Triple {
  s: string;
  p: string;
  o:
    | string
    | {
        type: "literal";
        value: string;
        datatype?: string;
        lang?: string;
      };
}

export interface OntologySummary {
  triples: number;
  classes: number;
  object_properties: number;
  data_properties: number;
  individuals: number;
  namespace?: string;
}

export interface Ontology {
  id: string;
  filename: string;
  ontology_iri?: string;
  summary: OntologySummary;
}

interface OntologySelection {
  selectedOntologyId: string | null;
  setSelectedOntology: (id: string | null) => void;
  removeOntology: (id: string) => void;
}

const useOntologyStore = create<OntologySelection>((set) => ({
  selectedOntologyId: null,
  setSelectedOntology: (id) => set({ selectedOntologyId: id }),
  removeOntology: (id) => set((state) => ({
    selectedOntologyId: state.selectedOntologyId === id ? null : state.selectedOntologyId,
  })),
}));

export const useSelectedOntologyId = () => useOntologyStore((state) => state.selectedOntologyId);
export const useSetSelectedOntology = () => useOntologyStore((state) => state.setSelectedOntology);
export const useRemoveOntology = () => useOntologyStore((state) => state.removeOntology);
