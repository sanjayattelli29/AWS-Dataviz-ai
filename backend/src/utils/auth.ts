import { APIGatewayProxyEvent } from 'aws-lambda';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getDb } from './db';

interface DecodedToken {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

export async function verifyToken(event: APIGatewayProxyEvent): Promise<{ userId: string; email: string } | null> {
  try {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return null;
    }

    // Accept raw userId for dev, or JWT for prod
    if (authHeader.startsWith('Bearer ')) {
      const tokenOrId = authHeader.substring(7);
      // If it's a valid ObjectId, treat as userId (dev mode)
      if (/^[a-f\d]{24}$/i.test(tokenOrId)) {
        return { userId: tokenOrId, email: '' };
      }
      // Otherwise, treat as JWT (prod)
      try {
        const decoded = jwt.verify(tokenOrId, process.env.JWT_SECRET || 'fallback-secret') as DecodedToken;
        
        const db = await getDb();
        const user = await db.collection('users').findOne(
          { _id: new ObjectId(decoded.userId) },
          { projection: { password: 0 } }
        );

        if (!user) {
          return null;
        }

        return {
          userId: decoded.userId,
          email: decoded.email
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  );
} 