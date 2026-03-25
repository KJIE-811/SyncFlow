// AI Intelligence Layer - NLP Engine for SyncFlow

export interface Intent {
  type: 'task' | 'meeting' | 'delay' | 'urgent' | 'cancel' | 'reschedule' | 'general';
  confidence: number;
  extractedData: {
    title?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    time?: string;
    contact?: string;
    project?: string;
  };
  originalText: string;
  suggestedAction?: string;
}

export interface CommunicationSummary {
  contact: string;
  project?: string;
  messageCount: number;
  lastActivity: string;
  keyTopics: string[];
  urgentItems: number;
  pendingTasks: number;
  sentiment: 'positive' | 'neutral' | 'urgent' | 'delayed';
  summary: string;
}

export interface UserHabit {
  id: string;
  type: 'buffer' | 'schedule' | 'task_duration' | 'meeting_pattern' | 'delay_pattern';
  pattern: string;
  confidence: number;
  occurrences: number;
  lastObserved: string;
  metadata: {
    averageBufferTime?: number;
    preferredTimeSlots?: string[];
    typicalDuration?: number;
    delayFrequency?: number;
    contextTags?: string[];
  };
}

export interface ScheduleChange {
  eventId: string;
  changeType: 'reschedule' | 'buffer_adjust' | 'compress' | 'move';
  oldTime?: string;
  newTime: string;
  reason: string;
  confidence: number;
}

export interface NotificationPayload {
  recipient: string;
  platform: 'whatsapp' | 'telegram' | 'messenger';
  type: 'reminder' | 'schedule_change' | 'buffer_alert' | 'habit_suggestion';
  message: string;
  actionRequired: boolean;
  metadata?: any;
}

export class AIEngine {
  // Task Intent Detection Patterns
  private taskPatterns = [
    // Explicit task indicators
    { pattern: /(?:i'll|i will|i need to|i should|i must)\s+(.+?)(?:\.|$|by|before)/i, priority: 'medium' },
    { pattern: /(?:todo|to do|task):\s*(.+?)(?:\.|$)/i, priority: 'medium' },
    { pattern: /(?:remind me to|remember to|don't forget to)\s+(.+?)(?:\.|$)/i, priority: 'high' },
    { pattern: /(?:urgent|asap|immediately|critical).*?:\s*(.+?)(?:\.|$)/i, priority: 'urgent' },
    
    // Temporal task indicators
    { pattern: /(?:tomorrow|next week|by friday|before monday)\s+(?:i'll|i need to|i should)\s+(.+?)(?:\.|$)/i, priority: 'medium' },
    { pattern: /(?:today|tonight|this evening)\s+(?:i'll|i need to|i should)\s+(.+?)(?:\.|$)/i, priority: 'high' },
  ];

  // Meeting Intent Patterns
  private meetingPatterns = [
    { pattern: /(?:can we|let's|shall we)\s+meet(?:\s+at)?\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
    { pattern: /(?:meeting|call|sync)\s+(?:at|@)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i },
    { pattern: /(?:schedule|book)\s+(?:a|an)?\s*(?:meeting|call|time)\s+(?:for|at)?\s*(.+?)(?:\.|$)/i },
  ];

  // Delay/Reschedule Patterns
  private delayPatterns = [
    { pattern: /(?:delayed|postponed|pushed back|rescheduled?)/i, type: 'delay' },
    { pattern: /(?:can't make it|won't be able to|have to cancel)/i, type: 'cancel' },
    { pattern: /(?:running late|behind schedule|need more time)/i, type: 'delay' },
    { pattern: /(?:move|shift|change)\s+(?:to|till|until)\s+(.+?)(?:\.|$)/i, type: 'reschedule' },
  ];

  // Time Extraction
  private timePatterns = [
    { pattern: /\b(tomorrow|tmrw)\b/i, offset: 1 },
    { pattern: /\b(today|tonight|this evening)\b/i, offset: 0 },
    { pattern: /\b(monday|mon)\b/i, day: 1 },
    { pattern: /\b(tuesday|tue)\b/i, day: 2 },
    { pattern: /\b(wednesday|wed)\b/i, day: 3 },
    { pattern: /\b(thursday|thu)\b/i, day: 4 },
    { pattern: /\b(friday|fri)\b/i, day: 5 },
    { pattern: /\bnext week\b/i, offset: 7 },
    { pattern: /\b(\d{1,2}\/\d{1,2})\b/, isDate: true },
  ];

  /**
   * Analyze message for intent and extract actionable data
   */
  analyzeIntent(message: string, contact?: string): Intent {
    const lowerMessage = message.toLowerCase();

    // Check for explicit /task command
    if (message.startsWith('/task')) {
      return this.parseExplicitTask(message, contact);
    }

    // Check for task intent
    const taskIntent = this.detectTaskIntent(message);
    if (taskIntent) return taskIntent;

    // Check for meeting intent
    const meetingIntent = this.detectMeetingIntent(message);
    if (meetingIntent) return meetingIntent;

    // Check for delay/reschedule intent
    const delayIntent = this.detectDelayIntent(message);
    if (delayIntent) return delayIntent;

    // No clear intent detected
    return {
      type: 'general',
      confidence: 0.3,
      extractedData: { contact },
      originalText: message,
    };
  }

  private parseExplicitTask(message: string, contact?: string): Intent {
    const taskText = message.substring(5).trim();
    const priority = this.detectPriority(taskText);
    const dueDate = this.extractTime(taskText);

    return {
      type: 'task',
      confidence: 1.0,
      extractedData: {
        title: taskText.replace(/\s+(urgent|asap|high priority)/gi, '').trim(),
        priority,
        dueDate,
        contact,
      },
      originalText: message,
      suggestedAction: 'Create task automatically',
    };
  }

  private detectTaskIntent(message: string): Intent | null {
    for (const pattern of this.taskPatterns) {
      const match = message.match(pattern.pattern);
      if (match) {
        const taskTitle = match[1]?.trim();
        if (taskTitle && taskTitle.length > 3) {
          const dueDate = this.extractTime(message);
          return {
            type: 'task',
            confidence: 0.85,
            extractedData: {
              title: taskTitle,
              priority: pattern.priority as any,
              dueDate,
            },
            originalText: message,
            suggestedAction: 'Suggest creating task',
          };
        }
      }
    }
    return null;
  }

  private detectMeetingIntent(message: string): Intent | null {
    for (const pattern of this.meetingPatterns) {
      const match = message.match(pattern.pattern);
      if (match) {
        return {
          type: 'meeting',
          confidence: 0.8,
          extractedData: {
            time: match[1],
            title: 'Meeting Request',
          },
          originalText: message,
          suggestedAction: 'Add to calendar',
        };
      }
    }
    return null;
  }

  private detectDelayIntent(message: string): Intent | null {
    for (const pattern of this.delayPatterns) {
      if (pattern.pattern.test(message)) {
        const newTime = message.match(/(?:to|till|until)\s+(.+?)(?:\.|$)/i);
        return {
          type: pattern.type as any,
          confidence: 0.9,
          extractedData: {
            title: 'Schedule Change Detected',
            ...(newTime && { time: newTime[1] }),
          },
          originalText: message,
          suggestedAction: 'Trigger Ripple Effect',
        };
      }
    }
    return null;
  }

  private detectPriority(text: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lowerText = text.toLowerCase();
    if (/urgent|asap|critical|immediately/i.test(lowerText)) return 'urgent';
    if (/important|high priority|soon/i.test(lowerText)) return 'high';
    if (/low priority|when possible|eventually/i.test(lowerText)) return 'low';
    return 'medium';
  }

  private extractTime(text: string): string | undefined {
    const today = new Date();
    
    for (const pattern of this.timePatterns) {
      const match = text.match(pattern.pattern);
      if (match) {
        if ('offset' in pattern) {
          const targetDate = new Date(today);
          targetDate.setDate(today.getDate() + pattern.offset);
          return targetDate.toISOString().split('T')[0];
        } else if ('day' in pattern) {
          const targetDate = new Date(today);
          const currentDay = today.getDay();
          const targetDay = pattern.day;
          const daysToAdd = (targetDay - currentDay + 7) % 7 || 7;
          targetDate.setDate(today.getDate() + daysToAdd);
          return targetDate.toISOString().split('T')[0];
        } else if ('isDate' in pattern) {
          return match[1]; // Return date as-is
        }
      }
    }
    return undefined;
  }

  /**
   * Generate communication summary from chat messages
   */
  generateCommunicationSummary(
    messages: Array<{ text: string; sender: string; timestamp: string; source: string }>
  ): CommunicationSummary[] {
    // Group messages by contact
    const groupedByContact = new Map<string, typeof messages>();
    
    messages.forEach(msg => {
      const contact = msg.sender;
      if (!groupedByContact.has(contact)) {
        groupedByContact.set(contact, []);
      }
      groupedByContact.get(contact)!.push(msg);
    });

    // Generate summary for each contact
    const summaries: CommunicationSummary[] = [];
    
    groupedByContact.forEach((msgs, contact) => {
      const intents = msgs.map(m => this.analyzeIntent(m.text, contact));
      const urgentItems = intents.filter(i => i.extractedData.priority === 'urgent').length;
      const pendingTasks = intents.filter(i => i.type === 'task').length;
      const delays = intents.filter(i => i.type === 'delay' || i.type === 'reschedule').length;
      
      // Detect project from keywords
      const project = this.detectProject(msgs.map(m => m.text).join(' '));
      
      // Extract key topics
      const keyTopics = this.extractKeyTopics(msgs.map(m => m.text));
      
      // Determine sentiment
      let sentiment: 'positive' | 'neutral' | 'urgent' | 'delayed' = 'neutral';
      if (urgentItems > 0) sentiment = 'urgent';
      else if (delays > 0) sentiment = 'delayed';
      else if (msgs.some(m => /great|awesome|perfect|thanks/i.test(m.text))) sentiment = 'positive';
      
      // Generate natural language summary
      const summary = this.generateNaturalSummary(contact, msgs, intents, project);
      
      summaries.push({
        contact,
        project,
        messageCount: msgs.length,
        lastActivity: msgs[msgs.length - 1].timestamp,
        keyTopics,
        urgentItems,
        pendingTasks,
        sentiment,
        summary,
      });
    });

    return summaries;
  }

  private detectProject(text: string): string | undefined {
    const projectKeywords = [
      { pattern: /\b(project|client)\s+(\w+)/i, type: 'explicit' },
      { pattern: /\b(acme|techcorp|designco|startupx)\b/i, type: 'client' },
      { pattern: /\b(q1|q2|quarterly|annual)\s+(report|review)/i, type: 'periodic' },
    ];

    for (const keyword of projectKeywords) {
      const match = text.match(keyword.pattern);
      if (match) {
        return match[2] || match[1];
      }
    }
    return undefined;
  }

  private extractKeyTopics(texts: string[]): string[] {
    const allText = texts.join(' ').toLowerCase();
    const stopWords = ['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for'];
    
    // Extract words that appear frequently
    const wordFreq = new Map<string, number>();
    const words = allText.match(/\b\w{4,}\b/g) || [];
    
    words.forEach(word => {
      if (!stopWords.includes(word)) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });

    // Get top 3 topics
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word]) => word);
  }

  private generateNaturalSummary(
    contact: string,
    messages: Array<{ text: string }>,
    intents: Intent[],
    project?: string
  ): string {
    const taskIntents = intents.filter(i => i.type === 'task');
    const delayIntents = intents.filter(i => i.type === 'delay' || i.type === 'reschedule');
    const urgentIntents = intents.filter(i => i.extractedData.priority === 'urgent');

    let summary = `${contact} sent ${messages.length} message${messages.length > 1 ? 's' : ''}`;
    
    if (project) {
      summary += ` about ${project}`;
    }
    
    if (urgentIntents.length > 0) {
      summary += `. 🔴 ${urgentIntents.length} urgent item${urgentIntents.length > 1 ? 's' : ''} detected`;
    }
    
    if (taskIntents.length > 0) {
      summary += `. Created ${taskIntents.length} task${taskIntents.length > 1 ? 's' : ''}`;
    }
    
    if (delayIntents.length > 0) {
      summary += `. ⚠️ Schedule changes detected - Ripple Effect recommended`;
    }

    return summary + '.';
  }

  /**
   * Ripple Effect: Re-balance schedule when changes occur
   */
  calculateRippleEffect(
    affectedEventId: string,
    changeType: 'delay' | 'cancel' | 'reschedule',
    newTime?: string
  ): {
    affectedEvents: Array<{ id: string; action: string; suggestedTime?: string }>;
    bufferAdjustments: Array<{ beforeEvent: string; newBuffer: number }>;
    recommendations: string[];
  } {
    // Mock implementation - in production this would analyze actual calendar data
    const recommendations: string[] = [];
    const affectedEvents: Array<{ id: string; action: string; suggestedTime?: string }> = [];
    const bufferAdjustments: Array<{ beforeEvent: string; newBuffer: number }> = [];

    if (changeType === 'delay') {
      recommendations.push('⚡ Detected schedule delay - analyzing downstream impacts...');
      recommendations.push('📅 3 events may need rescheduling to maintain smart buffers');
      recommendations.push('🔄 Suggested: Compress non-critical meetings by 15 minutes each');
      
      affectedEvents.push(
        { id: 'event-2', action: 'Compress by 15 min', suggestedTime: '2:45 PM' },
        { id: 'event-3', action: 'Move to tomorrow', suggestedTime: 'Tomorrow 10:00 AM' }
      );
      
      bufferAdjustments.push(
        { beforeEvent: 'event-2', newBuffer: 10 },
        { beforeEvent: 'event-3', newBuffer: 15 }
      );
    } else if (changeType === 'cancel') {
      recommendations.push('✅ Event cancelled - reclaiming 1 hour of focus time');
      recommendations.push('💡 Consider advancing lower-priority tasks into this slot');
      
      affectedEvents.push(
        { id: 'task-5', action: 'Advance to freed slot', suggestedTime: 'Today 3:00 PM' }
      );
    } else if (changeType === 'reschedule') {
      recommendations.push('🔄 Event rescheduled - optimizing surrounding buffer times');
      
      bufferAdjustments.push(
        { beforeEvent: 'event-next', newBuffer: 20 }
      );
    }

    return { affectedEvents, bufferAdjustments, recommendations };
  }

  /**
   * HABIT LEARNING: Track and learn user patterns over time
   */
  private habits: UserHabit[] = [];
  private readonly HABIT_STORAGE_KEY = 'syncflow_user_habits';

  loadHabits(): void {
    try {
      const stored = localStorage.getItem(this.HABIT_STORAGE_KEY);
      if (stored) {
        this.habits = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load habits:', e);
    }
  }

  saveHabits(): void {
    try {
      localStorage.setItem(this.HABIT_STORAGE_KEY, JSON.stringify(this.habits));
    } catch (e) {
      console.error('Failed to save habits:', e);
    }
  }

  learnFromUserBehavior(eventType: string, context: any): void {
    // Track buffer preferences
    if (eventType === 'buffer_used' && context.duration) {
      this.recordHabit({
        type: 'buffer',
        pattern: `${context.beforeEvent || 'general'}_buffer`,
        metadata: { averageBufferTime: context.duration, contextTags: [context.eventType] },
      });
    }

    // Track typical delays
    if (eventType === 'schedule_delay' && context.delayMinutes) {
      this.recordHabit({
        type: 'delay_pattern',
        pattern: `${context.dayOfWeek || 'general'}_delay`,
        metadata: { delayFrequency: context.delayMinutes },
      });
    }

    // Track meeting patterns
    if (eventType === 'meeting_completed' && context.duration) {
      this.recordHabit({
        type: 'meeting_pattern',
        pattern: `${context.meetingType || 'general'}_duration`,
        metadata: { typicalDuration: context.duration },
      });
    }

    // Track preferred time slots
    if (eventType === 'task_scheduled' && context.timeSlot) {
      this.recordHabit({
        type: 'schedule',
        pattern: `preferred_time_${context.taskType || 'general'}`,
        metadata: { preferredTimeSlots: [context.timeSlot] },
      });
    }

    this.saveHabits();
  }

  private recordHabit(input: { type: UserHabit['type']; pattern: string; metadata: UserHabit['metadata'] }): void {
    const existingHabit = this.habits.find(h => h.type === input.type && h.pattern === input.pattern);
    
    if (existingHabit) {
      // Update existing habit
      existingHabit.occurrences += 1;
      existingHabit.confidence = Math.min(0.95, existingHabit.confidence + 0.05);
      existingHabit.lastObserved = new Date().toISOString();
      
      // Merge metadata (calculate averages for numeric values)
      if (input.metadata.averageBufferTime && existingHabit.metadata.averageBufferTime) {
        existingHabit.metadata.averageBufferTime = 
          (existingHabit.metadata.averageBufferTime * (existingHabit.occurrences - 1) + input.metadata.averageBufferTime) / existingHabit.occurrences;
      }
      if (input.metadata.typicalDuration && existingHabit.metadata.typicalDuration) {
        existingHabit.metadata.typicalDuration = 
          (existingHabit.metadata.typicalDuration * (existingHabit.occurrences - 1) + input.metadata.typicalDuration) / existingHabit.occurrences;
      }
      if (input.metadata.preferredTimeSlots) {
        existingHabit.metadata.preferredTimeSlots = [
          ...(existingHabit.metadata.preferredTimeSlots || []),
          ...input.metadata.preferredTimeSlots,
        ];
      }
    } else {
      // Create new habit
      this.habits.push({
        id: `habit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: input.type,
        pattern: input.pattern,
        confidence: 0.3,
        occurrences: 1,
        lastObserved: new Date().toISOString(),
        metadata: input.metadata,
      });
    }
  }

  getLearnedBufferTime(eventContext: string): number | null {
    const bufferHabit = this.habits.find(
      h => h.type === 'buffer' && h.pattern.includes(eventContext) && h.confidence > 0.6
    );
    return bufferHabit?.metadata.averageBufferTime || null;
  }

  getUserHabits(minConfidence = 0.5): UserHabit[] {
    return this.habits.filter(h => h.confidence >= minConfidence);
  }

  /**
   * AUTO-APPLY: Automatically apply schedule changes based on learned habits
   */
  generateScheduleChanges(
    rippleEffect: {
      affectedEvents: Array<{ id: string; action: string; suggestedTime?: string }>;
      bufferAdjustments: Array<{ beforeEvent: string; newBuffer: number }>;
    },
    userPreferences: { autoApplyThreshold: number; requireConfirmation: boolean }
  ): ScheduleChange[] {
    const changes: ScheduleChange[] = [];

    // Apply buffer adjustments based on learned habits
    rippleEffect.bufferAdjustments.forEach(adjustment => {
      const learnedBuffer = this.getLearnedBufferTime(adjustment.beforeEvent);
      const finalBuffer = learnedBuffer || adjustment.newBuffer;

      changes.push({
        eventId: adjustment.beforeEvent,
        changeType: 'buffer_adjust',
        newTime: `+${finalBuffer}min`,
        reason: learnedBuffer 
          ? `Applied learned buffer preference (${finalBuffer} min based on your habits)`
          : `Applied standard buffer (${finalBuffer} min)`,
        confidence: learnedBuffer ? 0.85 : 0.65,
      });
    });

    // Apply event reschedules
    rippleEffect.affectedEvents.forEach(event => {
      if (event.suggestedTime) {
        changes.push({
          eventId: event.id,
          changeType: 'reschedule',
          newTime: event.suggestedTime,
          reason: event.action,
          confidence: 0.75,
        });
      }
    });

    // Filter by confidence threshold if auto-apply is enabled
    if (!userPreferences.requireConfirmation) {
      return changes.filter(c => c.confidence >= userPreferences.autoApplyThreshold);
    }

    return changes;
  }

  /**
   * NOTIFICATIONS: Generate proactive notifications for chat platforms
   */
  generateNotifications(
    scheduleChanges: ScheduleChange[],
    userContact: string,
    platform: 'whatsapp' | 'telegram' | 'messenger'
  ): NotificationPayload[] {
    const notifications: NotificationPayload[] = [];

    // Group changes by type
    const reschedules = scheduleChanges.filter(c => c.changeType === 'reschedule');
    const bufferAdjustments = scheduleChanges.filter(c => c.changeType === 'buffer_adjust');

    // Send schedule change notification
    if (reschedules.length > 0) {
      const message = this.formatScheduleChangeMessage(reschedules);
      notifications.push({
        recipient: userContact,
        platform,
        type: 'schedule_change',
        message,
        actionRequired: false,
        metadata: { changes: reschedules },
      });
    }

    // Send buffer adjustment notification
    if (bufferAdjustments.length > 0) {
      notifications.push({
        recipient: userContact,
        platform,
        type: 'buffer_alert',
        message: `🕐 Smart buffers adjusted for ${bufferAdjustments.length} event(s) based on your habits. Check your calendar for updated times.`,
        actionRequired: false,
        metadata: { adjustments: bufferAdjustments },
      });
    }

    // Send habit-based suggestions
    const highConfidenceHabits = this.getUserHabits(0.8);
    if (highConfidenceHabits.length > 0 && Math.random() < 0.1) { // Send occasionally
      const habit = highConfidenceHabits[0];
      notifications.push({
        recipient: userContact,
        platform,
        type: 'habit_suggestion',
        message: `💡 Insight: Based on your patterns, consider adding ${habit.metadata.averageBufferTime || 15} min buffer before important meetings.`,
        actionRequired: false,
        metadata: { habit },
      });
    }

    return notifications;
  }

  private formatScheduleChangeMessage(reschedules: ScheduleChange[]): string {
    if (reschedules.length === 1) {
      return `📅 Schedule Update: Event rescheduled to ${reschedules[0].newTime}. Reason: ${reschedules[0].reason}`;
    }
    
    let message = `📅 Multiple Schedule Changes (${reschedules.length} events):\n\n`;
    reschedules.forEach((change, idx) => {
      message += `${idx + 1}. ${change.eventId}: ${change.newTime}\n`;
    });
    message += `\nCheck your calendar for details.`;
    
    return message;
  }

  /**
   * SMART REMINDERS: Generate context-aware reminders based on learned patterns
   */
  generateSmartReminder(event: { id: string; title: string; time: string; type: string }): NotificationPayload | null {
    // Find relevant habits
    const bufferHabit = this.habits.find(
      h => h.type === 'buffer' && h.pattern.includes(event.type) && h.confidence > 0.7
    );

    if (bufferHabit) {
      const reminderMinutes = bufferHabit.metadata.averageBufferTime || 15;
      return {
        recipient: 'user',
        platform: 'whatsapp', // Default, should be user preference
        type: 'reminder',
        message: `⏰ Reminder: "${event.title}" starts at ${event.time}. Based on your habits, you typically need ${reminderMinutes} min prep time.`,
        actionRequired: false,
        metadata: { event, reminderMinutes },
      };
    }

    return null;
  }
}

// Singleton instance
export const aiEngine = new AIEngine();

// Load habits on initialization
aiEngine.loadHabits();
