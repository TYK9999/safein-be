import { z } from 'zod';

export const REALTIME_EVENTS = {
  echoQueueUpdated: 'echo.queue.updated',
  pulseStatusUpdated: 'pulse.status.updated',
  notificationCreated: 'notification.created',
  signalUpdated: 'signal.updated',
} as const;

export const echoQueueUpdatedSchema = z.object({
  tenantId: z.string().min(1),
  echoId: z.string().min(1),
  updateType: z.enum(['created', 'assigned', 'status_changed', 'closed']),
  status: z.string().min(1).optional(),
});

export const pulseStatusUpdatedSchema = z.object({
  tenantId: z.string().min(1),
  sessionId: z.string().min(1),
  status: z.string().min(1),
  stage: z.string().min(1).optional(),
});

export const notificationCreatedSchema = z.object({
  tenantId: z.string().min(1),
  notificationId: z.string().min(1),
  type: z.string().min(1),
  userId: z.string().min(1),
  title: z.string().min(1).optional(),
});

export const signalUpdatedSchema = z.object({
  tenantId: z.string().min(1),
  signalId: z.string().min(1),
  updateType: z.enum(['created', 'acknowledged', 'closed']),
});

export type EchoQueueUpdatedPayload = z.infer<typeof echoQueueUpdatedSchema>;
export type PulseStatusUpdatedPayload = z.infer<typeof pulseStatusUpdatedSchema>;
export type NotificationCreatedPayload = z.infer<typeof notificationCreatedSchema>;
export type SignalUpdatedPayload = z.infer<typeof signalUpdatedSchema>;
