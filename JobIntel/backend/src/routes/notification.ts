import { Router } from "express";
import { sendNotification } from "../controllers/notificationController";
import { authenticateToken, requireRole } from "../middleware/auth";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || undefined;

const router = Router();

// Only admin can trigger bulk notifications for jobs
router.post("/send", authenticateToken, requireRole('admin'), sendNotification);
// Preview recipients without enqueuing
// router.post('/preview', authenticateToken, requireRole('admin'), previewNotification);

// Server-Sent Events stream for realtime notifications
router.get('/stream', async (req, res) => {
	try {
		console.log('[NotificationStream] Client connected');
		
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for SSE
		
		if (res.flushHeaders) {
			res.flushHeaders();
		}

		const channels = ['realtime:notifications', 'realtime:applications', 'realtime:users'];

		if (!REDIS_URL) {
			console.log('[NotificationStream] Redis not configured, using ping fallback');
			// Redis not configured: keep the SSE connection alive with pings
			const iv = setInterval(() => {
				try { 
					res.write(': ping\n\n');
					console.log('[NotificationStream] Sent ping');
				} catch (e) { 
					console.error('[NotificationStream] Error writing ping:', e);
					clearInterval(iv);
				}
			}, 15000);

			req.on('close', () => {
				console.log('[NotificationStream] Client disconnected (no Redis)');
				clearInterval(iv);
			});

			return;
		}

		let sub: IORedis | null = null;
		try {
			console.log('[NotificationStream] Connecting to Redis:', REDIS_URL);
			sub = new IORedis(REDIS_URL);
			
			sub.on('error', (e) => {
				console.error('[NotificationStream] Redis subscriber error:', e?.message || e);
			});

			const onMessage = (_chan: string, message: string) => {
				try {
					console.log(`[NotificationStream] Message received from ${_chan}`);
					res.write(`data: ${message}\n\n`);
				} catch (err) {
					console.error('[NotificationStream] Error writing message:', err);
				}
			};

			await sub.subscribe(...channels);
			console.log('[NotificationStream] Subscribed to channels:', channels);
			
			sub.on('message', onMessage);

			req.on('close', () => {
				console.log('[NotificationStream] Client disconnected');
				if (sub) {
					sub.removeListener('message', onMessage);
					sub.unsubscribe(...channels).finally(() => {
						if (sub) {
							sub.disconnect();
						}
					});
				}
			});
		} catch (e) {
			console.error('[NotificationStream] Failed to setup Redis subscriber:', e?.message || e);
			// Fall back to periodic pings to keep connection alive
			const iv = setInterval(() => { 
				try { 
					res.write(': ping\n\n');
				} catch (err) { 
					console.error('[NotificationStream] Error writing fallback ping:', err);
					clearInterval(iv);
				}
			}, 15000);
			
			req.on('close', () => {
				console.log('[NotificationStream] Client disconnected (Redis error)');
				clearInterval(iv);
			});
		}
	} catch (error) {
		console.error('[NotificationStream] Unhandled error:', error);
		if (!res.headersSent) {
			res.status(500).json({ error: 'Internal server error' });
		} else {
			res.end();
		}
	}
});

export default router;
