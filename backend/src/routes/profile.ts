import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

export const profileRoutes = async (
  event: APIGatewayProxyEvent,
  context: Context,
  basePath: string
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod;
  const relativePath = path.replace(basePath, '');

  try {
    // Verify authentication first
    const user = await verifyToken(event);
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Handle different profile routes
    if (relativePath === '' && method === 'GET') {
      return await handleGetProfile(event, user.userId);
    } else if (relativePath === '' && method === 'PUT') {
      return await handleUpdateProfile(event, user.userId);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Profile route not found' })
      };
    }
  } catch (error) {
    console.error('Profile route error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleGetProfile(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(userId) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      })
    };
  } catch (error) {
    console.error('Error fetching profile:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch profile' })
    };
  }
}

async function handleUpdateProfile(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, image } = body;

    if (!name?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name is required' })
      };
    }

    const db = await getDb();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          name: name.trim(),
          image: image?.trim() || undefined,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Profile updated successfully' })
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update profile' })
    };
  }
} 