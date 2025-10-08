import { queryOptions } from "@tanstack/react-query";

export interface IndividualItem {
  iri: string;
  name: string;
}

export interface InstancesRequest {
  class_expression: string;
  syntax?: "iri" | "dl" | "manchester";
  reasoner_type?: "structural" | "sync";
  property_cache?: boolean;
  negation_default?: boolean;
  sub_properties?: boolean;
  sync_reasoner_name?: "HermiT" | "Pellet" | "ELK" | "JFact" | "Openllet" | "Structural";
}

export interface InstancesResponse {
  ontology_id: string;
  class_expression: string;
  reasoner_type: string;
  individuals: IndividualItem[];
}

export const createInstancesQueryOptions = (
  ontologyId: string,
  request: InstancesRequest,
  enabled: boolean = true,
) => {
  return queryOptions<InstancesResponse>({
    queryKey: ["instances", ontologyId, request],
    queryFn: async () => {
      const response = await fetch(`/api/reasoning/${ontologyId}/instances`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get instances");
      }

      return response.json();
    },
    enabled,
  });
};

