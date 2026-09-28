import { UserProfile, Story, ChatItem, ChatMessage } from './types';

const STORAGE_KEYS = {
  USER: 'tg_user_profile',
  STORIES: 'tg_stories_data',
  CHATS: 'tg_chats_data',
  MESSAGES: 'tg_messages_data',
  THEME: 'tg_theme_preference',
  ACTIVE_CHAT: 'tg_active_chat_id',
};

// Helper to get current week identifier: e.g. "2026-W40"
export function getWeekIdentifier(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function getCurrentDayName(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

// Default Seed User
const DEFAULT_USER: UserProfile = {
  id: 'user_self',
  displayName: 'Alex Rivers',
  username: 'alex_rivers',
  phoneNumber: '+1 555 019 2834',
  email: 'alex.rivers@nexchat.org',
  avatarUrl: '', // generated initials or custom
  bio: 'Product Designer & Tech Explorer 🚀 Building NexChat web experiences.',
  isPremium: false,
  starsBalance: 15, // Starts with 15 Stars so user can test purchasing Premium (10 Stars) right away!
  loginMethod: 'phone',
};

// Default Seed Stories
const DEFAULT_STORIES: Story[] = [
  {
    id: 'story_durov',
    userId: 'user_durov',
    authorName: 'Pavel Durov',
    authorUsername: 'durov',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    isAuthorPremium: true,
    imageUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=900&q=80',
    caption: 'NexChat Web update is live. Enjoy lightning fast messaging and Star rewards! ⚡',
    timestamp: Date.now() - 3600 * 1000 * 3,
    dayOfWeek: 'Monday',
    weekIdentifier: getWeekIdentifier(),
    viewsCount: 142000,
    likesCount: 9840,
  },
  {
    id: 'story_elena',
    userId: 'user_elena',
    authorName: 'Elena Rostova',
    authorUsername: 'elena_design',
    authorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    isAuthorPremium: true,
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=900&q=80',
    caption: 'Sunset sketch session from the rooftop terrace 🎨✨',
    timestamp: Date.now() - 3600 * 1000 * 6,
    dayOfWeek: 'Tuesday',
    weekIdentifier: getWeekIdentifier(),
    viewsCount: 4210,
    likesCount: 312,
  },
  {
    id: 'story_news',
    userId: 'user_news',
    authorName: 'NexChat Official',
    authorUsername: 'nexchat',
    authorAvatar: '',
    isAuthorPremium: true,
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=80',
    caption: 'Major update: NexChat Stars can now be used to unlock Premium perks and support creators!',
    timestamp: Date.now() - 3600 * 1000 * 12,
    dayOfWeek: 'Wednesday',
    weekIdentifier: getWeekIdentifier(),
    viewsCount: 890000,
    likesCount: 54100,
  },
];

// Default Seed Chats
const DEFAULT_CHATS: ChatItem[] = [
  {
    id: 'chat_saved',
    type: 'saved',
    title: 'Saved Messages',
    avatarUrl: '',
    unreadCount: 0,
    isPinned: true,
    lastMessage: {
      text: 'Note to self: explore NexChat Stars integration 🌟',
      timestamp: Date.now() - 1000 * 60 * 15,
      senderId: 'user_self',
    },
  },
  {
    id: 'chat_durov',
    type: 'direct',
    title: 'Pavel Durov',
    username: 'durov',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    isVerified: true,
    isOnline: true,
    unreadCount: 1,
    isPinned: true,
    description: 'Founder & Tech Leader',
    lastMessage: {
      text: 'Freedom and privacy are not negotiable.',
      timestamp: Date.now() - 1000 * 60 * 45,
      senderId: 'user_durov',
    },
  },
  {
    id: 'chat_elena',
    type: 'direct',
    title: 'Elena Rostova',
    username: 'elena_design',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    isOnline: true,
    unreadCount: 2,
    description: 'Senior UI/UX Designer & Motion enthusiast.',
    lastMessage: {
      text: 'Have you checked out the new story posting limits? 4 days vs 7 days for Premium is super neat!',
      timestamp: Date.now() - 1000 * 60 * 120,
      senderId: 'user_elena',
    },
  },
  {
    id: 'chat_news',
    type: 'channel',
    title: 'NexChat Official News',
    username: 'nexchat',
    avatarUrl: '',
    isVerified: true,
    isPublic: true,
    membersCount: 8450000,
    description: 'Official announcements and feature releases from NexChat Messenger.',
    unreadCount: 0,
    lastMessage: {
      text: '⭐ Introducing NexChat Stars: Send gifts, unlock Premium privileges, and empower communities.',
      timestamp: Date.now() - 1000 * 3600 * 5,
      senderId: 'chat_news',
    },
  },
  {
    id: 'chat_crypto_group',
    type: 'group',
    title: 'Frontend & Web3 Builders',
    avatarUrl: '',
    isPublic: true,
    inviteLink: 'https://t.me/web3_builders',
    membersCount: 12480,
    description: 'Global community for web developers, designers, and open-source creators.',
    unreadCount: 5,
    lastMessage: {
      text: 'Alex: Vanilla JS DOM performance feels like lightning compared to heavy bundles!',
      timestamp: Date.now() - 1000 * 3600 * 2,
      senderId: 'user_member',
    },
  },
];

// Default Seed Messages
const DEFAULT_MESSAGES: Record<string, ChatMessage[]> = {
  chat_saved: [
    {
      id: 'msg_s1',
      chatId: 'chat_saved',
      senderId: 'user_self',
      senderName: 'Alex Rivers',
      senderAvatar: '',
      text: 'Saved link: https://nexchat.org/blog/stories-for-all',
      timestamp: Date.now() - 1000 * 3600 * 24,
      status: 'read',
    },
    {
      id: 'msg_s2',
      chatId: 'chat_saved',
      senderId: 'user_self',
      senderName: 'Alex Rivers',
      senderAvatar: '',
      text: 'Note to self: explore NexChat Stars integration 🌟',
      timestamp: Date.now() - 1000 * 60 * 15,
      status: 'read',
    },
  ],
  chat_durov: [
    {
      id: 'msg_d1',
      chatId: 'chat_durov',
      senderId: 'user_durov',
      senderName: 'Pavel Durov',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      text: 'Hello Alex! Welcome to NexChat.',
      timestamp: Date.now() - 1000 * 3600 * 2,
      status: 'read',
    },
    {
      id: 'msg_d2',
      chatId: 'chat_durov',
      senderId: 'user_self',
      senderName: 'Alex Rivers',
      senderAvatar: '',
      text: 'Thank you Pavel! Really impressed by the fluid performance and Stories feature.',
      timestamp: Date.now() - 1000 * 3600 * 1,
      status: 'read',
    },
    {
      id: 'msg_d3',
      chatId: 'chat_durov',
      senderId: 'user_durov',
      senderName: 'Pavel Durov',
      senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
      text: 'Freedom and privacy are not negotiable.',
      timestamp: Date.now() - 1000 * 60 * 45,
      status: 'delivered',
    },
  ],
  chat_elena: [
    {
      id: 'msg_e1',
      chatId: 'chat_elena',
      senderId: 'user_elena',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      text: 'Hey Alex! Did you manage to test the Star system?',
      timestamp: Date.now() - 1000 * 3600 * 3,
      status: 'read',
    },
    {
      id: 'msg_e2',
      chatId: 'chat_elena',
      senderId: 'user_self',
      senderName: 'Alex Rivers',
      senderAvatar: '',
      text: 'Yes! You can get 10 Stars and upgrade to Premium to post stories every day.',
      timestamp: Date.now() - 1000 * 3600 * 2,
      status: 'read',
    },
    {
      id: 'msg_e3',
      chatId: 'chat_elena',
      senderId: 'user_elena',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
      text: 'Have you checked out the new story posting limits? 4 days vs 7 days for Premium is super neat!',
      timestamp: Date.now() - 1000 * 60 * 120,
      status: 'read',
    },
  ],
  chat_news: [
    {
      id: 'msg_n1',
      chatId: 'chat_news',
      senderId: 'chat_news',
      senderName: 'NexChat Official News',
      senderAvatar: '',
      text: '⭐ Introducing NexChat Stars: Send gifts, unlock Premium privileges, and empower communities.',
      timestamp: Date.now() - 1000 * 3600 * 5,
      status: 'read',
      viewsCount: 382000,
    },
  ],
  chat_crypto_group: [
    {
      id: 'msg_g1',
      chatId: 'chat_crypto_group',
      senderId: 'user_member',
      senderName: 'Marcus Dev',
      senderAvatar: '',
      text: 'Anyone working on NexChat Web Mini Apps?',
      timestamp: Date.now() - 1000 * 3600 * 3,
      status: 'read',
    },
    {
      id: 'msg_g2',
      chatId: 'chat_crypto_group',
      senderId: 'user_member2',
      senderName: 'Alex Chen',
      senderAvatar: '',
      text: 'Alex: Vanilla JS DOM performance feels like lightning compared to heavy bundles!',
      timestamp: Date.now() - 1000 * 3600 * 2,
      status: 'read',
    },
  ],
};

export class AppStorage {
  // User Profile
  static getUser(): UserProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    this.saveUser(DEFAULT_USER);
    return { ...DEFAULT_USER };
  }

  static saveUser(user: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  }

  static updateUser(updates: Partial<UserProfile>): UserProfile {
    const current = this.getUser();
    const updated = { ...current, ...updates };
    this.saveUser(updated);
    return updated;
  }

  // Star & Premium System
  static purchaseStars(amount: number): UserProfile {
    const user = this.getUser();
    user.starsBalance += amount;
    this.saveUser(user);
    return user;
  }

  static togglePremium(): { success: boolean; message: string; user: UserProfile } {
    const user = this.getUser();
    if (user.isPremium) {
      // Toggle off for testing flexibility
      user.isPremium = false;
      this.saveUser(user);
      return { success: true, message: 'NexChat Premium deactivated.', user };
    }

    const PREMIUM_COST = 10;
    if (user.starsBalance < PREMIUM_COST) {
      return {
        success: false,
        message: `Insufficient Stars! You have ${user.starsBalance} Stars, but 10 Stars are required for NexChat Premium.`,
        user,
      };
    }

    user.starsBalance -= PREMIUM_COST;
    user.isPremium = true;
    this.saveUser(user);
    return {
      success: true,
      message: 'Congratulations! You unlocked NexChat Premium with 10 Stars! ⭐ You can now post stories all 7 days of the week.',
      user,
    };
  }

  // Stories
  static getStories(): Story[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STORIES);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    this.saveStories(DEFAULT_STORIES);
    return [...DEFAULT_STORIES];
  }

  static saveStories(stories: Story[]): void {
    localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
  }

  /**
   * Check story posting eligibility for the current user:
   * - Non-Premium (Free): Max 4 distinct days per week
   * - Premium: Unrestricted (all 7 days)
   */
  static getStoryEligibility(proposedDay = getCurrentDayName()): {
    canPost: boolean;
    reason?: string;
    isPremium: boolean;
    daysUsedThisWeek: number;
    daysList: string[];
    maxDaysAllowed: number;
  } {
    const user = this.getUser();
    const currentWeek = getWeekIdentifier();
    const stories = this.getStories();

    // Get all user's stories for the current week
    const userWeekStories = stories.filter(
      (s) => s.userId === user.id && s.weekIdentifier === currentWeek
    );

    // Set of distinct days already posted this week
    const postedDaysSet = new Set<string>(userWeekStories.map((s) => s.dayOfWeek));
    const alreadyPostedOnProposedDay = postedDaysSet.has(proposedDay);

    if (user.isPremium) {
      return {
        canPost: true,
        isPremium: true,
        daysUsedThisWeek: postedDaysSet.size,
        daysList: Array.from(postedDaysSet),
        maxDaysAllowed: 7,
      };
    }

    // Free tier: max 4 distinct days
    const maxDaysAllowed = 4;
    const daysUsed = postedDaysSet.size;

    if (alreadyPostedOnProposedDay) {
      // Already posted today, posting an additional story on the same day is permitted within the 4-day budget
      return {
        canPost: true,
        isPremium: false,
        daysUsedThisWeek: daysUsed,
        daysList: Array.from(postedDaysSet),
        maxDaysAllowed,
      };
    }

    if (daysUsed >= maxDaysAllowed) {
      return {
        canPost: false,
        reason: `Weekly Limit Reached: Free accounts are restricted to posting stories on at most 4 days per week (${daysUsed}/4 days used this week: ${Array.from(postedDaysSet).join(', ')}). Upgrade to NexChat Premium for 10 Stars to post stories all 7 days!`,
        isPremium: false,
        daysUsedThisWeek: daysUsed,
        daysList: Array.from(postedDaysSet),
        maxDaysAllowed,
      };
    }

    return {
      canPost: true,
      isPremium: false,
      daysUsedThisWeek: daysUsed,
      daysList: Array.from(postedDaysSet),
      maxDaysAllowed,
    };
  }

  static addStory(storyData: {
    imageUrl: string;
    caption: string;
    dayOfWeek?: string;
  }): { success: boolean; story?: Story; message?: string } {
    const day = storyData.dayOfWeek || getCurrentDayName();
    const eligibility = this.getStoryEligibility(day);

    if (!eligibility.canPost) {
      return {
        success: false,
        message: eligibility.reason,
      };
    }

    const user = this.getUser();
    const stories = this.getStories();
    const newStory: Story = {
      id: `story_${Date.now()}`,
      userId: user.id,
      authorName: user.displayName,
      authorUsername: user.username,
      authorAvatar: user.avatarUrl,
      isAuthorPremium: user.isPremium,
      imageUrl: storyData.imageUrl,
      caption: storyData.caption,
      timestamp: Date.now(),
      dayOfWeek: day,
      weekIdentifier: getWeekIdentifier(),
      viewsCount: 1,
      likesCount: 0,
    };

    stories.unshift(newStory);
    this.saveStories(stories);
    return { success: true, story: newStory };
  }

  // Chats
  static getChats(): ChatItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CHATS);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    this.saveChats(DEFAULT_CHATS);
    return [...DEFAULT_CHATS];
  }

  static saveChats(chats: ChatItem[]): void {
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(chats));
  }

  static addChat(chat: ChatItem): void {
    const chats = this.getChats();
    chats.unshift(chat);
    this.saveChats(chats);
  }

  // Messages
  static getMessages(): Record<string, ChatMessage[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // fallback
    }
    this.saveMessages(DEFAULT_MESSAGES);
    return { ...DEFAULT_MESSAGES };
  }

  static saveMessages(messages: Record<string, ChatMessage[]>): void {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
  }

  static getChatMessages(chatId: string): ChatMessage[] {
    const all = this.getMessages();
    return all[chatId] || [];
  }

  static addMessage(message: ChatMessage): void {
    const all = this.getMessages();
    if (!all[message.chatId]) {
      all[message.chatId] = [];
    }
    all[message.chatId].push(message);
    this.saveMessages(all);

    // Update last message in chat list
    const chats = this.getChats();
    const chatIndex = chats.findIndex((c) => c.id === message.chatId);
    if (chatIndex !== -1) {
      chats[chatIndex].lastMessage = {
        text: message.isVoice ? '🎤 Voice message' : (message.imageUrl ? '📷 Photo' : message.text),
        timestamp: message.timestamp,
        senderId: message.senderId,
      };
      // Move chat to top
      const [chat] = chats.splice(chatIndex, 1);
      chats.unshift(chat);
      this.saveChats(chats);
    }
  }

  // Active Chat ID
  static getActiveChatId(): string {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT) || 'chat_durov';
  }

  static setActiveChatId(chatId: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT, chatId);
  }

  // Theme
  static getTheme(): 'dark' | 'light' {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as 'dark' | 'light') || 'dark';
  }

  static setTheme(theme: 'dark' | 'light'): void {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  }
}
