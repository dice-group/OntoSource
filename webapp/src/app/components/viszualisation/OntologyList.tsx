'use client'

import { useCallback } from 'react'
import { useOntologies, useSelectedOntologyId, useSetSelectedOntology, useRemoveOntology, OntologySummary } from '../../store/ontology-store'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Ontology } from '../../store/ontology-store'
import createSummaryAllQueryOptions from '../../queryOptions/createSummaryAllQueryOptions'
import createDeleteOntologyMutationOptions from '../../mutationOptions/createDeleteOntologyMutationOptions'

interface OntologyItemProps {
  id: string
  filename: string
  isSelected: boolean
  onSelect: (id: string) => void
  ontology_summary: OntologySummary
}



function OntologyItem({ id, filename, isSelected, onSelect, ontology_summary }: OntologyItemProps) {
  const {mutate} = useMutation(createDeleteOntologyMutationOptions())


  return (
    <div
      className={`
        p-4 border rounded-lg cursor-pointer transition-colors
        ${isSelected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }
      `}
      onClick={() => onSelect(id)}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 mb-1">
            {filename}
          </h3>
          <p className="text-xs text-gray-500 mb-1 truncate font-mono">
            ID: {id}
          </p>
          {ontology_summary.namespace && (
            <p className="text-xs text-gray-500 mb-2 truncate">
              IRI: {ontology_summary.namespace}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Classes: {ontology_summary.classes}</div>
            <div>Properties: {ontology_summary.object_properties + ontology_summary.data_properties}</div>
            <div>Individuals: {ontology_summary.individuals}</div>
            <div>Triples: {ontology_summary.triples}</div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            mutate(id)
          }}
          className="ml-2 p-1 text-gray-400 hover:text-red-600 transition-colors"
          title="Delete ontology"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function OntologyList() {
  const selectedId = useSelectedOntologyId()
  const setSelectedOntology = useSetSelectedOntology()
 
  const {data, isPending, error} = useQuery(createSummaryAllQueryOptions())

  const handleSelect = useCallback((id: string) => {
    setSelectedOntology(selectedId === id ? null : id)
  }, [selectedId, setSelectedOntology])

 

  if (isPending) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Loaded Ontologies</h2>
        <p className="text-gray-500">Loading ontologies...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Loaded Ontologies</h2>
        <p className="text-gray-500">Error loading ontologies: {error.message}</p>
      </div>
    )
  }
if (data?.summary && data.summary.length !== 0) {
  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium text-gray-900">
          Loaded Ontologies ({data.summary.length})
        </h2>
        <p className="text-sm text-gray-500">
          Click on an ontology to view its knowledge graph
        </p>
      </div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {data.summary.map((ontology : Ontology) => (
          <OntologyItem
            key={ontology.id}
            id={ontology.id}
            filename={ontology.filename}
            ontology_summary={ontology.summary}
            isSelected={selectedId === ontology.id}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  )
} else {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-2">Loaded Ontologies</h2>
      <p className="text-gray-500">No ontologies loaded. Upload a file to get started.</p>
    </div>
  )
}
} 