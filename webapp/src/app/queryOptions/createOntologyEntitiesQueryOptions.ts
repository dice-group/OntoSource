import { queryOptions } from "@tanstack/react-query";

export default function createOntologyEntitiesQueryOptions(ontologyId: string | null) {
  return queryOptions({
    queryKey: ['ontology-entities', ontologyId],
    queryFn: () => getOntologyEntities(ontologyId!),
    enabled: !!ontologyId,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always' // Refetch when component mounts
  })
}

type EntityItem = {
  iri: string
  name: string
}

type EntitiesResponse = {
  classes: EntityItem[]
  individuals: EntityItem[]
  object_properties: EntityItem[]
  data_properties: EntityItem[]
}

const getOntologyEntities = async (ontologyId: string): Promise<EntitiesResponse> => {
  const response = await fetch(`/api/ontology/${ontologyId}/entities`)
  if (!response.ok) throw new Error('Failed to fetch entities')
  return response.json()
}

