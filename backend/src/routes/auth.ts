import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import bcrypt from "bcryptjs";
import jwt from 'jsonwebtoken';
import { getDb } from '../utils/db';

interface AuthResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export const authRoutes = async (
  event: APIGatewayProxyEvent,
  context: Context,
  basePath: string
): Promise<APIGatewayProxyResult> => {
  const path = event.path || '';
  const method = event.httpMethod;
  const relativePath = path.replace(basePath, '');

  try {
    // Handle different auth routes
    if (relativePath === '/register' && method === 'POST') {
      return await handleRegister(event);
    } else if (relativePath === '/login' && method === 'POST') {
      return await handleLogin(event);
    } else if (relativePath === '/session' && method === 'GET') {
      return await handleGetSession(event);
    } else if (relativePath === '/logout' && method === 'POST') {
      return await handleLogout(event);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Auth route not found' })
      };
    }
  } catch (error) {
    console.error('Auth route error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleRegister(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Name, email, and password are required' })
      };
    }

    const db = await getDb();
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'User already exists' })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = {
      name,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('users').insertOne(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertedId.toString(), email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'User registered successfully',
        user: {
          id: result.insertedId.toString(),
          name,
          email
        },
        token
      })
    };
  } catch (error) {
    console.error('Register error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to register user' })
    };
  }
}

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { email, password } = body;

    if (!email || !password) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    const db = await getDb();
    
    // Find user
    const user = await db.collection('users').findOne({ email });
    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Login successful',
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email
        },
        token
      })
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to login' })
    };
  }
}

async function handleGetSession(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'No token provided' })
      };
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      const db = await getDb();
      const user = await db.collection('users').findOne(
        { _id: new ObjectId(decoded.userId) },
        { projection: { password: 0 } }
      );

      if (!user) {
        return {
          statusCode: 401,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email
          }
        })
      };
    } catch (jwtError) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid token' })
      };
    }
  } catch (error) {
    console.error('Get session error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get session' })
    };
  }
}

async function handleLogout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // For JWT-based auth, logout is handled client-side by removing the token
  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Logged out successfully' })
  };
} 