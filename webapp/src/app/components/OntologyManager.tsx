'use client'

import { useEffect } from 'react'
import { useSelectedOntologyId } from '../store/ontology-store'
import FileUpload from './FileUpload'
import OntologyList from './OntologyList'
import KnowledgeGraph from './KnowledgeGraph'
import { useQuery } from '@tanstack/react-query'
import createSummaryQueryOptions from '../queryOptions/createSummaryQueryOptions'

export default function OntologyManager() {
  const selectedId = useSelectedOntologyId()

  const {data} = useQuery({...createSummaryQueryOptions(selectedId), enabled: !!selectedId})

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-3/5 mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            OntoSource
          </h1>
          <p className="text-lg text-gray-600">
            Knowledge Graph Visualization for Ontologies
          </p>
        </div>

    

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Upload and Ontology List */}
          <div className="lg:col-span-1 space-y-6">
            <FileUpload
            />
            <OntologyList />
          </div>

          {/* Right Panel - Knowledge Graph */}
          <div className="lg:col-span-2 space-y-4">
            {/* Ontology Namespace Display */}
            {selectedId && (
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Ontology Namespace</h4>
                    <p className="text-xs text-gray-600 break-all font-mono bg-gray-50 px-2 py-1 rounded">
                      {data?.ontology_iri}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <KnowledgeGraph
              ontologyId={selectedId}
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