import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  console.log('=== API ROUTE HIT ===')
  
  try {
    console.log('About to parse body...')
    const body = await req.json()
    console.log('Body parsed:', body)
    
    const { messages } = body
    console.log('Messages extracted:', messages)
    
    const reply = "Test reply"
    console.log('About to return response')
    
    return NextResponse.json({ reply })
  } catch (error: any) {
    console.log('ERROR CAUGHT:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}