'use client'

import { useCallback } from 'react'
import { useOntologySummary, deleteOntology } from '../hooks/use-ontology-api'
import { useOntologies, useSelectedOntologyId, useSetSelectedOntology, useRemoveOntology } from '../store/ontology-store'

interface OntologyItemProps {
  id: string
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

function OntologyItem({ id, isSelected, onSelect, onDelete }: OntologyItemProps) {
  const { ontology, isLoading, error } = useOntologySummary(id)

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this ontology?')) {
      try {
        await deleteOntology(id)
        onDelete(id)
      } catch (error) {
        console.error('Failed to delete ontology:', error)
      }
    }
  }, [id, onDelete])

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (error || !ontology) {
    return (
      <div className="p-4 border rounded-lg border-red-200 bg-red-50">
        <p className="text-red-600 text-sm">Error loading ontology: {id}</p>
      </div>
    )
  }

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
            {ontology.filename}
          </h3>
          {ontology.ontology_iri && (
            <p className="text-xs text-gray-500 mb-2 truncate">
              IRI: {ontology.ontology_iri}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>Classes: {ontology.summary.classes}</div>
            <div>Properties: {ontology.summary.object_properties + ontology.summary.data_properties}</div>
            <div>Individuals: {ontology.summary.individuals}</div>
            <div>Triples: {ontology.summary.triples}</div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
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
  const ontologies = useOntologies()
  const selectedId = useSelectedOntologyId()
  const setSelectedOntology = useSetSelectedOntology()
  const removeOntology = useRemoveOntology()

  const handleSelect = useCallback((id: string) => {
    setSelectedOntology(selectedId === id ? null : id)
  }, [selectedId, setSelectedOntology])

  const handleDelete = useCallback((id: string) => {
    removeOntology(id)
  }, [removeOntology])

  if (ontologies.length === 0) {
    return (
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-2">Loaded Ontologies</h2>
        <p className="text-gray-500">No ontologies loaded. Upload a file to get started.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <h2 className="text-lg font-medium text-gray-900">
          Loaded Ontologies ({ontologies.length})
        </h2>
        <p className="text-sm text-gray-500">
          Click on an ontology to view its knowledge graph
        </p>
      </div>
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {ontologies.map((ontology) => (
          <OntologyItem
            key={ontology.id}
            id={ontology.id}
            isSelected={selectedId === ontology.id}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
} 