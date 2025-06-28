import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import Razorpay from 'razorpay';
import { getDb } from '../utils/db';
import { verifyToken } from '../utils/auth';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

export const paymentsRoutes = async (
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

    // Handle different payment routes
    if (relativePath === '/create-order' && method === 'POST') {
      return await handleCreateOrder(event, user.userId);
    } else if (relativePath === '/confirm-payment' && method === 'POST') {
      return await handleConfirmPayment(event, user.userId);
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Payment route not found' })
      };
    }
  } catch (error) {
    console.error('Payment route error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function handleCreateOrder(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { amount, currency = 'INR', receipt } = body;

    if (!amount || !receipt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Amount and receipt are required' })
      };
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency,
      receipt,
      notes: {
        userId
      }
    };

    const order = await razorpay.orders.create(options);

    return {
      statusCode: 200,
      body: JSON.stringify({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      })
    };
  } catch (error) {
    console.error('Error creating order:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create order' })
    };
  }
}

async function handleConfirmPayment(event: APIGatewayProxyEvent, userId: string): Promise<APIGatewayProxyResult> {
  try {
    const body = JSON.parse(event.body || '{}');
    const { paymentId, orderId, signature } = body;

    if (!paymentId || !orderId || !signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Payment ID, Order ID, and signature are required' })
      };
    }

    // Verify payment signature
    const text = orderId + '|' + paymentId;
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(text)
      .digest('hex');

    if (expectedSignature !== signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid payment signature' })
      };
    }

    // Save payment details to database
    const db = await getDb();
    const payment = {
      userId,
      paymentId,
      orderId,
      amount: body.amount,
      currency: body.currency,
      status: 'completed',
      createdAt: new Date()
    };

    await db.collection('payments').insertOne(payment);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Payment confirmed successfully',
        paymentId,
        orderId
      })
    };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to confirm payment' })
    };
  }
} 