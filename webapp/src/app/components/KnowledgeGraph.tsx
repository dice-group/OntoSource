'use client'

import { useEffect, useRef, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { useOntologyTriples } from '../hooks/use-ontology-api'
import { Triple } from '../store/ontology-store'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">Loading graph...</div>
})

interface Node {
  id: string
  label: string
  type: 'class' | 'property' | 'individual' | 'literal'
  color: string
}

interface Link {
  source: string
  target: string
  label: string
  color: string
}

interface GraphData {
  nodes: Node[]
  links: Link[]
}

interface KnowledgeGraphProps {
  ontologyId: string | null
  height?: number
  width?: number
}

function getNodeType(uri: string): 'class' | 'property' | 'individual' | 'literal' {
  // Simple heuristics to determine node type based on URI patterns
  if (uri.includes('#type') || uri.includes('rdf-syntax-ns#type')) return 'property'
  if (uri.includes('#Class') || uri.includes('/Class')) return 'class'
  if (uri.includes('#Property') || uri.includes('/Property')) return 'property'
  if (uri.startsWith('_:')) return 'individual' // blank node
  if (!uri.startsWith('http')) return 'literal'
  return 'individual'
}

function getNodeColor(type: 'class' | 'property' | 'individual' | 'literal'): string {
  switch (type) {
    case 'class': return '#3b82f6' // blue
    case 'property': return '#10b981' // green
    case 'individual': return '#f59e0b' // yellow
    case 'literal': return '#ef4444' // red
    default: return '#6b7280' // gray
  }
}

function getLinkColor(predicate: string): string {
  const lowerPredicate = predicate.toLowerCase()
  
  // Common RDF/RDFS/OWL relations with distinct colors
  if (lowerPredicate.includes('type') || lowerPredicate.includes('rdf-syntax-ns#type')) {
    return '#8b5cf6' // purple - for rdf:type
  }
  if (lowerPredicate.includes('subclassof') || lowerPredicate.includes('rdfs#subclassof')) {
    return '#3b82f6' // blue - for rdfs:subClassOf
  }
  if (lowerPredicate.includes('subpropertyof') || lowerPredicate.includes('rdfs#subpropertyof')) {
    return '#06b6d4' // cyan - for rdfs:subPropertyOf
  }
  if (lowerPredicate.includes('sameas') || lowerPredicate.includes('owl#sameas')) {
    return '#f97316' // orange - for owl:sameAs
  }
  if (lowerPredicate.includes('differentfrom') || lowerPredicate.includes('owl#differentfrom')) {
    return '#ef4444' // red - for owl:differentFrom
  }
  if (lowerPredicate.includes('equivalentclass') || lowerPredicate.includes('owl#equivalentclass')) {
    return '#10b981' // green - for owl:equivalentClass
  }
  if (lowerPredicate.includes('equivalentproperty') || lowerPredicate.includes('owl#equivalentproperty')) {
    return '#84cc16' // lime - for owl:equivalentProperty
  }
  if (lowerPredicate.includes('domain') || lowerPredicate.includes('rdfs#domain')) {
    return '#f59e0b' // amber - for rdfs:domain
  }
  if (lowerPredicate.includes('range') || lowerPredicate.includes('rdfs#range')) {
    return '#d97706' // orange-600 - for rdfs:range
  }
  if (lowerPredicate.includes('label') || lowerPredicate.includes('rdfs#label')) {
    return '#6366f1' // indigo - for rdfs:label
  }
  if (lowerPredicate.includes('comment') || lowerPredicate.includes('rdfs#comment')) {
    return '#8b5cf6' // violet - for rdfs:comment
  }
  
  // Default color for other relations
  return '#9ca3af' // gray
}

export default function KnowledgeGraph({ ontologyId, height = 600, width }: KnowledgeGraphProps) {
  const fgRef = useRef<any>(null)
  const { triples, total, isLoading, error } = useOntologyTriples(ontologyId, 5000) // Limit for performance

  const graphData = useMemo((): GraphData => {
    if (!triples.length) return { nodes: [], links: [] }

    const nodeMap = new Map<string, Node>()
    const links: Link[] = []

    triples.forEach((triple: Triple) => {
      const { s, p, o } = triple

      // Create subject node
      if (!nodeMap.has(s)) {
        const type = getNodeType(s)
        nodeMap.set(s, {
          id: s,
          label: s.split('#').pop() || s.split('/').pop() || s,
          type,
          color: getNodeColor(type)
        })
      }

      // Create object node
      let objectId: string
      let objectLabel: string
      let objectType: 'class' | 'property' | 'individual' | 'literal'

      if (typeof o === 'string') {
        objectId = o
        objectLabel = o.split('#').pop() || o.split('/').pop() || o
        objectType = getNodeType(o)
      } else {
        // Literal object
        objectId = `literal_${Math.random().toString(36).substr(2, 9)}`
        objectLabel = o.value.length > 30 ? o.value.substring(0, 30) + '...' : o.value
        objectType = 'literal'
      }

      if (!nodeMap.has(objectId)) {
        nodeMap.set(objectId, {
          id: objectId,
          label: objectLabel,
          type: objectType,
          color: getNodeColor(objectType)
        })
      }

      // Create link with color based on predicate
      const predicateLabel = p.split('#').pop() || p.split('/').pop() || p
      links.push({
        source: s,
        target: objectId,
        label: predicateLabel,
        color: getLinkColor(p)
      })
    })

    return {
      nodes: Array.from(nodeMap.values()),
      links
    }
  }, [triples])

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      // Auto-zoom to fit graph
      setTimeout(() => {
        fgRef.current?.zoomToFit(400)
      }, 100)
    }
  }, [graphData])

  if (!ontologyId) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Select an ontology to view its knowledge graph</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="flex flex-col items-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-500">Loading knowledge graph...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg">
        <p className="text-red-600">Error loading graph: {error.message}</p>
      </div>
    )
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available for visualization</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium text-gray-900">Knowledge Graph</h3>
        <p className="text-sm text-gray-500">
          Showing {graphData.nodes.length} nodes and {graphData.links.length} relationships
          {total > triples.length && ` (${triples.length} of ${total} triples)`}
        </p>
      </div>
      <div className="p-4 overflow-hidden">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          height={height}
          width={width || undefined}
          nodeAutoColorBy="type"
          nodeLabel={(node: any) => `${node.label} (${node.type})`}
          nodeColor={(node: any) => node.color}
          linkLabel={(link: any) => link.label}
          linkColor={(link: any) => link.color}
          linkDirectionalArrowLength={3.5}
          linkDirectionalArrowRelPos={1}
          nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
            const label = node.label
            const fontSize = 12 / globalScale
            ctx.font = `${fontSize}px Sans-Serif`
            const textWidth = ctx.measureText(label).width
            const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2)

            ctx.fillStyle = node.color
            ctx.fillRect(
              node.x - bckgDimensions[0] / 2,
              node.y - bckgDimensions[1] / 2,
              bckgDimensions[0],
              bckgDimensions[1]
            )

            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillStyle = 'white'
            ctx.fillText(label, node.x, node.y)

            node.__bckgDimensions = bckgDimensions
          }}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = color
            const bckgDimensions = node.__bckgDimensions
            if (bckgDimensions) {
              ctx.fillRect(
                node.x - bckgDimensions[0] / 2,
                node.y - bckgDimensions[1] / 2,
                bckgDimensions[0],
                bckgDimensions[1]
              )
            }
          }}
        />
      </div>
      <div className="p-4 border-t bg-gray-50">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Legend</h4>
        
        {/* Node Types */}
        <div className="mb-3">
          <h5 className="text-xs font-medium text-gray-700 mb-1">Node Types</h5>
          <div className="flex flex-wrap gap-4 text-xs text-gray-700">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>Classes</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
              <span>Properties</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Individuals</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
              <span>Literals</span>
            </div>
          </div>
        </div>

        {/* Relation Types */}
        <div>
          <h5 className="text-xs font-medium text-gray-700 mb-1">Common Relations</h5>
          <div className="flex flex-wrap gap-4 text-xs text-gray-700">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#8b5cf6' }}></div>
              <span>rdf:type</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
              <span>subClassOf</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#f97316' }}></div>
              <span>sameAs</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
              <span>equivalentClass</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
              <span>domain</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#d97706' }}></div>
              <span>range</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-1 rounded-full" style={{ backgroundColor: '#9ca3af' }}></div>
              <span>other</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}