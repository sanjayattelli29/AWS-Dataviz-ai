import { NextRequest, NextResponse } from 'next/server';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${LAMBDA_BASE_URL}/metrics/list-datasets`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error listing datasets:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to list datasets' 
    }, { status: 500 });
  }
}
