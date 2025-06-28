import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { verifyToken } from '../utils/auth';

export const chatProxyRoutes = async (
  event: APIGatewayProxyEvent,
  context: Context,
  basePath: string
): Promise<APIGatewayProxyResult> => {
  const method = event.httpMethod;
  const relativePath = (event.path || '').replace(basePath, '');

  try {
    const user = await verifyToken(event);
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    if (relativePath === '' && method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      // Echo back for now
      return { statusCode: 200, body: JSON.stringify(body) };
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'Chat proxy route not found' }) };
    }
  } catch (error) {
    console.error('Chat proxy route error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
}; 