import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { ObjectId } from 'mongodb';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

export const notesRoutes = async (
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

    // Handle different notes routes
    if (relativePath === '' && method === 'GET') {
      return await handleGetNotes(event, user.email);
    } else if (relativePath === '' && method === 'POST') {
      return await handleCreateNote(event, user.email);
    } else if (relativePath.startsWith('/') && method === 'GET') {
      const noteId = relativePath.substring(1);
      return await handleGetNote(noteId, user.email);
    } else if (relativePath.startsWith('/') && method === 'PUT') {
      const noteId = relativePath.substring(1);
      return await handleUpdateNote(event, noteId, user.email);
    } else if (relativePath.startsWith('/') && method === 'DELETE') {
      const noteId = relativePath.substring(1);
      return await handleDeleteNote(noteId, user.email);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Notes route not found' })
      };
    }
  } catch (error) {
    console.error('Notes route error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleGetNotes(event: APIGatewayProxyEvent, userEmail: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const notes = await db.collection('notes')
      .find({ userId: userEmail })
      .sort({ updatedAt: -1 })
      .toArray();

    return {
      statusCode: 200,
      body: JSON.stringify(notes.map(note => ({
        ...note,
        _id: note._id.toString()
      })))
    };
  } catch (error) {
    console.error('Error fetching notes:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch notes' })
    };
  }
}

async function handleCreateNote(event: APIGatewayProxyEvent, userEmail: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { title, content, url } = body;

    if (!title?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Title is required' })
      };
    }
    if (!content?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Content is required' })
      };
    }

    const db = await getDb();
    const note = {
      userId: userEmail,
      title: title.trim(),
      content: content.trim(),
      url: url?.trim() || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('notes').insertOne(note);

    return {
      statusCode: 201,
      body: JSON.stringify({
        _id: result.insertedId.toString(),
        userId: note.userId,
        title: note.title,
        content: note.content,
        url: note.url,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt
      })
    };
  } catch (error) {
    console.error('Error creating note:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create note' })
    };
  }
}

async function handleGetNote(noteId: string, userEmail: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const note = await db.collection('notes').findOne({
      _id: new ObjectId(noteId),
      userId: userEmail
    });

    if (!note) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Note not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        ...note,
        _id: note._id.toString()
      })
    };
  } catch (error) {
    console.error('Error fetching note:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch note' })
    };
  }
}

async function handleUpdateNote(event: APIGatewayProxyEvent, noteId: string, userEmail: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { title, content, url } = body;

    if (!title?.trim() && !content?.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Title or content is required' })
      };
    }

    const db = await getDb();
    const updateData: any = { updatedAt: new Date() };
    
    if (title?.trim()) updateData.title = title.trim();
    if (content?.trim()) updateData.content = content.trim();
    if (url !== undefined) updateData.url = url?.trim() || undefined;

    const result = await db.collection('notes').updateOne(
      { _id: new ObjectId(noteId), userId: userEmail },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Note not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Note updated successfully' })
    };
  } catch (error) {
    console.error('Error updating note:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update note' })
    };
  }
}

async function handleDeleteNote(noteId: string, userEmail: string): Promise<APIGatewayProxyResult> {
  try {
    const db = await getDb();
    const result = await db.collection('notes').deleteOne({
      _id: new ObjectId(noteId),
      userId: userEmail
    });

    if (result.deletedCount === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Note not found' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Note deleted successfully' })
    };
  } catch (error) {
    console.error('Error deleting note:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to delete note' })
    };
  }
} 