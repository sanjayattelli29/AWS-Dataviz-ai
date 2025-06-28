import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

export const uploadHistoryRoutes = async (
  event: APIGatewayProxyEvent,
  context: Context,
  basePath: string
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod;
  const relativePath = path.replace(basePath, '');

  try {
    const user = await verifyToken(event);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (relativePath === '' && method === 'GET') {
      return await handleGetHistory(user.userId);
    } else if (relativePath === '' && method === 'POST') {
      return await handleAddHistory(event, user.userId);
    } else if (relativePath.startsWith('/') && method === 'DELETE') {
      const historyId = relativePath.substring(1);
      return await handleDeleteHistory(historyId, user.userId);
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'Upload history route not found' }) };
    }
  } catch (error) {
    console.error('Upload history route error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function handleGetHistory(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const history = await db.collection('upload_history')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
    return { statusCode: 200, body: JSON.stringify(history) };
  } catch (error) {
    console.error('Error fetching upload history:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch upload history' }) };
  }
}

async function handleAddHistory(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const db = await getDb();
    const record = { ...body, userId: new ObjectId(userId), createdAt: new Date() };
    const result = await db.collection('upload_history').insertOne(record);
    return { statusCode: 201, body: JSON.stringify({ ...record, _id: result.insertedId.toString() }) };
  } catch (error) {
    console.error('Error adding upload history:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to add upload history' }) };
  }
}

async function handleDeleteHistory(historyId: string, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const result = await db.collection('upload_history').deleteOne({ _id: new ObjectId(historyId), userId: new ObjectId(userId) });
    if (result.deletedCount === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Upload history not found' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ message: 'Upload history deleted successfully' }) };
  } catch (error) {
    console.error('Error deleting upload history:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete upload history' }) };
  }
} 