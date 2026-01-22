import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Payment } from '../models/Payment';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { AuthRequest } from '../middleware/auth';

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

const razor = new Razorpay({ key_id: key_id || '', key_secret: key_secret || '' });

const PLANS: Record<string, { price: number; currency?: string; period?: string }> = {
  free: { price: 0, currency: process.env.RAZORPAY_CURRENCY || 'INR', period: 'forever' },
  premium: { price: 99, currency: process.env.RAZORPAY_CURRENCY || 'INR', period: 'year' },
};

export async function getPricing(_req: Request, res: Response) {
  // Two tiers: free and premium (yearly 99 INR)
  const plans = Object.keys(PLANS).map((id) => ({ id, name: id === 'free' ? 'Free' : 'Premium', price: PLANS[id].price, currency: PLANS[id].currency, period: PLANS[id].period, features: id === 'free' ? ['Basic search', 'Apply to jobs'] : ['All Free features', 'Priority listing', 'Premium support', 'Increased visibility'] }));
  return res.json({ plans });
}

export async function createOrder(req: AuthRequest, res: Response) {
  try {
    const user = req.user as any;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { planId } = req.body || {};
    const plan = PLANS[planId] || PLANS['premium'];

    // amount in paise
    const amount = Math.round((plan.price || 0) * 100);
    const currency = plan.currency || 'INR';

    // Razorpay limits receipt length to 40 characters; make a compact receipt id
    const shortReceipt = `rcpt_${String(user._id).slice(-8)}_${String(Date.now()).slice(-6)}`;
    const order = await razor.orders.create({ amount, currency, receipt: shortReceipt });
    console.log('Razorpay order created', { orderId: order.id, amount: order.amount, currency, receipt: shortReceipt });

    // persist payment record
    const payment = await Payment.create({ userId: user._id, amount, currency, razorpayOrderId: order.id, status: 'created' });

    return res.json({ ok: true, order: { id: order.id, amount: order.amount, currency }, key: key_id });
  } catch (err: any) {
    console.error('createOrder error:', err, err?.stack || 'no-stack');
    // if Razorpay library returned response object, try to forward its message
    const message = err?.message || (err?.error && JSON.stringify(err.error)) || String(err);
    return res.status(500).json({ error: message });
  }
}

export async function verifyPayment(req: AuthRequest, res: Response) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return res.status(400).json({ error: 'Missing fields' });

    // verify signature using key_secret
    const hmac = crypto.createHmac('sha256', key_secret || '');
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const expected = hmac.digest('hex');

    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });

    // find payment and ensure it belongs to requesting user
    const user = req.user as any;
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    if (!user || String(payment.userId) !== String(user._id)) return res.status(403).json({ error: 'Payment does not belong to user' });

    if (payment.status === 'paid') return res.json({ ok: true, message: 'Already verified', expiresAt: await Subscription.findOne({ userId: payment.userId, active: true }).then(s => s?.expiresAt) });

    // mark paid and store payment id/signature
    payment.razorpayPaymentId = razorpay_payment_id;
    payment.razorpaySignature = razorpay_signature;
    payment.status = 'paid';
    await payment.save();

    // create subscription for 1 year
    const start = new Date();
    const expires = new Date(start);
    expires.setFullYear(expires.getFullYear() + 1);

    // avoid duplicate subscriptions
    const existing = await Subscription.findOne({ userId: payment.userId, active: true });
    if (!existing) {
      await Subscription.create({ userId: payment.userId, plan: 'premium', startDate: start, expiresAt: expires, active: true });
    }

    // upgrade user tier
    await User.findByIdAndUpdate(payment.userId, { tier: 'premium' });

    return res.json({ ok: true, message: 'Payment verified, subscription active', expiresAt: expires });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
}

// webhook endpoint - verify signature and react to events (payment.captured | payment.failed)
export async function razorpayWebhook(req: Request, res: Response) {
  try {
    const body = (req as any).rawBody || JSON.stringify(req.body);
    const signature = req.headers['x-razorpay-signature'] as string | undefined;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET is not set; webhook signature verification disabled');
      return res.status(400).json({ error: 'Webhook secret not configured on server' });
    }

    if (!signature) return res.status(400).json({ error: 'Missing signature' });

    const expected = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');
    if (expected !== signature) return res.status(400).json({ error: 'Invalid webhook signature' });

    const event = req.body || {};

    const evType = event.event;
    // payment events
    if (evType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      // find payment by order or payment id
      let payment = null as any;
      if (orderId) payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment && paymentId) payment = await Payment.findOne({ razorpayPaymentId: paymentId });

      if (payment) {
        payment.razorpayPaymentId = paymentId || payment.razorpayPaymentId;
        payment.status = 'paid';
        await payment.save();

        // create subscription if none
        const existing = await Subscription.findOne({ userId: payment.userId, active: true });
        if (!existing) {
          const start = new Date();
          const expires = new Date(start);
          expires.setFullYear(expires.getFullYear() + 1);
          await Subscription.create({ userId: payment.userId, plan: 'premium', startDate: start, expiresAt: expires, active: true });
          await User.findByIdAndUpdate(payment.userId, { tier: 'premium' });
        }
      }
    } else if (evType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      let payment = null as any;
      if (orderId) payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment && paymentId) payment = await Payment.findOne({ razorpayPaymentId: paymentId });
      if (payment) {
        payment.status = 'failed';
        await payment.save();
      }
    }

    // acknowledge
    return res.json({ ok: true });
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).json({ error: String(err) });
  }
}