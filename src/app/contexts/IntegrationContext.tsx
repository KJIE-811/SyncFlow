import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';

export interface CalendarProvider {
  id: string;
  name: string;
  connected: boolean;
  accessToken?: string;
  refreshToken?: string;
  lastSync?: string;
  eventCount?: number;
}

export interface TaskProvider {
  id: string;
  name: string;
  connected: boolean;
  accessToken?: string;
  apiKey?: string;
  lastSync?: string;
  taskCount?: number;
}

export interface ChatProvider {
  id: string;
  name: string;
  connected: boolean;
  apiToken?: string;
  webhookUrl?: string;
  phoneNumberId?: string;
  botToken?: string;
  lastSync?: string;
  messagesProcessed?: number;
}

export interface ChatSummarySettings {
  enableAutoSummary: boolean;
  summaryInterval: 'hourly' | 'daily' | 'realtime';
  selectedChannels: string[];
  keywordFilters: string[];
  autoConvertTasks: boolean;
}

export interface CalendarTaskSyncSettings {
  syncTaskDueDatesToCalendar: boolean;
  autoBlockTimeForTasks: boolean;
  showTasksInCalendarView: boolean;
  defaultBufferMinutes: number;
  taskBlockDuration: number; // minutes
  convertCalendarEventsToTasks: boolean;
  syncCompletedStatus: boolean;
}

interface IntegrationState {
  calendars: CalendarProvider[];
  tasks: TaskProvider[];
  chats: ChatProvider[];
  forceLocalOnly: boolean;
  chatSummarySettings: ChatSummarySettings;
  calendarTaskSync: CalendarTaskSyncSettings;
}

interface IntegrationContextType {
  state: IntegrationState;
  connectCalendar: (providerId: string, credentials: any) => void;
  disconnectCalendar: (providerId: string) => void;
  connectTask: (providerId: string, credentials: any) => void;
  disconnectTask: (providerId: string) => void;
  connectChat: (providerId: string, credentials: any) => void;
  disconnectChat: (providerId: string) => void;
  syncProvider: (type: 'calendar' | 'task' | 'chat', providerId: string) => void;
  toggleForceLocalOnly: () => void;
  canConnect: (type: 'calendar' | 'task' | 'chat', providerId: string) => { allowed: boolean; reason?: string; activeProvider?: string };
  getActiveProvider: (type: 'calendar' | 'task' | 'chat') => string | null;
  updateChatSummarySettings: (settings: ChatSummarySettings) => void;
  updateCalendarTaskSync: (settings: CalendarTaskSyncSettings) => void;
  // New messaging functions
  sendChatMessage: (providerId: string, recipient: string, message: string) => Promise<boolean>;
  scheduleNotification: (providerId: string, recipient: string, message: string, sendAt: Date) => Promise<boolean>;
}

export const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

const STORAGE_KEY_PREFIX = 'syncflow_integrations';

const getStorageKeyForUser = (user: { id: string; email: string }) =>
  `${STORAGE_KEY_PREFIX}:${user.id}:${encodeURIComponent(user.email.toLowerCase())}`;

const initialState: IntegrationState = {
  calendars: [
    { id: 'google', name: 'Google Calendar', connected: false },
    { id: 'outlook', name: 'Microsoft Outlook', connected: false },
    { id: 'apple', name: 'Apple Calendar', connected: false },
  ],
  tasks: [
    { id: 'google-tasks', name: 'Google Tasks', connected: false },
    { id: 'microsoft-todo', name: 'Microsoft To Do', connected: false },
    { id: 'todoist', name: 'Todoist', connected: false },
  ],
  chats: [
    { id: 'whatsapp', name: 'WhatsApp', connected: false },
    { id: 'telegram', name: 'Telegram', connected: false },
    { id: 'messenger', name: 'Messenger', connected: false },
  ],
  forceLocalOnly: false,
  chatSummarySettings: {
    enableAutoSummary: false,
    summaryInterval: 'realtime',
    selectedChannels: [],
    keywordFilters: [],
    autoConvertTasks: false,
  },
  calendarTaskSync: {
    syncTaskDueDatesToCalendar: true,
    autoBlockTimeForTasks: false,
    showTasksInCalendarView: true,
    defaultBufferMinutes: 15,
    taskBlockDuration: 60,
    convertCalendarEventsToTasks: false,
    syncCompletedStatus: true,
  },
};

const createInitialState = (): IntegrationState => ({
  ...initialState,
  calendars: initialState.calendars.map((calendar) => ({ ...calendar })),
  tasks: initialState.tasks.map((task) => ({ ...task })),
  chats: initialState.chats.map((chat) => ({ ...chat })),
  chatSummarySettings: {
    ...initialState.chatSummarySettings,
    selectedChannels: [...initialState.chatSummarySettings.selectedChannels],
    keywordFilters: [...initialState.chatSummarySettings.keywordFilters],
  },
  calendarTaskSync: {
    ...initialState.calendarTaskSync,
  },
});

export function IntegrationProvider({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [state, setState] = useState<IntegrationState>(createInitialState);
  const [stateOwnerId, setStateOwnerId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      setState(createInitialState());
      setStateOwnerId(null);
      return;
    }

    // Reset immediately on account switch so previous user's connections never leak into view.
    setState(createInitialState());
    setStateOwnerId(null);

    const storageKey = getStorageKeyForUser(user);
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      setStateOwnerId(user.id);
      return;
    }

    try {
      const parsedState = JSON.parse(stored);
      const baseState = createInitialState();
      // Merge with initialState to ensure new fields have defaults (backward compatibility)
      setState({
        ...baseState,
        ...parsedState,
        chatSummarySettings: parsedState.chatSummarySettings || baseState.chatSummarySettings,
        calendarTaskSync: {
          ...baseState.calendarTaskSync,
          ...(parsedState.calendarTaskSync || {}),
        },
      });
      setStateOwnerId(user.id);
    } catch {
      setStateOwnerId(user.id);
    }
  }, [isLoading, user?.id, user?.email]);

  // Persist per-user state after the user-specific snapshot is loaded.
  useEffect(() => {
    if (isLoading || !user || stateOwnerId !== user.id) return;
    localStorage.setItem(getStorageKeyForUser(user), JSON.stringify(state));
  }, [state, user, isLoading, stateOwnerId]);

  const connectCalendar = (providerId: string, credentials: any) => {
    setState(prev => ({
      ...prev,
      calendars: prev.calendars.map(cal =>
        cal.id === providerId
          ? {
              ...cal,
              connected: true,
              accessToken: credentials.accessToken,
              refreshToken: credentials.refreshToken,
              lastSync: new Date().toISOString(),
              eventCount: Math.floor(Math.random() * 300) + 50, // Mock data
            }
          : cal
      ),
    }));
  };

  const disconnectCalendar = (providerId: string) => {
    setState(prev => ({
      ...prev,
      calendars: prev.calendars.map(cal =>
        cal.id === providerId
          ? {
              id: cal.id,
              name: cal.name,
              connected: false,
            }
          : cal
      ),
    }));
  };

  const connectTask = (providerId: string, credentials: any) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === providerId
          ? {
              ...task,
              connected: true,
              accessToken: credentials.accessToken,
              apiKey: credentials.apiKey,
              lastSync: new Date().toISOString(),
              taskCount: Math.floor(Math.random() * 100) + 20, // Mock data
            }
          : task
      ),
    }));
  };

  const disconnectTask = (providerId: string) => {
    setState(prev => ({
      ...prev,
      tasks: prev.tasks.map(task =>
        task.id === providerId
          ? {
              id: task.id,
              name: task.name,
              connected: false,
            }
          : task
      ),
    }));
  };

  const connectChat = (providerId: string, credentials: any) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === providerId
          ? {
              ...chat,
              connected: true,
              apiToken: credentials.apiToken,
              webhookUrl: credentials.webhookUrl,
              phoneNumberId: credentials.phoneNumberId,
              botToken: credentials.botToken,
              lastSync: new Date().toISOString(),
              messagesProcessed: 0,
            }
          : chat
      ),
    }));
  };

  const disconnectChat = (providerId: string) => {
    setState(prev => ({
      ...prev,
      chats: prev.chats.map(chat =>
        chat.id === providerId
          ? {
              id: chat.id,
              name: chat.name,
              connected: false,
            }
          : chat
      ),
    }));
  };

  const syncProvider = (type: 'calendar' | 'task' | 'chat', providerId: string) => {
    if (state.forceLocalOnly) {
      alert('⚠️ Force Local-Only mode is enabled. Outgoing API requests are paused.');
      return;
    }

    // Update last sync time
    const now = new Date().toISOString();
    setState(prev => {
      if (type === 'calendar') {
        return {
          ...prev,
          calendars: prev.calendars.map(cal =>
            cal.id === providerId ? { ...cal, lastSync: now } : cal
          ),
        };
      } else if (type === 'task') {
        return {
          ...prev,
          tasks: prev.tasks.map(task =>
            task.id === providerId ? { ...task, lastSync: now } : task
          ),
        };
      } else {
        return {
          ...prev,
          chats: prev.chats.map(chat =>
            chat.id === providerId ? { ...chat, lastSync: now } : chat
          ),
        };
      }
    });
  };

  const toggleForceLocalOnly = () => {
    setState(prev => ({ ...prev, forceLocalOnly: !prev.forceLocalOnly }));
  };

  const canConnect = (type: 'calendar' | 'task' | 'chat', providerId: string) => {
    const providers = type === 'calendar' ? state.calendars : type === 'task' ? state.tasks : state.chats;
    const activeProvider = providers.find(p => p.connected);
    if (activeProvider && activeProvider.id !== providerId) {
      return { allowed: false, reason: 'Another provider is already connected.', activeProvider: activeProvider.id };
    }
    return { allowed: true };
  };

  const getActiveProvider = (type: 'calendar' | 'task' | 'chat') => {
    const providers = type === 'calendar' ? state.calendars : type === 'task' ? state.tasks : state.chats;
    const activeProvider = providers.find(p => p.connected);
    return activeProvider ? activeProvider.id : null;
  };

  const updateChatSummarySettings = (settings: ChatSummarySettings) => {
    setState(prev => ({
      ...prev,
      chatSummarySettings: settings,
    }));
  };

  const updateCalendarTaskSync = (settings: CalendarTaskSyncSettings) => {
    setState(prev => ({
      ...prev,
      calendarTaskSync: settings,
    }));
  };

  // New messaging functions
  const sendChatMessage = async (providerId: string, recipient: string, message: string): Promise<boolean> => {
    const provider = state.chats.find(c => c.id === providerId && c.connected);
    
    if (!provider) {
      console.error(`Chat provider ${providerId} not connected`);
      return false;
    }

    if (state.forceLocalOnly) {
      console.log('[LOCAL-ONLY MODE] Would send message:', { providerId, recipient, message });
      return true; // Simulate success in local-only mode
    }

    try {
      // In production, this would call actual platform APIs
      switch (providerId) {
        case 'whatsapp':
          // WhatsApp Business Cloud API call
          console.log('Sending WhatsApp message:', {
            to: recipient,
            message,
            phoneNumberId: provider.phoneNumberId,
          });
          // await fetch(`https://graph.facebook.com/v18.0/${provider.phoneNumberId}/messages`, { ... })
          break;
          
        case 'telegram':
          // Telegram Bot API call
          console.log('Sending Telegram message:', {
            chat_id: recipient,
            text: message,
            botToken: provider.botToken,
          });
          // await fetch(`https://api.telegram.org/bot${provider.botToken}/sendMessage`, { ... })
          break;
          
        case 'messenger':
          // Facebook Messenger Platform API call
          console.log('Sending Messenger message:', {
            recipient: { id: recipient },
            message: { text: message },
            pageToken: provider.apiToken,
          });
          // await fetch(`https://graph.facebook.com/v18.0/me/messages`, { ... })
          break;
          
        default:
          console.error(`Unknown provider: ${providerId}`);
          return false;
      }

      // Update message count
      setState(prev => ({
        ...prev,
        chats: prev.chats.map(chat =>
          chat.id === providerId
            ? { ...chat, messagesProcessed: (chat.messagesProcessed || 0) + 1 }
            : chat
        ),
      }));

      return true;
    } catch (error) {
      console.error('Failed to send chat message:', error);
      return false;
    }
  };

  const scheduleNotification = async (providerId: string, recipient: string, message: string, sendAt: Date): Promise<boolean> => {
    const provider = state.chats.find(c => c.id === providerId && c.connected);
    
    if (!provider) {
      console.error(`Chat provider ${providerId} not connected`);
      return false;
    }

    const delay = sendAt.getTime() - Date.now();
    
    if (delay <= 0) {
      // Send immediately if time has passed
      return sendChatMessage(providerId, recipient, message);
    }

    // Schedule for later
    console.log(`Scheduling notification for ${sendAt.toISOString()}:`, { providerId, recipient, message });
    
    setTimeout(() => {
      sendChatMessage(providerId, recipient, message);
    }, delay);

    return true;
  };

  return (
    <IntegrationContext.Provider
      value={{
        state,
        connectCalendar,
        disconnectCalendar,
        connectTask,
        disconnectTask,
        connectChat,
        disconnectChat,
        syncProvider,
        toggleForceLocalOnly,
        canConnect,
        getActiveProvider,
        updateChatSummarySettings,
        updateCalendarTaskSync,
        sendChatMessage,
        scheduleNotification,
      }}
    >
      {children}
    </IntegrationContext.Provider>
  );
}

export function useIntegrations() {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegrations must be used within IntegrationProvider');
  }
  return context;
}