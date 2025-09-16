'use client'

import { useEffect } from 'react'
import { useOntologyList } from '../hooks/use-ontology-api'
import { useOntologyError, useSelectedOntologyId, useSetOntologyError } from '../store/ontology-store'
import FileUpload from './FileUpload'
import OntologyList from './OntologyList'
import KnowledgeGraph from './KnowledgeGraph'

export default function OntologyManager() {
  const selectedId = useSelectedOntologyId()
  const error = useOntologyError()
  const { ontologyIds, refresh } = useOntologyList()
  const setError = useSetOntologyError()

  // Refresh the list when component mounts
  useEffect(() => {
    refresh()
  }, [refresh])

  const handleUploadSuccess = () => {
    refresh() // Refresh the list after successful upload
  }

  const handleUploadError = (errorMessage: string) => {
    console.error('Upload error:', errorMessage)
  }

  const dismissError = () => {
    setError(null)
  }

  return (
    <div className="h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            OntoSource
          </h1>
          <p className="text-lg text-gray-600">
            Knowledge Graph Visualization for Ontologies
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex">
                <svg className="flex-shrink-0 h-5 w-5 text-red-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={dismissError}
                className="text-red-400 hover:text-red-600"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload and Ontology List */}
          <div className="lg:col-span-1 space-y-6">
            <FileUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
            />
            <OntologyList />
          </div>

          {/* Right Panel - Knowledge Graph */}
          <div className="lg:col-span-2">
            <KnowledgeGraph
              ontologyId={selectedId}
              height={600}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>
            Upload ontology files to visualize their knowledge graphs.
            Supports OWL, RDF, TTL, N3, and NT formats.
          </p>
        </div>
      </div>
    </div>
  )
} 