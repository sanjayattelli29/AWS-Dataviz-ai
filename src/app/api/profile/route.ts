import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

// GET endpoint to fetch user profile
export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${LAMBDA_BASE_URL}/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // You might need to adjust this based on your auth setup
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch user profile' 
    }, { status: 500 });
  }
}

// POST endpoint to create or update user profile
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    // Also check Authorization header as backup
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];
    
    if (!session?.user?.id && !token) {
      console.log('Unauthorized request:', { 
        hasSession: !!session, 
        hasToken: !!token,
        headers: Object.fromEntries(req.headers.entries())
      });
      return NextResponse.json({ error: 'Unauthorized - No valid session or token' }, { status: 401 });
    }

    const userId = session?.user?.id || token;
    const body = await req.json();
    
    const response = await fetch(`${LAMBDA_BASE_URL}/profile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`, // You might need to adjust this based on your auth setup
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update user profile' 
    }, { status: 500 });
  }
}
