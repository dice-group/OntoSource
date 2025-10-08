import { OntologySummary } from "@/app/store/ontology-store";
import { queryOptions } from "@tanstack/react-query";

export default function createSummaryAllQueryOptions() {
  return queryOptions({
    queryKey: ['ontology-summary-all'],
    queryFn: () => getSummaryAll(),
    staleTime: 60 * 1000, // 1 minute
    refetchOnMount: 'always' // Force refetch when component mounts
  })
}

const getSummaryAll = async (): Promise<SummaryAllResponse> => {
  const response = await fetch('/api/ontology/summary_all')
  return response.json()
}

type OntologyInfo = {
  id: string
  filename: string
  ontology_iri: string
  summary: OntologySummary
}

type SummaryAllResponse = {
  summary: OntologyInfo[]
}