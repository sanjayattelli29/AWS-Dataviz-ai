import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

function isAdmin(user: { email: string }) {
  // Replace with your admin logic
  return user.email && user.email.endsWith('@admin.com');
}

export const adminRoutes = async (
  event: APIGatewayProxyEvent,
  context: Context,
  basePath: string
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod;
  const relativePath = path.replace(basePath, '');

  try {
    const user = await verifyToken(event);
    if (!user || !isAdmin(user)) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    if (relativePath === '/collections' && method === 'GET') {
      return await handleListCollections();
    } else if (relativePath === '/databases' && method === 'GET') {
      return await handleListDatabases();
    } else if (relativePath === '/delete-collection' && method === 'POST') {
      return await handleDeleteCollection(event);
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'Admin route not found' }) };
    }
  } catch (error) {
    console.error('Admin route error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function handleListCollections(): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const collections = await db.listCollections().toArray();
    return { statusCode: 200, body: JSON.stringify(collections) };
  } catch (error) {
    console.error('Error listing collections:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to list collections' }) };
  }
}

async function handleListDatabases(): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const admin = db.admin();
    const result = await admin.listDatabases();
    return { statusCode: 200, body: JSON.stringify(result.databases) };
  } catch (error) {
    console.error('Error listing databases:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to list databases' }) };
  }
}

async function handleDeleteCollection(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { collectionName } = body;
    if (!collectionName) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Collection name is required' }) };
    }
    const db = await getDb();
    await db.collection(collectionName).drop();
    return { statusCode: 200, body: JSON.stringify({ message: 'Collection deleted successfully' }) };
  } catch (error) {
    console.error('Error deleting collection:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete collection' }) };
  }
} 