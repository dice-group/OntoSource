import { NextRequest, NextResponse } from 'next/server'

const FASTAPI_BASE_URL = process.env.FASTAPI_BASE_URL || 'http://localhost:8000'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    const response = await fetch(`${FASTAPI_BASE_URL}/modify/${id}/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: errorText || 'Failed to save ontology' }, 
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Save ontology error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}


