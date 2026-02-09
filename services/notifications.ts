import { Logger } from './logger';

import type { ClinicianNotification } from '../types';

export class NotificationService {
  private static instance: NotificationService;
  private notifications: ClinicianNotification[] = [];
  private listeners = new Set<(_notification: ClinicianNotification) => void>();

  static getInstance(): NotificationService {
    NotificationService.instance ??= new NotificationService();
    return NotificationService.instance;
  }

  async sendCriticalAlert(params: {
    analysisId: string;
    triggerReason: string;
    diagnosis?: string | undefined;
    riskLevel?: string | undefined;
    patientId?: string | undefined;
  }): Promise<ClinicianNotification> {
    const notification: ClinicianNotification = {
      id: 'notif_' + Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
      safetyLevel: 'HIGH',
      analysisId: params.analysisId,
      patientId: params.patientId,
      triggerReason: params.triggerReason,
      diagnosis: params.diagnosis,
      riskLevel: params.riskLevel as 'Low' | 'Medium' | 'High' | undefined,
      actions: [],
      status: 'pending',
    };

    this.notifications.push(notification);

    Logger.error('ClinicianNotification', 'CRITICAL_ALERT', {
      notificationId: notification.id,
      analysisId: params.analysisId,
      triggerReason: params.triggerReason,
    });

    this.listeners.forEach((listener) => {
      listener(notification);
    });

    try {
      const agentDB = await import('./agentDB');
      const dbInstance = agentDB.default?.getInstance?.();
      if (dbInstance?.logAuditEvent != null) {
        await dbInstance.logAuditEvent({
          type: 'CRITICAL_ALERT',
          hash: notification.id, // Use notification ID as hash for simplicity
          prev_hash: '',
          agent_trace: [],
          safety_level: 'HIGH',
          notificationId: notification.id,
          ...params,
        });
      }
    } catch (error) {
      Logger.warn('ClinicianNotification', 'Audit log unavailable', { error });
    }

    return notification;
  }

  acknowledgeNotification(
    notificationId: string,
    clinicianId: string,
    notes?: string | undefined,
  ): void {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.status = 'acknowledged';
      notification.actions.push({
        type: 'review',
        timestamp: Date.now(),
        clinicianId,
        notes,
      });
    }
  }

  getPendingNotifications(): ClinicianNotification[] {
    return this.notifications.filter((n) => n.status === 'pending');
  }

  onNotification(listener: (_n: ClinicianNotification) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
