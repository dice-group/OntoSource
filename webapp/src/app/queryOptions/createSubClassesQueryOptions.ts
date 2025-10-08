import { queryOptions } from "@tanstack/react-query";

export interface ClassItem {
  iri: string;
  name: string;
}

export interface SubClassesRequest {
  class_iri: string;
  reasoner_type?: "structural" | "sync";
  direct?: boolean;
  only_named?: boolean;
  property_cache?: boolean;
  negation_default?: boolean;
  sub_properties?: boolean;
}

export interface SubClassesResponse {
  ontology_id: string;
  class_iri: string;
  sub_classes: ClassItem[];
}

export const createSubClassesQueryOptions = (
  ontologyId: string,
  request: SubClassesRequest,
  enabled: boolean = true,
) => {
  return queryOptions<SubClassesResponse>({
    queryKey: ["sub-classes", ontologyId, request],
    queryFn: async () => {
      const response = await fetch(`/api/reasoning/${ontologyId}/sub-classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get sub classes");
      }

      return response.json();
    },
    enabled,
  });
};

