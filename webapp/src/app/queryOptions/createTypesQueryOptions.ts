import { queryOptions } from "@tanstack/react-query";

export interface ClassItem {
  iri: string;
  name: string;
}

export interface TypesRequest {
  individual_iri: string;
  reasoner_type?: "structural" | "sync";
  property_cache?: boolean;
  negation_default?: boolean;
  sub_properties?: boolean;
}

export interface TypesResponse {
  ontology_id: string;
  individual_iri: string;
  types: ClassItem[];
}

export const createTypesQueryOptions = (
  ontologyId: string,
  request: TypesRequest,
  enabled: boolean = true,
) => {
  return queryOptions<TypesResponse>({
    queryKey: ["types", ontologyId, request],
    queryFn: () => getTypes(ontologyId, request),
    enabled,
  });
};

const getTypes = async (ontologyId: string, request: TypesRequest) => {
  const response = await fetch(`/api/reasoning/${ontologyId}/types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to get types");
  }

  return response.json();
};