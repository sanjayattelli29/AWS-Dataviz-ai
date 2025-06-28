import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

const LAMBDA_BASE_URL = 'https://j4hb7sgxid.execute-api.ap-south-1.amazonaws.com/dev';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing history ID' }, { status: 400 });
    }

    const response = await fetch(`${LAMBDA_BASE_URL}/upload-history/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.user.id}`, // You might need to adjust this based on your auth setup
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error deleting upload history:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete upload history' 
    }, { status: 500 });
  }
}
