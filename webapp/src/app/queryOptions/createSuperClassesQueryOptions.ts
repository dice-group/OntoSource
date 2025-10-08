import { queryOptions } from "@tanstack/react-query";

export interface ClassItem {
  iri: string;
  name: string;
}

export interface SuperClassesRequest {
  class_iri: string;
  reasoner_type?: "structural" | "sync";
  direct?: boolean;
  only_named?: boolean;
  property_cache?: boolean;
  negation_default?: boolean;
  sub_properties?: boolean;
}

export interface SuperClassesResponse {
  ontology_id: string;
  class_iri: string;
  super_classes: ClassItem[];
}

export const createSuperClassesQueryOptions = (
  ontologyId: string,
  request: SuperClassesRequest,
  enabled: boolean = true,
) => {
  return queryOptions<SuperClassesResponse>({
    queryKey: ["super-classes", ontologyId, request],
    queryFn: async () => {
      const response = await fetch(`/api/reasoning/${ontologyId}/super-classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get super classes");
      }

      return response.json();
    },
    enabled,
  });
};

