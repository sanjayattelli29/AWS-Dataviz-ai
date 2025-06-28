import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

// GET /api/datasets - Get all datasets for the current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    console.log('Session in /api/datasets:', session);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Use the JWT from session.accessToken if present
    const token = (session as any).accessToken || session.user.id;

    const response = await fetch(`${LAMBDA_BASE_URL}/datasets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return NextResponse.json(
      { message: 'An error occurred while fetching datasets' },
      { status: 500 }
    );
  }
}

// POST /api/datasets - Create a new dataset
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const response = await fetch(`${LAMBDA_BASE_URL}/datasets`, {
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
    console.error('Error creating dataset:', error);
    return NextResponse.json(
      { message: 'An error occurred while creating the dataset' },
      { status: 500 }
    );
  }
}

// PUT /api/datasets - Update a dataset
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    const response = await fetch(`${LAMBDA_BASE_URL}/datasets`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // You might need to adjust this based on your auth setup
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error updating dataset:', error);
    return NextResponse.json(
      { message: 'An error occurred while updating the dataset' },
      { status: 500 }
    );
  }
}