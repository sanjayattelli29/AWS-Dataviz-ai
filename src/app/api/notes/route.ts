import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

// Get all notes for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    console.log('Notes GET - Session:', session?.user?.email, 'ID:', session?.user?.id);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Notes GET - Fetching from:', `${LAMBDA_BASE_URL}/notes`);
    const response = await fetch(`${LAMBDA_BASE_URL}/notes`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`,
      },
    });

    console.log('Notes GET - Response status:', response.status);
    const data = await response.json();
    console.log('Notes GET - Response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

// Create a new note
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log('Notes POST - Session:', session?.user?.email, 'ID:', session?.user?.id);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Notes POST - Request body:', body);
    
    console.log('Notes POST - Sending to:', `${LAMBDA_BASE_URL}/notes`);
    const response = await fetch(`${LAMBDA_BASE_URL}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`,
      },
      body: JSON.stringify(body),
    });

    console.log('Notes POST - Response status:', response.status);
    const data = await response.json();
    console.log('Notes POST - Response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error creating note:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create note' 
    }, { status: 500 });
  }
}
