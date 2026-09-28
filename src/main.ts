import { AppStorage, DAYS_OF_WEEK, getCurrentDayName, getWeekIdentifier } from './storage';
import { sounds } from './audio';
import { ChatItem, ChatMessage, Story, UserProfile } from './types';

// DOM Utilities
const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found`);
  return el as T;
};

// Application State
let currentUser: UserProfile = AppStorage.getUser();
let chats: ChatItem[] = AppStorage.getChats();
let activeChatId: string = AppStorage.getActiveChatId();
let currentTab: string = 'all';
let searchQuery: string = '';
let attachedImageBase64: string | null = null;
let currentStoryList: Story[] = [];
let currentStoryIndex: number = 0;
let storyTimer: number | null = null;
let storyProgressStart: number = 0;
const STORY_DURATION = 5000; // 5 seconds per story

// Toast Notification
function showToast(message: string, duration = 3000) {
  const toast = $('toast');
  toast.textContent = message;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(100px)';
  }, duration);
}

// Generate color from string for avatars
function getInitialsColor(str: string): string {
  const colors = [
    'linear-gradient(135deg, #e17076, #ff88a5)',
    'linear-gradient(135deg, #faa774, #f8c057)',
    'linear-gradient(135deg, #a695e7, #7e65d8)',
    'linear-gradient(135deg, #7bc862, #4fae4e)',
    'linear-gradient(135deg, #6ec9cb, #2481cc)',
    'linear-gradient(135deg, #ee7aae, #d34a78)',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  if (!name) return 'NC';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function renderAvatar(container: HTMLElement, name: string, avatarUrl?: string, isOnline?: boolean) {
  container.innerHTML = '';
  container.style.background = getInitialsColor(name);

  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = avatarUrl;
    img.alt = name;
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      img.remove();
      container.textContent = getInitials(name);
    };
    container.appendChild(img);
  } else {
    container.textContent = getInitials(name);
  }

  if (isOnline) {
    const dot = document.createElement('span');
    dot.className = 'online-dot';
    container.appendChild(dot);
  }
}

// Format relative time (Telegram style)
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ----------------------------------------------------
// THEME CONTROLLER
// ----------------------------------------------------
function applyTheme(theme: 'dark' | 'light') {
  document.documentElement.setAttribute('data-theme', theme);
  AppStorage.setTheme(theme);
  const label = $('theme-toggle-label');
  if (label) {
    label.textContent = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }
}

function toggleTheme() {
  const current = AppStorage.getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  sounds.playPop();
  showToast(`Switched to ${next} theme`);
}

// ----------------------------------------------------
// STORIES CONTROLLER
// ----------------------------------------------------
function renderStoriesBar() {
  const container = $('stories-bar');
  container.innerHTML = '';
  const stories = AppStorage.getStories();

  // 1. "My Story" Item
  const myStoryItem = document.createElement('div');
  myStoryItem.className = 'story-item';
  myStoryItem.id = 'story-item-my';

  const myUserStories = stories.filter((s) => s.userId === currentUser.id);
  const hasMyStories = myUserStories.length > 0;

  myStoryItem.innerHTML = `
    <div class="story-ring-container ${hasMyStories ? '' : 'seen'}" style="${hasMyStories ? 'background: linear-gradient(135deg, #8b5cf6, #3b82f6);' : 'background: var(--tg-border);'}">
      <div id="my-story-avatar-slot" class="avatar" style="width: 100%; height: 100%; border: 2px solid var(--tg-bg-sidebar);"></div>
      <div class="story-my-add-btn">+</div>
    </div>
    <div class="story-name">My Story</div>
  `;

  renderAvatar(
    myStoryItem.querySelector('#my-story-avatar-slot') as HTMLElement,
    currentUser.displayName,
    currentUser.avatarUrl
  );

  myStoryItem.addEventListener('click', () => {
    sounds.playPop();
    if (hasMyStories) {
      openStoryViewer(myUserStories, 0);
    } else {
      openStoryUploadModal();
    }
  });

  container.appendChild(myStoryItem);

  // 2. Friends Stories
  // Group stories by user
  const otherStoriesByUser = new Map<string, Story[]>();
  stories.forEach((story) => {
    if (story.userId !== currentUser.id) {
      if (!otherStoriesByUser.has(story.userId)) {
        otherStoriesByUser.set(story.userId, []);
      }
      otherStoriesByUser.get(story.userId)!.push(story);
    }
  });

  otherStoriesByUser.forEach((userStories, userId) => {
    const latestStory = userStories[0];
    const storyItem = document.createElement('div');
    storyItem.className = 'story-item';
    storyItem.dataset.userId = userId;

    storyItem.innerHTML = `
      <div class="story-ring-container">
        <div class="avatar story-avatar-img" style="width: 100%; height: 100%;"></div>
      </div>
      <div class="story-name">${latestStory.authorName.split(' ')[0]}</div>
    `;

    renderAvatar(
      storyItem.querySelector('.story-avatar-img') as HTMLElement,
      latestStory.authorName,
      latestStory.authorAvatar
    );

    storyItem.addEventListener('click', () => {
      sounds.playPop();
      openStoryViewer(userStories, 0);
    });

    container.appendChild(storyItem);
  });
}

function openStoryViewer(stories: Story[], startIndex: number) {
  if (!stories.length) return;
  currentStoryList = stories;
  currentStoryIndex = startIndex;

  const modal = $('story-viewer-modal');
  modal.classList.add('open');
  loadStoryAtIndex(currentStoryIndex);
}

function loadStoryAtIndex(index: number) {
  if (index < 0 || index >= currentStoryList.length) {
    closeStoryViewer();
    return;
  }

  currentStoryIndex = index;
  const story = currentStoryList[currentStoryIndex];

  $('story-viewer-name').textContent = story.authorName;
  $('story-viewer-time').textContent = `${story.dayOfWeek} · ${formatTime(story.timestamp)}`;

  const avatar = $('story-viewer-avatar') as HTMLImageElement;
  avatar.src = story.authorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80';

  const media = $('story-viewer-media') as HTMLImageElement;
  media.src = story.imageUrl;

  const caption = $('story-viewer-caption');
  caption.textContent = story.caption || '';
  caption.style.display = story.caption ? 'block' : 'none';

  const likeIcon = $('story-like-icon');
  likeIcon.setAttribute('fill', story.hasLiked ? '#ef4444' : 'none');
  likeIcon.setAttribute('stroke', story.hasLiked ? '#ef4444' : '#ffffff');

  // Start progress bar timer
  startStoryTimer();
}

function startStoryTimer() {
  if (storyTimer) clearInterval(storyTimer);
  storyProgressStart = Date.now();
  const fill = $('story-progress-fill');
  fill.style.width = '0%';

  storyTimer = window.setInterval(() => {
    const elapsed = Date.now() - storyProgressStart;
    const percent = Math.min((elapsed / STORY_DURATION) * 100, 100);
    fill.style.width = `${percent}%`;

    if (elapsed >= STORY_DURATION) {
      if (storyTimer) clearInterval(storyTimer);
      if (currentStoryIndex + 1 < currentStoryList.length) {
        loadStoryAtIndex(currentStoryIndex + 1);
      } else {
        closeStoryViewer();
      }
    }
  }, 50);
}

function closeStoryViewer() {
  if (storyTimer) {
    clearInterval(storyTimer);
    storyTimer = null;
  }
  const modal = $('story-viewer-modal');
  modal.classList.remove('open');
}

// ----------------------------------------------------
// STORY UPLOAD & WEEKLY LIMIT ENFORCEMENT
// ----------------------------------------------------
function openStoryUploadModal() {
  const modal = $('story-upload-modal');
  modal.classList.add('open');

  // Update Quota status card
  const todayName = getCurrentDayName();
  const daySelect = $('story-day-select') as HTMLSelectElement;
  daySelect.value = todayName;

  updateStoryModalQuotaDisplay(daySelect.value);
}

function updateStoryModalQuotaDisplay(selectedDay: string) {
  const eligibility = AppStorage.getStoryEligibility(selectedDay);
  const title = $('story-quota-title');
  const badge = $('story-quota-badge');
  const desc = $('story-quota-desc');
  const alertBox = $('story-quota-alert-box');

  if (eligibility.isPremium) {
    title.textContent = '⭐ Telegram Premium Unrestricted';
    badge.textContent = 'All 7 Days Unlocked';
    badge.style.color = '#ffb703';
    desc.textContent = 'You have unlimited story posting privileges. Post every day of the week!';
    alertBox.style.background = 'rgba(139, 92, 246, 0.15)';
    alertBox.style.borderColor = 'rgba(139, 92, 246, 0.35)';
  } else {
    title.textContent = 'Free Tier Quota';
    badge.textContent = `${eligibility.daysUsedThisWeek} / 4 Days Used`;
    badge.style.color = eligibility.daysUsedThisWeek >= 4 ? '#ef4444' : 'var(--tg-accent)';
    desc.innerHTML = `
      Non-Premium users can post stories on <strong>at most 4 days per week</strong>.<br/>
      Days posted this week: ${eligibility.daysList.length ? eligibility.daysList.join(', ') : 'None yet'}.<br/>
      <span style="color: var(--tg-accent); font-weight: 500;">Unlock all 7 days with Telegram Premium for 10 Stars!</span>
    `;
    alertBox.style.background = eligibility.daysUsedThisWeek >= 4 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)';
    alertBox.style.borderColor = eligibility.daysUsedThisWeek >= 4 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(59, 130, 246, 0.25)';
  }
}

// ----------------------------------------------------
// CHAT RENDERING & MESSAGES
// ----------------------------------------------------
function renderChatList() {
  const list = $('chat-list');
  list.innerHTML = '';
  chats = AppStorage.getChats();

  const filtered = chats.filter((chat) => {
    // Tab filter
    if (currentTab === 'direct' && chat.type !== 'direct' && chat.type !== 'saved') return false;
    if (currentTab === 'group' && chat.type !== 'group') return false;
    if (currentTab === 'channel' && chat.type !== 'channel') return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = chat.title.toLowerCase().includes(q);
      const matchUsername = chat.username?.toLowerCase().includes(q);
      const matchLastMsg = chat.lastMessage?.text.toLowerCase().includes(q);
      return matchTitle || matchUsername || matchLastMsg;
    }
    return true;
  });

  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.style.padding = '30px 16px';
    empty.style.textAlign = 'center';
    empty.style.color = 'var(--tg-text-secondary)';
    empty.style.fontSize = '13.5px';
    empty.textContent = 'No chats found';
    list.appendChild(empty);
    return;
  }

  filtered.forEach((chat) => {
    const item = document.createElement('li');
    item.className = `chat-item-row ${chat.id === activeChatId ? 'active' : ''}`;
    item.dataset.chatId = chat.id;

    item.innerHTML = `
      <div class="avatar chat-avatar-slot"></div>
      <div class="chat-info">
        <div class="chat-top-line">
          <div class="chat-title-group">
            <span class="chat-title">${chat.title}</span>
            ${chat.isVerified ? `<span class="verified-badge"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>` : ''}
            ${chat.type === 'direct' && chat.id === 'chat_durov' ? `<span class="premium-badge">⭐</span>` : ''}
          </div>
          <span class="chat-time">${chat.lastMessage ? formatTime(chat.lastMessage.timestamp) : ''}</span>
        </div>
        <div class="chat-bottom-line">
          <span class="chat-snippet">${chat.lastMessage ? chat.lastMessage.text : (chat.description || 'Tap to chat')}</span>
          ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
        </div>
      </div>
    `;

    renderAvatar(
      item.querySelector('.chat-avatar-slot') as HTMLElement,
      chat.title,
      chat.avatarUrl,
      chat.isOnline
    );

    item.addEventListener('click', () => {
      selectChat(chat.id);
    });

    list.appendChild(item);
  });
}

function selectChat(chatId: string) {
  activeChatId = chatId;
  AppStorage.setActiveChatId(chatId);

  // Clear unread badge
  const chatIndex = chats.findIndex((c) => c.id === chatId);
  if (chatIndex !== -1 && chats[chatIndex].unreadCount > 0) {
    chats[chatIndex].unreadCount = 0;
    AppStorage.saveChats(chats);
  }

  // Active state in mobile
  $('app').classList.add('chat-active');

  renderChatList();
  renderChatHeader();
  renderMessages();
}

function renderChatHeader() {
  const chat = chats.find((c) => c.id === activeChatId) || chats[0];
  if (!chat) return;

  renderAvatar($('header-avatar'), chat.title, chat.avatarUrl, chat.isOnline);

  const titleEl = $('header-title');
  titleEl.innerHTML = `
    <span>${chat.title}</span>
    ${chat.isVerified ? `<span class="verified-badge" style="display:inline-flex; align-items:center;"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg></span>` : ''}
    ${chat.id === 'chat_durov' ? `<span class="premium-badge">⭐</span>` : ''}
  `;

  const statusEl = $('header-status');
  if (chat.type === 'saved') {
    statusEl.textContent = 'Personal Cloud Storage';
  } else if (chat.type === 'channel') {
    statusEl.textContent = `${(chat.membersCount || 1000).toLocaleString()} subscribers`;
  } else if (chat.type === 'group') {
    statusEl.textContent = `${(chat.membersCount || 100).toLocaleString()} members`;
  } else {
    statusEl.textContent = chat.isOnline ? 'online' : (chat.lastSeen || 'last seen recently');
  }
}

function renderMessages() {
  const container = $('messages-container');
  container.innerHTML = '';
  const messages = AppStorage.getChatMessages(activeChatId);

  if (messages.length === 0) {
    const emptyNotice = document.createElement('div');
    emptyNotice.className = 'date-divider';
    emptyNotice.textContent = 'No messages here yet... Send a message to start!';
    container.appendChild(emptyNotice);
    return;
  }

  // Add date divider
  const dateDivider = document.createElement('div');
  dateDivider.className = 'date-divider';
  dateDivider.textContent = 'Today';
  container.appendChild(dateDivider);

  messages.forEach((msg) => {
    const isOut = msg.senderId === currentUser.id;
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${isOut ? 'outgoing' : 'incoming'}`;

    let bodyHtml = '';

    // Sender name for groups
    const currentChat = chats.find((c) => c.id === activeChatId);
    if (!isOut && currentChat && currentChat.type === 'group') {
      bodyHtml += `<div class="message-sender-name">${msg.senderName}</div>`;
    }

    // Image attachment
    if (msg.imageUrl) {
      bodyHtml += `<img src="${msg.imageUrl}" alt="Attached media" class="message-image" />`;
    }

    // Voice note
    if (msg.isVoice) {
      bodyHtml += `
        <div class="voice-note-card">
          <button class="voice-play-btn" aria-label="Play Voice Note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
          <div class="voice-waveform">
            <span class="waveform-bar" style="height: 10px;"></span>
            <span class="waveform-bar" style="height: 18px;"></span>
            <span class="waveform-bar" style="height: 8px;"></span>
            <span class="waveform-bar" style="height: 22px;"></span>
            <span class="waveform-bar" style="height: 14px;"></span>
            <span class="waveform-bar" style="height: 19px;"></span>
            <span class="waveform-bar" style="height: 11px;"></span>
          </div>
          <span style="font-size: 11.5px; opacity: 0.85;">${msg.voiceDuration || '0:04'}</span>
        </div>
      `;
    }

    // Text content
    if (msg.text) {
      bodyHtml += `<span>${escapeHtml(msg.text)}</span>`;
    }

    // Meta (time & ticks)
    bodyHtml += `
      <div class="message-meta">
        <span>${formatTime(msg.timestamp)}</span>
        ${isOut ? `<span class="message-ticks"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></span>` : ''}
        ${msg.viewsCount ? `<span style="display:flex;align-items:center;gap:2px;">👁️ ${msg.viewsCount}</span>` : ''}
      </div>
    `;

    bubble.innerHTML = bodyHtml;

    // Attach voice player sound
    const playBtn = bubble.querySelector('.voice-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        sounds.playPop();
        showToast('Playing voice message...');
      });
    }

    container.appendChild(bubble);
  });

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ----------------------------------------------------
// SEND MESSAGE & SIMULATED REPLIES
// ----------------------------------------------------
function sendMessage() {
  const input = $('message-input') as HTMLInputElement;
  const text = input.value.trim();

  if (!text && !attachedImageBase64) {
    // If no text, trigger voice note simulation
    simulateSendVoiceNote();
    return;
  }

  const newMsg: ChatMessage = {
    id: `msg_${Date.now()}`,
    chatId: activeChatId,
    senderId: currentUser.id,
    senderName: currentUser.displayName,
    senderAvatar: currentUser.avatarUrl,
    text: text,
    imageUrl: attachedImageBase64 || undefined,
    timestamp: Date.now(),
    status: 'sent',
  };

  AppStorage.addMessage(newMsg);
  sounds.playSend();

  // Reset inputs
  input.value = '';
  attachedImageBase64 = null;
  toggleSendVoiceIcon(false);

  renderMessages();
  renderChatList();

  // Simulated Auto-Reply from contact
  simulateContactReply(text);
}

function simulateSendVoiceNote() {
  sounds.playPop();
  showToast('Recording voice message... (0:04)');
  setTimeout(() => {
    const voiceMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      chatId: activeChatId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      text: '',
      isVoice: true,
      voiceDuration: '0:04',
      timestamp: Date.now(),
      status: 'delivered',
    };
    AppStorage.addMessage(voiceMsg);
    sounds.playSend();
    renderMessages();
    renderChatList();
  }, 1000);
}

function simulateContactReply(userMessageText: string) {
  const currentChat = chats.find((c) => c.id === activeChatId);
  if (!currentChat || currentChat.type === 'saved' || currentChat.type === 'channel') {
    return;
  }

  const typingBox = $('typing-box');
  const typingText = $('typing-text');
  typingText.textContent = `${currentChat.title.split(' ')[0]} is typing...`;

  setTimeout(() => {
    typingBox.style.display = 'flex';
    const container = $('messages-container');
    container.scrollTop = container.scrollHeight;
  }, 1200);

  setTimeout(() => {
    typingBox.style.display = 'none';

    // Contextual auto reply
    let replyText = 'Got it! NexChat feels super responsive and slick.';
    if (currentChat.id === 'chat_durov') {
      replyText = 'Appreciate your feedback! Enjoy posting stories and testing NexChat Stars.';
    } else if (currentChat.id === 'chat_elena') {
      replyText = 'Awesome! Have you already unlocked NexChat Premium for 10 Stars to test unlimited stories?';
    } else if (currentChat.type === 'group') {
      replyText = `Great point @${currentUser.username}! That makes total sense.`;
    }

    const replyMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      chatId: activeChatId,
      senderId: currentChat.id,
      senderName: currentChat.title,
      senderAvatar: currentChat.avatarUrl,
      text: replyText,
      timestamp: Date.now(),
      status: 'read',
    };

    AppStorage.addMessage(replyMsg);
    sounds.playReceive();
    renderMessages();
    renderChatList();
  }, 2800);
}

function toggleSendVoiceIcon(hasContent: boolean) {
  const iconVoice = $('icon-voice');
  const iconSend = $('icon-send');
  if (hasContent) {
    iconVoice.style.display = 'none';
    iconSend.style.display = 'block';
  } else {
    iconVoice.style.display = 'block';
    iconSend.style.display = 'none';
  }
}

// ----------------------------------------------------
// USER PROFILE & STAR / PREMIUM SYSTEM
// ----------------------------------------------------
function updateProfileModalUI() {
  currentUser = AppStorage.getUser();

  const nameInput = $('profile-name-input') as HTMLInputElement;
  const usernameInput = $('profile-username-input') as HTMLInputElement;
  const bioInput = $('profile-bio-input') as HTMLTextAreaElement;

  nameInput.value = currentUser.displayName;
  usernameInput.value = currentUser.username;
  bioInput.value = currentUser.bio;

  renderAvatar($('profile-avatar-preview'), currentUser.displayName, currentUser.avatarUrl);

  $('profile-stars-balance').textContent = `${currentUser.starsBalance} Stars`;

  const tierBadge = $('profile-tier-badge');
  const starIcon = $('profile-premium-star-icon');
  const toggleBtn = $('btn-toggle-premium');
  const quotaText = $('profile-story-quota-text');

  const eligibility = AppStorage.getStoryEligibility();

  if (currentUser.isPremium) {
    tierBadge.textContent = 'NexChat Premium';
    tierBadge.style.color = '#8b5cf6';
    starIcon.style.display = 'inline';
    toggleBtn.textContent = 'Deactivate Premium';
    toggleBtn.className = 'btn-secondary';
    quotaText.innerHTML = `
      • <strong>Unrestricted Stories:</strong> You can post all 7 days of the week! ⭐<br/>
      • Premium Star badge active on your profile and messages.
    `;
  } else {
    tierBadge.textContent = 'Free Plan';
    tierBadge.style.color = 'var(--tg-text-primary)';
    starIcon.style.display = 'none';
    toggleBtn.textContent = 'Unlock Premium (10 ⭐)';
    toggleBtn.className = 'btn-primary';
    quotaText.innerHTML = `
      • <strong>Story limit:</strong> max 4 days per week (${eligibility.daysUsedThisWeek}/4 days used this week: ${eligibility.daysList.length ? eligibility.daysList.join(', ') : 'None'}).<br/>
      • Upgrade to NexChat Premium for 10 Stars to post stories all 7 days!
    `;
  }
}

function handleTogglePremium() {
  const result = AppStorage.togglePremium();
  if (result.success) {
    currentUser = result.user;
    sounds.playPop();
    showToast(result.message);
    updateProfileModalUI();
    renderStoriesBar();
    renderChatHeader();
  } else {
    showToast(result.message);
    // Open stars shop if insufficient
    setTimeout(() => {
      openStarsModal();
    }, 800);
  }
}

function openStarsModal() {
  $('stars-modal').classList.add('open');
}

// ----------------------------------------------------
// AUTH & SIGNUP SYSTEM
// ----------------------------------------------------
function openAuthModal() {
  const modal = $('auth-modal');
  modal.classList.add('open');
  $('auth-step-phone').style.display = 'block';
  $('auth-step-code').style.display = 'none';
}

function handleSendSmsCode() {
  const phone = ($('auth-phone-input') as HTMLInputElement).value.trim();
  const country = ($('auth-country-select') as HTMLSelectElement).value;

  if (!phone) {
    showToast('Please enter your phone number');
    return;
  }

  const fullPhone = `${country} ${phone}`;
  $('auth-display-sent-phone').textContent = fullPhone;

  $('auth-step-phone').style.display = 'none';
  $('auth-step-code').style.display = 'block';

  sounds.playPop();
  showToast(`SMS Verification Code sent to ${fullPhone} (Sample code: 123456)`);
}

function handleVerifySmsCode() {
  const code = ($('auth-code-input') as HTMLInputElement).value.trim();
  if (code.length < 6) {
    showToast('Please enter the 6-digit code');
    return;
  }

  const phone = $('auth-display-sent-phone').textContent || '+1 555 019 2834';
  currentUser = AppStorage.updateUser({
    phoneNumber: phone,
    loginMethod: 'phone',
  });

  sounds.playReceive();
  $('auth-modal').classList.remove('open');
  showToast(`Successfully logged in as ${currentUser.displayName}!`);
  renderStoriesBar();
  renderChatHeader();
}

function handleGoogleLogin() {
  sounds.playPop();
  showToast('Connecting with Google Account...');

  setTimeout(() => {
    currentUser = AppStorage.updateUser({
      displayName: 'Alex Rivers (Google)',
      email: 'alex.rivers@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      loginMethod: 'google',
    });

    $('auth-modal').classList.remove('open');
    sounds.playReceive();
    showToast(`Signed in with Google as ${currentUser.displayName}!`);
    renderStoriesBar();
    renderChatHeader();
  }, 900);
}

// ----------------------------------------------------
// EVENT LISTENERS INITIALIZATION
// ----------------------------------------------------
function initEventListeners() {
  // Main Menu Toggle
  const btnMenu = $('btn-menu');
  const mainMenu = $('main-menu');
  btnMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    mainMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!mainMenu.contains(e.target as Node) && e.target !== btnMenu) {
      mainMenu.classList.remove('open');
    }
    const emojiTray = $('emoji-tray');
    if (!emojiTray.contains(e.target as Node) && e.target !== $('btn-emoji')) {
      emojiTray.classList.remove('show');
    }
  });

  // Menu items
  $('menu-saved-messages').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    selectChat('chat_saved');
  });

  $('menu-new-group').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    $('create-group-modal').classList.add('open');
  });

  $('menu-new-channel').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    $('create-channel-modal').classList.add('open');
  });

  $('btn-new-chat-menu').addEventListener('click', () => {
    $('create-group-modal').classList.add('open');
  });

  $('menu-profile').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    updateProfileModalUI();
    $('profile-modal').classList.add('open');
  });

  $('menu-stars-premium').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    openStarsModal();
  });

  $('menu-theme-toggle').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    toggleTheme();
  });

  $('menu-auth').addEventListener('click', () => {
    mainMenu.classList.remove('open');
    openAuthModal();
  });

  // Close modals
  document.querySelectorAll('.close-modal-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach((m) => m.classList.remove('open'));
    });
  });

  // Chat Tabs
  document.querySelectorAll('.chat-tab-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.chat-tab-btn').forEach((b) => b.classList.remove('active'));
      const target = e.currentTarget as HTMLButtonElement;
      target.classList.add('active');
      currentTab = target.dataset.tab || 'all';
      renderChatList();
    });
  });

  // Search input
  $('search-input').addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.trim();
    renderChatList();
  });

  // Mobile back button
  $('btn-back-mobile').addEventListener('click', () => {
    $('app').classList.remove('chat-active');
  });

  // Chat Composer Send & Voice
  const messageInput = $('message-input') as HTMLInputElement;
  messageInput.addEventListener('input', () => {
    toggleSendVoiceIcon(messageInput.value.trim().length > 0 || attachedImageBase64 !== null);
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  $('btn-send').addEventListener('click', () => {
    sendMessage();
  });

  // Emoji Tray
  $('btn-emoji').addEventListener('click', (e) => {
    e.stopPropagation();
    $('emoji-tray').classList.toggle('show');
  });

  $('emoji-tray').querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      messageInput.value += btn.textContent;
      messageInput.focus();
      toggleSendVoiceIcon(true);
      $('emoji-tray').classList.remove('show');
    });
  });

  // File Attachment
  const fileInput = $('file-input') as HTMLInputElement;
  $('btn-attach').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        attachedImageBase64 = e.target?.result as string;
        showToast(`Image attached: ${file.name}`);
        toggleSendVoiceIcon(true);
      };
      reader.readAsDataURL(file);
    }
  });

  // Profile Save
  $('btn-save-profile').addEventListener('click', () => {
    const name = ($('profile-name-input') as HTMLInputElement).value.trim();
    const username = ($('profile-username-input') as HTMLInputElement).value.trim();
    const bio = ($('profile-bio-input') as HTMLTextAreaElement).value.trim();

    if (!name) {
      showToast('Name cannot be empty');
      return;
    }

    currentUser = AppStorage.updateUser({
      displayName: name,
      username: username || 'user',
      bio: bio,
    });

    $('profile-modal').classList.remove('open');
    sounds.playPop();
    showToast('Profile updated successfully!');
    renderStoriesBar();
  });

  // Profile Avatar Upload
  const avatarFile = $('profile-avatar-file') as HTMLInputElement;
  $('btn-change-avatar').addEventListener('click', () => {
    avatarFile.click();
  });

  avatarFile.addEventListener('change', () => {
    if (avatarFile.files && avatarFile.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        currentUser = AppStorage.updateUser({ avatarUrl: url });
        renderAvatar($('profile-avatar-preview'), currentUser.displayName, url);
        renderStoriesBar();
        showToast('Profile photo updated!');
      };
      reader.readAsDataURL(avatarFile.files[0]);
    }
  });

  // Toggle Premium button inside profile
  $('btn-toggle-premium').addEventListener('click', () => {
    handleTogglePremium();
  });

  $('btn-open-stars-shop').addEventListener('click', () => {
    $('profile-modal').classList.remove('open');
    openStarsModal();
  });

  // Stars Pack purchases
  document.querySelectorAll('.btn-buy-stars-pack').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const packBtn = (e.currentTarget as HTMLElement);
      const amount = parseInt(packBtn.dataset.stars || '10', 10);
      currentUser = AppStorage.purchaseStars(amount);
      sounds.playReceive();
      showToast(`Added +${amount} Stars! Balance: ${currentUser.starsBalance} Stars`);
      updateProfileModalUI();
    });
  });

  // Group Creation
  $('btn-submit-group').addEventListener('click', () => {
    const title = ($('group-title-input') as HTMLInputElement).value.trim();
    const desc = ($('group-desc-input') as HTMLTextAreaElement).value.trim();
    const isPublic = (document.querySelector('input[name="group-type"]:checked') as HTMLInputElement)?.value === 'public';

    if (!title) {
      showToast('Please enter a group title');
      return;
    }

    const newGroup: ChatItem = {
      id: `group_${Date.now()}`,
      type: 'group',
      title: title,
      avatarUrl: '',
      isPublic: isPublic,
      inviteLink: isPublic ? `https://t.me/${title.toLowerCase().replace(/\s+/g, '_')}` : 'https://t.me/+join_private',
      membersCount: 3,
      description: desc || 'Newly created group',
      unreadCount: 0,
    };

    AppStorage.addChat(newGroup);
    $('create-group-modal').classList.remove('open');
    sounds.playPop();
    showToast(`Group "${title}" created!`);
    selectChat(newGroup.id);
  });

  // Channel Creation
  $('btn-submit-channel').addEventListener('click', () => {
    const title = ($('channel-title-input') as HTMLInputElement).value.trim();
    const desc = ($('channel-desc-input') as HTMLTextAreaElement).value.trim();
    const isPublic = (document.querySelector('input[name="channel-type"]:checked') as HTMLInputElement)?.value === 'public';

    if (!title) {
      showToast('Please enter a channel title');
      return;
    }

    const newChannel: ChatItem = {
      id: `channel_${Date.now()}`,
      type: 'channel',
      title: title,
      username: isPublic ? title.toLowerCase().replace(/\s+/g, '_') : undefined,
      avatarUrl: '',
      isPublic: isPublic,
      membersCount: 1,
      description: desc || 'Broadcast channel',
      unreadCount: 0,
    };

    AppStorage.addChat(newChannel);
    $('create-channel-modal').classList.remove('open');
    sounds.playPop();
    showToast(`Channel "${title}" created!`);
    selectChat(newChannel.id);
  });

  // Story Posting: Preset images selection
  let selectedStoryImageUrl = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';
  document.querySelectorAll('.preset-story-img').forEach((img) => {
    img.addEventListener('click', (e) => {
      document.querySelectorAll('.preset-story-img').forEach((i) => ((i as HTMLElement).style.borderColor = 'transparent'));
      const target = e.currentTarget as HTMLImageElement;
      target.style.borderColor = 'var(--tg-accent)';
      selectedStoryImageUrl = target.src;
      $('story-selected-file-name').textContent = 'Preset photo selected';
    });
  });

  // Custom story image upload
  const customStoryFile = $('story-custom-file-input') as HTMLInputElement;
  $('btn-upload-custom-story').addEventListener('click', () => {
    customStoryFile.click();
  });

  customStoryFile.addEventListener('change', () => {
    if (customStoryFile.files && customStoryFile.files[0]) {
      const file = customStoryFile.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        selectedStoryImageUrl = e.target?.result as string;
        $('story-selected-file-name').textContent = file.name;
        document.querySelectorAll('.preset-story-img').forEach((i) => ((i as HTMLElement).style.borderColor = 'transparent'));
      };
      reader.readAsDataURL(file);
    }
  });

  // Story day selector change (to see dynamic weekly quota feedback)
  $('story-day-select').addEventListener('change', (e) => {
    const val = (e.target as HTMLSelectElement).value;
    updateStoryModalQuotaDisplay(val);
  });

  // Submit Story with Limit Check
  $('btn-submit-story').addEventListener('click', () => {
    const caption = ($('story-caption-input') as HTMLTextAreaElement).value.trim();
    const day = ($('story-day-select') as HTMLSelectElement).value;

    const res = AppStorage.addStory({
      imageUrl: selectedStoryImageUrl,
      caption: caption,
      dayOfWeek: day,
    });

    if (!res.success) {
      // Limit exceeded!
      sounds.playPop();
      showToast(res.message || 'Weekly limit exceeded!', 4500);
      return;
    }

    $('story-upload-modal').classList.remove('open');
    sounds.playReceive();
    showToast(`Story posted successfully for ${day}! ⭐`);
    renderStoriesBar();
  });

  // Story Viewer Tap Area (left for back, right for next)
  $('story-viewer-tap-area').addEventListener('click', (e) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const clickX = (e as MouseEvent).clientX - rect.left;
    if (clickX < rect.width / 3) {
      // Left tap -> Previous
      if (currentStoryIndex > 0) {
        loadStoryAtIndex(currentStoryIndex - 1);
      }
    } else {
      // Right tap -> Next
      if (currentStoryIndex + 1 < currentStoryList.length) {
        loadStoryAtIndex(currentStoryIndex + 1);
      } else {
        closeStoryViewer();
      }
    }
  });

  $('btn-close-story-viewer').addEventListener('click', () => {
    closeStoryViewer();
  });

  // Story Viewer Like
  $('btn-story-like').addEventListener('click', () => {
    if (currentStoryList[currentStoryIndex]) {
      const story = currentStoryList[currentStoryIndex];
      story.hasLiked = !story.hasLiked;
      story.likesCount = (story.likesCount || 0) + (story.hasLiked ? 1 : -1);
      sounds.playPop();
      loadStoryAtIndex(currentStoryIndex);
      showToast(story.hasLiked ? 'Liked story ❤️' : 'Unliked');
    }
  });

  // Story Reply
  $('btn-story-send-reply').addEventListener('click', () => {
    const replyInput = $('story-reply-input') as HTMLInputElement;
    const text = replyInput.value.trim();
    if (!text) return;

    sounds.playSend();
    showToast(`Reply sent to ${currentStoryList[currentStoryIndex]?.authorName}!`);
    replyInput.value = '';
    closeStoryViewer();
  });

  // Header Call Action
  $('btn-call').addEventListener('click', () => {
    sounds.playPop();
    showToast('Calling... (Audio call simulation)');
  });

  // Header Search in Chat
  $('btn-chat-search').addEventListener('click', () => {
    const term = prompt('Search messages in this chat:');
    if (term) {
      const messages = AppStorage.getChatMessages(activeChatId);
      const matches = messages.filter((m) => m.text.toLowerCase().includes(term.toLowerCase()));
      showToast(`Found ${matches.length} message(s) containing "${term}"`);
    }
  });

  // Auth Modal Buttons
  $('btn-auth-send-sms').addEventListener('click', () => {
    handleSendSmsCode();
  });

  $('btn-auth-verify-code').addEventListener('click', () => {
    handleVerifySmsCode();
  });

  $('btn-auth-back-to-phone').addEventListener('click', () => {
    $('auth-step-code').style.display = 'none';
    $('auth-step-phone').style.display = 'block';
  });

  $('btn-auth-google').addEventListener('click', () => {
    handleGoogleLogin();
  });
}

// ----------------------------------------------------
// APP INITIALIZATION
// ----------------------------------------------------
function initApp() {
  applyTheme(AppStorage.getTheme());
  renderStoriesBar();
  renderChatList();
  selectChat(activeChatId);
  initEventListeners();
}

// Boot on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
