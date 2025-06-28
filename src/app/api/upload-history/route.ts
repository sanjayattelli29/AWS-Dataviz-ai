import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') || '50';
    const page = searchParams.get('page') || '1';

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId);
    queryParams.append('limit', limit);
    queryParams.append('page', page);

    const response = await fetch(`${LAMBDA_BASE_URL}/upload-history?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // You might need to adjust this based on your auth setup
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching upload history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch upload history' 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const response = await fetch(`${LAMBDA_BASE_URL}/upload-history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // You might need to adjust this based on your auth setup
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error saving upload history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save upload history' 
    }, { status: 500 });
  }
}
