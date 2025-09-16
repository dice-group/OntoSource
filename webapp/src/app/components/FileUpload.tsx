'use client'

import { useCallback, useState } from 'react'
import { uploadOntology } from '../hooks/use-ontology-api'
import { useAddOntology, useSetOntologyError } from '../store/ontology-store'

interface FileUploadProps {
  onUploadSuccess?: () => void
  onUploadError?: (error: string) => void
}

export default function FileUpload({ onUploadSuccess, onUploadError }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const addOntology = useAddOntology()
  const setError = useSetOntologyError()

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    try {
      const ontology = await uploadOntology(file)
      addOntology(ontology)
      onUploadSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      setError(errorMessage)
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }, [addOntology, setError, onUploadSuccess, onUploadError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
          ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Upload Ontology File
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop your OWL, RDF, TTL, or N3 file here, or click to browse
            </p>
            <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <input
                type="file"
                className="sr-only"
                accept=".owl,.rdf,.xml,.ttl,.n3,.nt"
                onChange={handleFileInput}
                disabled={isUploading}
              />
              Choose File
            </label>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: OWL, RDF, XML, TTL, N3, NT
            </p>
          </>
        )}
      </div>
    </div>
  )
} 