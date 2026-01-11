import React, { useState, useEffect } from 'react';
import { Bell, Check, AlertTriangle, AlertCircle } from 'lucide-react';
import type { ClinicianNotification, SafetyLevel } from '../types';
import { NotificationService } from '../services/notifications';

interface NotificationCenterProps {
  clinicianId: string;
}

export function NotificationCenter({ clinicianId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<ClinicianNotification[]>([]);
  const [notificationService, setNotificationService] = useState<NotificationService | null>(null);

  useEffect(() => {
    const init = async () => {
      const { NotificationService } = await import('../services/notifications');
      const service = NotificationService.getInstance();
      setNotificationService(service);

      const unsubscribe = service.onNotification((n: ClinicianNotification) => {
        setNotifications(prev => [n, ...prev]);
      });

      setNotifications(service.getPendingNotifications());

      return unsubscribe;
    };

    init();
  }, []);

  const handleAcknowledge = async (notificationId: string) => {
    if (notificationService) {
      await notificationService.acknowledgeNotification(notificationId, clinicianId, 'Reviewed');
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
  };

  const getSafetyIcon = (level: SafetyLevel) => {
    switch (level) {
      case 'HIGH':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertClass = (level: SafetyLevel) => {
    switch (level) {
      case 'HIGH':
        return 'bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'bg-amber-50 border-amber-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="p-4 bg-white border border-stone-200 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-stone-600" />
        <h3 className="text-sm font-bold text-stone-800">Clinician Notifications</h3>
        {notifications.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {notifications.length}
          </span>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-xs text-stone-500">No pending notifications</p>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`p-3 border rounded-xl ${getAlertClass(n.safetyLevel)}`}
            >
              <div className="flex items-start gap-3">
                {getSafetyIcon(n.safetyLevel)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold ${
                      n.safetyLevel === 'HIGH' ? 'text-red-700' :
                      n.safetyLevel === 'MEDIUM' ? 'text-amber-700' : 'text-blue-700'
                    }`}>
                      {n.safetyLevel}
                    </span>
                    <span className="text-[10px] text-stone-500">
                      {new Date(n.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-stone-800 mb-2">{n.triggerReason}</p>
                  {n.diagnosis && (
                    <p className="text-xs text-stone-600 mb-2">Diagnosis: {n.diagnosis}</p>
                  )}
                  {n.riskLevel && (
                    <p className="text-xs text-stone-600 mb-2">Risk: {n.riskLevel}</p>
                  )}
                  <button
                    onClick={() => handleAcknowledge(n.id)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-stone-600 hover:bg-stone-700 rounded-lg transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    Acknowledge
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
