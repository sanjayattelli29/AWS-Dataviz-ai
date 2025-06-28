import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import cloudinary from 'cloudinary';
import { verifyToken } from '../utils/auth';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

export const cloudinaryRoutes = async (
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

    if (relativePath === '/delete' && method === 'POST') {
      return await handleDeleteFile(event);
    } else {
      return { statusCode: 404, body: JSON.stringify({ error: 'Cloudinary route not found' }) };
    }
  } catch (error) {
    console.error('Cloudinary route error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

async function handleDeleteFile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { publicId } = body;
    if (!publicId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'publicId is required' }) };
    }
    const result = await cloudinary.v2.uploader.destroy(publicId);
    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to delete file from Cloudinary' }) };
  }
} 