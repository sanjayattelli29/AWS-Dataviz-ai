import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

export const datasetsRoutes = async (
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

    // Handle different dataset routes
    if (relativePath === '' && method === 'GET') {
      return await handleGetDatasets(event, user.userId);
    } else if (relativePath === '' && method === 'POST') {
      return await handleCreateDataset(event, user.userId);
    } else if (relativePath === '' && method === 'PUT') {
      return await handleUpdateDataset(event, user.userId);
    } else if (relativePath.startsWith('/') && method === 'DELETE') {
      const datasetId = relativePath.substring(1);
      return await handleDeleteDataset(datasetId, user.userId);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Dataset route not found' })
      };
    }
  } catch (error) {
    console.error('Dataset route error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleGetDatasets(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    
    const datasets = await db.collection('datasets')
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();
    
    return {
      statusCode: 200,
      body: JSON.stringify(datasets.map(dataset => ({
        ...dataset,
        _id: dataset._id.toString(),
        userId: dataset.userId.toString()
      })))
    };
  } catch (error) {
    console.error('Error fetching datasets:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch datasets' })
    };
  }
}

async function handleCreateDataset(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { name, columns, data } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dataset name is required' })
      };
    }

    if (!Array.isArray(columns) || columns.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dataset must have at least one column' })
      };
    }

    if (!Array.isArray(data) || data.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dataset must have at least one row of data' })
      };
    }

    // Validate data size (optional - adjust limit as needed)
    const dataSize = JSON.stringify(data).length;
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (dataSize > MAX_SIZE) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dataset is too large. Please reduce the size or contact support.' })
      };
    }

    const db = await getDb();
    
    // Create the dataset document
    const dataset = {
      name,
      columns,
      data,
      userId: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert the dataset
    const result = await db.collection('datasets').insertOne(dataset);

    if (!result.insertedId) {
      throw new Error('Failed to create dataset');
    }

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Dataset created successfully',
        datasetId: result.insertedId.toString()
      })
    };
  } catch (error) {
    console.error('Error creating dataset:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create dataset' })
    };
  }
}

async function handleUpdateDataset(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { datasetId, operations } = body;

    if (!datasetId || !operations) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Dataset ID and operations are required' })
      };
    }

    const db = await getDb();
    
    // Find the dataset
    const dataset = await db.collection('datasets').findOne({
      _id: new ObjectId(datasetId),
      userId: new ObjectId(userId)
    });

    if (!dataset) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Dataset not found' })
      };
    }

    // Process the data based on operations
    let processedData = [...dataset.data];
    let processedColumns = [...dataset.columns];

    for (const operation of operations) {
      switch (operation.type) {
        case 'removeColumn':
          processedColumns = processedColumns.filter(col => col.name !== operation.column);
          processedData = processedData.map(row => {
            const newRow = { ...row };
            delete newRow[operation.column];
            return newRow;
          });
          break;

        case 'renameColumn':
          processedColumns = processedColumns.map(col =>
            col.name === operation.oldName ? { ...col, name: operation.newName } : col
          );
          processedData = processedData.map(row => {
            const newRow = { ...row };
            if (operation.oldName in newRow) {
              newRow[operation.newName] = newRow[operation.oldName];
              delete newRow[operation.oldName];
            }
            return newRow;
          });
          break;

        case 'fillNulls':
          processedData = processedData.map(row => ({
            ...row,
            [operation.column]: row[operation.column] ?? operation.value
          }));
          break;

        // Add more preprocessing operations as needed
      }
    }

    // Update the dataset with processed data
    const result = await db.collection('datasets').updateOne(
      { _id: new ObjectId(datasetId) },
      { 
        $set: { 
          data: processedData,
          columns: processedColumns,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Failed to update dataset');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Dataset updated successfully',
        columns: processedColumns,
        data: processedData
      })
    };
  } catch (error) {
    console.error('Error updating dataset:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update dataset' })
    };
  }
}

async function handleDeleteDataset(datasetId: string, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    
    const result = await db.collection('datasets').deleteOne({
      _id: new ObjectId(datasetId),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Dataset not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Dataset deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting dataset:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete dataset' })
    };
  }
} 