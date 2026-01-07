

export enum EventStatus {
  UPCOMING = 'Mendatang',
  OPEN = 'Terbuka',
  CLOSED = 'Ditutup',
  DRAFT = 'Draft'
}

export enum EventType {
  SEMINAR = 'Seminar',
  WORKSHOP = 'Workshop',
  COMPETITION = 'Lomba',
  UKM = 'UKM',
  TECHNOLOGY = 'Teknologi',
  ART_CULTURE = 'Seni Budaya',
  AI = 'AI'
}

export interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: EventType;
  status: EventStatus;
  imageUrl: string;
  host: string;
  description: string;
  attendees: number;
  price: 'Gratis' | 'Berbayar';
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'participant';
}

export interface StatMetric {
  label: string;
  value: string | number;
  trend?: number; // percentage
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
  action_url?: string;
  created_at: string;
}