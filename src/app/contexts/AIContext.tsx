import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { aiEngine, Intent, CommunicationSummary, UserHabit, ScheduleChange, NotificationPayload } from '../services/AIEngine';

interface ChatMessage {
  id: number;
  text: string;
  sender: string;
  timestamp: string;
  source: string;
  intent?: Intent;
  autoTaskCreated?: boolean;
}

interface RippleEffectState {
  active: boolean;
  trigger?: string;
  affectedEvents: Array<{ id: string; action: string; suggestedTime?: string }>;
  bufferAdjustments: Array<{ beforeEvent: string; newBuffer: number }>;
  recommendations: string[];
}

interface AIContextType {
  chatMessages: ChatMessage[];
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'intent'>) => Intent;
  syncCommunicationFromHistory: (history: Array<{ text: string; sender: 'user' | 'ai'; timestamp: string; source?: string }>) => void;
  communicationSummaries: CommunicationSummary[];
  refreshSummaries: () => void;
  rippleEffect: RippleEffectState;
  triggerRippleEffect: (eventId: string, changeType: 'delay' | 'cancel' | 'reschedule', newTime?: string) => void;
  dismissRippleEffect: () => void;
  autoCreateTasks: boolean;
  toggleAutoCreateTasks: () => void;
  // New habit learning features
  learnedHabits: UserHabit[];
  refreshHabits: () => void;
  recordUserBehavior: (eventType: string, context: any) => void;
  // New auto-apply features
  autoApplyEnabled: boolean;
  autoApplyThreshold: number;
  toggleAutoApply: () => void;
  setAutoApplyThreshold: (threshold: number) => void;
  applyScheduleChanges: (requireConfirmation?: boolean) => Promise<{ success: boolean; appliedChanges: ScheduleChange[] }>;
  // New notification features
  pendingNotifications: NotificationPayload[];
  sendNotification: (notification: NotificationPayload) => Promise<boolean>;
  clearNotifications: () => void;
}

const AIContext = createContext<AIContextType | undefined>(undefined);

const STORAGE_KEY = 'syncflow_ai_state';

export function AIProvider({ children }: { children: ReactNode }) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [communicationSummaries, setCommunicationSummaries] = useState<CommunicationSummary[]>([]);
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [rippleEffect, setRippleEffect] = useState<RippleEffectState>({
    active: false,
    affectedEvents: [],
    bufferAdjustments: [],
    recommendations: [],
  });
  
  // New state for habit learning
  const [learnedHabits, setLearnedHabits] = useState<UserHabit[]>([]);
  
  // New state for auto-apply features
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [autoApplyThreshold, setAutoApplyThreshold] = useState(0.75);
  
  // New state for notifications
  const [pendingNotifications, setPendingNotifications] = useState<NotificationPayload[]>([]);

  // Load state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setChatMessages(parsed.chatMessages || []);
        setAutoCreateTasks(parsed.autoCreateTasks ?? true);
        setAutoApplyEnabled(parsed.autoApplyEnabled ?? false);
        setAutoApplyThreshold(parsed.autoApplyThreshold ?? 0.75);
      } catch (e) {
        console.error('Failed to load AI state:', e);
      }
    }
    // Load habits from AIEngine
    refreshHabits();
  }, []);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      chatMessages,
      autoCreateTasks,
      autoApplyEnabled,
      autoApplyThreshold,
    }));
  }, [chatMessages, autoCreateTasks, autoApplyEnabled, autoApplyThreshold]);

  const addChatMessage = (message: Omit<ChatMessage, 'id' | 'intent'>): Intent => {
    const intent = aiEngine.analyzeIntent(message.text, message.sender);
    
    const newMessage: ChatMessage = {
      ...message,
      id: Date.now(),
      intent,
      autoTaskCreated: autoCreateTasks && (intent.type === 'task' || intent.type === 'meeting') && intent.confidence > 0.7,
    };

    setChatMessages(prev => [...prev, newMessage]);

    // Check if this message triggers a Ripple Effect
    if (intent.type === 'delay' || intent.type === 'reschedule' || intent.type === 'cancel') {
      setTimeout(() => {
        triggerRippleEffect(
          'affected-event-' + Date.now(), 
          intent.type as any,
          intent.extractedData.time
        );
      }, 1000);
    }

    return intent;
  };

  const syncCommunicationFromHistory = (
    history: Array<{ text: string; sender: 'user' | 'ai'; timestamp: string; source?: string }>
  ) => {
    const normalized = history
      .filter((msg) => msg.sender === 'user' && typeof msg.source === 'string' && msg.source.length > 0)
      .map((msg) => {
        const intent = aiEngine.analyzeIntent(msg.text, 'You');
        return {
          id: Date.now() + Math.floor(Math.random() * 1000),
          text: msg.text,
          sender: 'You',
          timestamp: msg.timestamp,
          source: msg.source as string,
          intent,
          autoTaskCreated: autoCreateTasks && (intent.type === 'task' || intent.type === 'meeting') && intent.confidence > 0.7,
        } as ChatMessage;
      });

    setChatMessages(normalized);

    if (normalized.length === 0) {
      setCommunicationSummaries([]);
      return;
    }

    const summaries = aiEngine.generateCommunicationSummary(
      normalized.map((msg) => ({
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp,
        source: msg.source,
      }))
    );
    setCommunicationSummaries(summaries);
  };

  const refreshSummaries = () => {
    const summaries = aiEngine.generateCommunicationSummary(
      chatMessages.map(msg => ({
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp,
        source: msg.source,
      }))
    );
    setCommunicationSummaries(summaries);
  };

  // Auto-refresh summaries when messages change
  useEffect(() => {
    if (chatMessages.length === 0) {
      setCommunicationSummaries([]);
      return;
    }
    refreshSummaries();
  }, [chatMessages]);

  const triggerRippleEffect = (
    eventId: string,
    changeType: 'delay' | 'cancel' | 'reschedule',
    newTime?: string
  ) => {
    const result = aiEngine.calculateRippleEffect(eventId, changeType, newTime);
    
    setRippleEffect({
      active: true,
      trigger: `Schedule ${changeType} detected`,
      ...result,
    });
  };

  const dismissRippleEffect = () => {
    setRippleEffect({
      active: false,
      affectedEvents: [],
      bufferAdjustments: [],
      recommendations: [],
    });
  };

  const toggleAutoCreateTasks = () => {
    setAutoCreateTasks(prev => !prev);
  };

  // New habit learning functions
  const refreshHabits = () => {
    const habits = aiEngine.getUserHabits(0.3); // Get all habits with min confidence
    setLearnedHabits(habits);
  };

  const recordUserBehavior = (eventType: string, context: any) => {
    aiEngine.learnFromUserBehavior(eventType, context);
    refreshHabits();
  };

  // New auto-apply functions
  const toggleAutoApply = () => {
    setAutoApplyEnabled(prev => !prev);
  };

  const setAutoApplyThresholdValue = (threshold: number) => {
    setAutoApplyThreshold(Math.max(0, Math.min(1, threshold)));
  };

  const applyScheduleChanges = async (requireConfirmation = !autoApplyEnabled): Promise<{ success: boolean; appliedChanges: ScheduleChange[] }> => {
    try {
      // Generate schedule changes based on current ripple effect
      const changes = aiEngine.generateScheduleChanges(
        {
          affectedEvents: rippleEffect.affectedEvents,
          bufferAdjustments: rippleEffect.bufferAdjustments,
        },
        {
          autoApplyThreshold,
          requireConfirmation,
        }
      );

      if (changes.length === 0) {
        return { success: false, appliedChanges: [] };
      }

      // In production, this would call actual calendar/task APIs
      // For now, we simulate the application
      console.log('Applying schedule changes:', changes);

      // Generate and queue notifications
      const userContact = 'user@example.com'; // Should come from user settings
      const platform = 'whatsapp'; // Should come from connected chat provider
      const notifications = aiEngine.generateNotifications(changes, userContact, platform);
      
      setPendingNotifications(prev => [...prev, ...notifications]);

      // Record this as learned behavior
      changes.forEach(change => {
        if (change.changeType === 'buffer_adjust') {
          const bufferMinutes = parseInt(change.newTime.replace(/\D/g, ''));
          recordUserBehavior('buffer_used', {
            beforeEvent: change.eventId,
            duration: bufferMinutes,
            eventType: 'general',
          });
        }
      });

      return { success: true, appliedChanges: changes };
    } catch (error) {
      console.error('Failed to apply schedule changes:', error);
      return { success: false, appliedChanges: [] };
    }
  };

  // New notification functions
  const sendNotification = async (notification: NotificationPayload): Promise<boolean> => {
    try {
      // Log the notification - in production, this would use IntegrationContext.sendChatMessage
      console.log(`📨 Sending ${notification.type} notification:`, {
        platform: notification.platform,
        recipient: notification.recipient,
        message: notification.message,
        actionRequired: notification.actionRequired,
      });
      
      // In production, would call:
      // const { sendChatMessage } = useIntegrations(); // from component level
      // await sendChatMessage(notification.platform, notification.recipient, notification.message);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove from pending after "sending"
      setPendingNotifications(prev => prev.filter(n => n !== notification));
      
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      // Remove from pending on error to avoid infinite retries
      setPendingNotifications(prev => prev.filter(n => n !== notification));
      return false;
    }
  };

  const clearNotifications = () => {
    setPendingNotifications([]);
  };

  // Auto-send pending notifications when auto-apply is enabled
  useEffect(() => {
    if (autoApplyEnabled && pendingNotifications.length > 0) {
      // Send notifications automatically with a small delay
      const timer = setTimeout(() => {
        pendingNotifications.forEach(notification => {
          sendNotification(notification);
        });
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [pendingNotifications, autoApplyEnabled]);

  return (
    <AIContext.Provider
      value={{
        chatMessages,
        addChatMessage,
        syncCommunicationFromHistory,
        communicationSummaries,
        refreshSummaries,
        rippleEffect,
        triggerRippleEffect,
        dismissRippleEffect,
        autoCreateTasks,
        toggleAutoCreateTasks,
        learnedHabits,
        refreshHabits,
        recordUserBehavior,
        autoApplyEnabled,
        autoApplyThreshold,
        toggleAutoApply,
        setAutoApplyThreshold: setAutoApplyThresholdValue,
        applyScheduleChanges,
        pendingNotifications,
        sendNotification,
        clearNotifications,
      }}
    >
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}
