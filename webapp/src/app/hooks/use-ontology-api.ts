import useSWR from 'swr'
import { Ontology, Triple } from '../store/ontology-store'

// Fetcher function for SWR
const fetcher = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'An error occurred')
  }
  return response.json()
}

// Hook to fetch all ontologies
export function useOntologyList() {
  const { data, error, isLoading, mutate } = useSWR<{ ids: string[] }>(
    '/api/ontology',
    fetcher
  )

  return {
    ontologyIds: data?.ids || [],
    error,
    isLoading,
    refresh: mutate,
  }
}

// Hook to fetch ontology summary
export function useOntologySummary(id: string | null) {
  const { data, error, isLoading, mutate } = useSWR<Ontology>(
    id ? `/api/ontology/${id}/summary` : null,
    fetcher
  )

  return {
    ontology: data,
    error,
    isLoading,
    refresh: mutate,
  }
}

// Hook to fetch ontology triples
export function useOntologyTriples(id: string | null, limit = 1000, offset = 0) {
  const { data, error, isLoading, mutate } = useSWR<{
    id: string
    total: number
    triples: Triple[]
  }>(
    id ? `/api/ontology/${id}/triples?limit=${limit}&offset=${offset}` : null,
    fetcher
  )

  return {
    triples: data?.triples || [],
    total: data?.total || 0,
    error,
    isLoading,
    refresh: mutate,
  }
}

// Upload function (not using SWR since it's a mutation)
export async function uploadOntology(file: File): Promise<Ontology> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/ontology/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}

// Delete function (not using SWR since it's a mutation)
export async function deleteOntology(id: string): Promise<void> {
  const response = await fetch(`/api/ontology/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Delete failed')
  }
} 