import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3001';

async function proxyRequest(request: NextRequest) {
  const body = await request.text();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  try {
    const response = await fetch(`${BACKEND_URL}/graphql`, {
      method: 'POST',
      headers,
      body,
    });
    
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('GraphQL proxy error:', error);
    return NextResponse.json(
      { errors: [{ message: 'Backend service unavailable' }] },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  return proxyRequest(request);
}
