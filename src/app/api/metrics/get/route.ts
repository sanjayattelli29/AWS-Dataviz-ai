import { NextRequest, NextResponse } from 'next/server';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const datasetId = searchParams.get('datasetId');

  if (!userId || !datasetId) {
    return NextResponse.json({ message: 'Missing userId or datasetId' }, { status: 400 });
  }

  try {
    const response = await fetch(`${LAMBDA_BASE_URL}/metrics/get?userId=${userId}&datasetId=${datasetId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('GET metrics error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
