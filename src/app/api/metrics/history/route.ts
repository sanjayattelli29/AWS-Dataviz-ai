import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const datasetId = searchParams.get('datasetId');
    const limit = searchParams.get('limit') || '10';

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 });
    }

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.append('userId', userId);
    if (datasetId) queryParams.append('datasetId', datasetId);
    queryParams.append('limit', limit);

    const response = await fetch(`${LAMBDA_BASE_URL}/metrics/history?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // You might need to adjust this based on your auth setup
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching metrics history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch metrics history' 
    }, { status: 500 });
  }
}
