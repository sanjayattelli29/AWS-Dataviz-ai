import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { authRoutes } from './routes/auth';
import { datasetsRoutes } from './routes/datasets';
import { metricsRoutes } from './routes/metrics';
import { notesRoutes } from './routes/notes';
import { paymentsRoutes } from './routes/payments';
import { profileRoutes } from './routes/profile';
import { uploadHistoryRoutes } from './routes/upload-history';
import { userRoutes } from './routes/user';
import { adminRoutes } from './routes/admin';
import { cloudinaryRoutes } from './routes/cloudinary';
import { chatProxyRoutes } from './routes/chat-proxy';
import { preprocessingRoutes } from './routes/preprocessing';

// CORS configuration
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'http://localhost:3000,https://datavizai.editwithsanjay.in',
  'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

// Route mapping
const routes = {
  '/auth': authRoutes,
  '/datasets': datasetsRoutes,
  '/metrics': metricsRoutes,
  '/notes': notesRoutes,
  '/payments': paymentsRoutes,
  '/profile': profileRoutes,
  '/upload-history': uploadHistoryRoutes,
  '/user': userRoutes,
  '/admin': adminRoutes,
  '/cloudinary': cloudinaryRoutes,
  '/chat-proxy': chatProxyRoutes,
  '/preprocessing': preprocessingRoutes
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      };
    }

    const path = event.path || '';
    const method = event.httpMethod;
    
    console.log(`Request: ${method} ${path}`);

    // Find the appropriate route handler
    let routeHandler = null;
    let routePath = '';

    for (const [route, handler] of Object.entries(routes)) {
      if (path.startsWith(route)) {
        routeHandler = handler;
        routePath = route;
        break;
      }
    }

    if (!routeHandler) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Route not found' })
      };
    }

    // Call the route handler
    const result = await routeHandler(event, context, routePath);

    // Ensure CORS headers are included in the response
    const responseHeaders = {
      ...corsHeaders,
      ...result.headers
    };

    // Ensure body is always a string
    const body = typeof result.body === 'string' ? result.body : JSON.stringify(result.body);

    return {
      statusCode: result.statusCode,
      headers: responseHeaders,
      body
    };

  } catch (error) {
    console.error('Lambda handler error:', error);
    
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}; 