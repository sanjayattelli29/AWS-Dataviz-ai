import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

export const metricsRoutes = async (
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

    // Handle different metrics routes
    if (relativePath === '/save' && method === 'POST') {
      return await handleSaveMetrics(event, user.userId);
    } else if (relativePath === '/get' && method === 'GET') {
      return await handleGetMetrics(event, user.userId);
    } else if (relativePath === '/history' && method === 'GET') {
      return await handleGetMetricsHistory(event, user.userId);
    } else if (relativePath === '/list-datasets' && method === 'GET') {
      return await handleListDatasets(event, user.userId);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Metrics route not found' })
      };
    }
  } catch (error) {
    console.error('Metrics route error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleSaveMetrics(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    console.log('handleSaveMetrics called with userId:', userId);
    console.log('Event body:', event.body);
    
    const body = JSON.parse(event.body || '{}');
    const { datasetId, metrics, timestamp } = body;

    console.log('Parsed body:', { datasetId, metrics: Object.keys(metrics || {}), timestamp });

    if (!datasetId || !metrics) {
      console.log('Missing required fields:', { datasetId: !!datasetId, metrics: !!metrics });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const db = await getDb();
    console.log('Connected to database successfully');
    
    const result = await db.collection('user_metrics_cache').updateOne(
      { userId, datasetId },
      {
        $set: {
          userId,
          datasetId,
          metrics,
          timestamp: timestamp || new Date().toISOString(),
          updatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    console.log('Database operation result:', result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Metrics saved successfully',
        metricId: result.upsertedId?.toString()
      })
    };
  } catch (error) {
    console.error('Error in handleSaveMetrics:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to save metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}

async function handleGetMetrics(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const datasetId = event.queryStringParameters?.datasetId;
    
    if (!datasetId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dataset ID is required' })
      };
    }

    const db = await getDb();
    const metrics = await db.collection('user_metrics_cache').findOne({
      userId,
      datasetId
    });

    if (!metrics) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Metrics not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(metrics)
    };
  } catch (error) {
    console.error('Error getting metrics:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get metrics' })
    };
  }
}

async function handleGetMetricsHistory(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const history = await db.collection('user_metrics_cache')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(history)
    };
  } catch (error) {
    console.error('Error getting metrics history:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to get metrics history' })
    };
  }
}

async function handleListDatasets(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const datasets = await db.collection('datasets')
      .find({ userId: new ObjectId(userId) })
      .project({ _id: 1, name: 1, createdAt: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(datasets.map(dataset => ({
        id: dataset._id.toString(),
        name: dataset.name,
        createdAt: dataset.createdAt
      })))
    };
  } catch (error) {
    console.error('Error listing datasets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to list datasets' })
    };
  }
} 