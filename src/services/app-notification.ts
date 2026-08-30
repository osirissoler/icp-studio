import { Notify, type QNotifyCreateOptions } from 'quasar';

export type AppNotificationType = 'positive' | 'negative' | 'warning' | 'info';

const colors: Record<AppNotificationType, string> = {
  positive: 'blue-grey-9',
  negative: 'red-9',
  warning: 'orange-9',
  info: 'blue-grey-9',
};

export function showAppNotification(
  message: string,
  type: AppNotificationType = 'info',
  icon = 'info',
  options: Partial<QNotifyCreateOptions> = {},
): void {
  Notify.create({
    message,
    icon,
    position: 'bottom-right',
    color: colors[type],
    textColor: 'white',
    timeout: 2800,
    progress: true,
    actions: [{ icon: 'close', color: 'white', round: true }],
    ...options,
  });
}
