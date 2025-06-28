import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('Session in metrics/save:', session);
    
    if (!session || !session.user) {
      console.log('No session found in metrics/save');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    console.log('Request body in metrics/save:', body);
    
    const response = await fetch(`${LAMBDA_BASE_URL}/metrics/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`,
      },
      body: JSON.stringify(body),
    });

    console.log('Lambda response status:', response.status);
    
    const data = await response.json();
    console.log('Lambda response data:', data);
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error saving metrics:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to save metrics' 
    }, { status: 500 });
  }
}
