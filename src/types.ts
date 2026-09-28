export interface UserProfile {
  id: string;
  displayName: string;
  username: string;
  phoneNumber: string;
  email?: string;
  avatarUrl: string;
  bio: string;
  isPremium: boolean;
  starsBalance: number;
  loginMethod: 'phone' | 'google';
}

export interface Story {
  id: string;
  userId: string;
  authorName: string;
  authorUsername: string;
  authorAvatar: string;
  isAuthorPremium: boolean;
  imageUrl: string;
  caption: string;
  timestamp: number; // Unix timestamp
  dayOfWeek: string; // "Monday", "Tuesday", etc.
  weekIdentifier: string; // e.g., "2026-W40"
  viewsCount: number;
  likesCount: number;
  hasLiked?: boolean;
}

export type ChatType = 'direct' | 'group' | 'channel' | 'saved';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  imageUrl?: string;
  isVoice?: boolean;
  voiceDuration?: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  viewsCount?: number;
}

export interface ChatItem {
  id: string;
  type: ChatType;
  title: string;
  username?: string;
  avatarUrl: string;
  avatarColor?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeen?: string;
  isPublic?: boolean;
  inviteLink?: string;
  membersCount?: number;
  description?: string;
  unreadCount: number;
  isPinned?: boolean;
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
  };
}
