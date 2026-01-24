import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import {
  streamEvents,
  broadcastNotificationHandler,
  sendNotificationToUserHandler,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notification.controller';

const router = Router();

// All routes require authentication
router.use(authenticate);

// SSE stream endpoint
router.get('/stream', streamEvents);

// Send notifications
router.post('/broadcast', broadcastNotificationHandler);
router.post('/users/:userId', sendNotificationToUserHandler);

// Notification management
router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);
router.patch('/read-all', markAllAsRead);
router.delete('/:id', deleteNotification);

export default router;
