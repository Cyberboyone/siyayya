import { useFCM } from '@/hooks/useFCM';

export function NotificationBootstrap() {
  useFCM();
  return null;
}
