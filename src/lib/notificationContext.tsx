import { createContext, useContext } from 'react';

export type NotifyType = 'info' | 'success' | 'warning';

export type ShowNotificationFn = (
  title: string,
  message: string,
  type?: NotifyType,
  options?: { onUndo?: () => void }
) => void;

export const NotificationContext = createContext<{ showNotification: ShowNotificationFn } | null>(null);

export const useNotification = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationContext.Provider');
  return ctx;
};

export default NotificationContext;
