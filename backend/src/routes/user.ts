import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

export const userRoutes = async (
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

    if (relativePath === '/upload-limits' && method === 'GET') {
      return await handleGetUploadLimits(user.userId);
    } else if (relativePath === '' && method === 'GET') {
      return await handleGetUserInfo(user.userId);
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'User route not found' }) };
    }
  } catch (error) {
    console.error('User route error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function handleGetUploadLimits(userId: string): Promise<APIGatewayProxyResult> {
  try {
    // Example: return static limits, or fetch from DB if needed
    return {
      statusCode: 200,
      body: JSON.stringify({
        maxUploads: 10,
        maxFileSizeMB: 50
      })
    };
  } catch (error) {
    console.error('Error fetching upload limits:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch upload limits' }) };
  }
}

async function handleGetUserInfo(userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: user._id.toString(),
        name: user.name,
        email: user.email
      })
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to fetch user info' }) };
  }
} 