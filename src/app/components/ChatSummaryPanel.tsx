import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Sparkles, Settings, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useIntegrations } from '../contexts/IntegrationContext';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  addChatCreatedTask,
  addCreatedKeyPointId,
  loadChatSummaryKeyPoints,
  loadCreatedKeyPointIds,
  saveChatSummaryKeyPoints,
} from '../services/chatSimulatorStorage';
import { toast } from 'sonner';
import { ChatSummarySettings } from './ChatSummarySettings';

const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

const getMalaysiaClock = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MALAYSIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const readPart = (type: 'hour' | 'minute' | 'second') =>
    Number(parts.find(part => part.type === type)?.value ?? '0');

  return {
    hour: readPart('hour'),
    minute: readPart('minute'),
    second: readPart('second'),
  };
};

const formatCountdown = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map(value => value.toString().padStart(2, '0'))
    .join(':');
};

const formatHourTarget = (hour24: number) => {
  const normalized = ((hour24 % 24) + 24) % 24;
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  const period = normalized >= 12 ? 'PM' : 'AM';
  return `${hour12.toString().padStart(2, '0')}:00 ${period} MYT`;
};

interface KeyPoint {
  id: number;
  text: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
  timestamp: string;
  isTask: boolean;
}

// Pool of mock AI-generated key points from chat analysis
const mockKeyPointsPool: KeyPoint[] = [
  {
    id: 1,
    text: 'Follow up on budget approval - Mentioned by Sarah Chen',
    priority: 'high',
    source: 'whatsapp',
    timestamp: '10 min ago',
    isTask: true,
  },
  {
    id: 2,
    text: 'Deployment to production completed successfully',
    priority: 'medium',
    source: 'telegram',
    timestamp: '25 min ago',
    isTask: false,
  },
  {
    id: 3,
    text: 'Reschedule 3pm meeting - Marcus Wright requesting change',
    priority: 'high',
    source: 'messenger',
    timestamp: '1 hr ago',
    isTask: true,
  },
  {
    id: 4,
    text: 'Design mockups approved by client',
    priority: 'low',
    source: 'whatsapp',
    timestamp: '2 hr ago',
    isTask: false,
  },
  {
    id: 5,
    text: 'Server maintenance scheduled for tonight at 11 PM',
    priority: 'medium',
    source: 'telegram',
    timestamp: '3 hr ago',
    isTask: false,
  },
  {
    id: 6,
    text: 'Code review needed for PR #234 - Jake mentioned urgency',
    priority: 'high',
    source: 'telegram',
    timestamp: '15 min ago',
    isTask: true,
  },
  {
    id: 7,
    text: 'Client feedback on new feature is very positive',
    priority: 'low',
    source: 'whatsapp',
    timestamp: '45 min ago',
    isTask: false,
  },
  {
    id: 8,
    text: 'Update API documentation - Team request',
    priority: 'medium',
    source: 'messenger',
    timestamp: '1.5 hr ago',
    isTask: true,
  },
  {
    id: 9,
    text: 'Security patch released for Node.js dependencies',
    priority: 'high',
    source: 'telegram',
    timestamp: '30 min ago',
    isTask: true,
  },
  {
    id: 10,
    text: 'Coffee meeting scheduled with marketing team',
    priority: 'low',
    source: 'whatsapp',
    timestamp: '2.5 hr ago',
    isTask: false,
  },
  {
    id: 11,
    text: 'Database backup completed without errors',
    priority: 'medium',
    source: 'telegram',
    timestamp: '4 hr ago',
    isTask: false,
  },
  {
    id: 12,
    text: 'User reported bug in payment flow - needs investigation',
    priority: 'high',
    source: 'messenger',
    timestamp: '20 min ago',
    isTask: true,
  },
  {
    id: 13,
    text: 'New design assets uploaded to shared drive',
    priority: 'low',
    source: 'whatsapp',
    timestamp: '3 hr ago',
    isTask: false,
  },
  {
    id: 14,
    text: 'Sprint planning session moved to Friday',
    priority: 'medium',
    source: 'messenger',
    timestamp: '50 min ago',
    isTask: false,
  },
  {
    id: 15,
    text: 'Performance optimization needed for dashboard load time',
    priority: 'high',
    source: 'telegram',
    timestamp: '35 min ago',
    isTask: true,
  },
];

// Generate random selection of key points
const generateRandomKeyPoints = (pool: KeyPoint[], count: number = 5): KeyPoint[] => {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

interface ChatSummaryPanelProps {
  onSummaryCountChange?: (count: number) => void;
}

export function ChatSummaryPanel({ onSummaryCountChange }: ChatSummaryPanelProps) {
  const { state } = useIntegrations();
  const { user } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [convertedTasks, setConvertedTasks] = useState<number[]>([]);
  const [summaryCountdown, setSummaryCountdown] = useState('');
  const [nextSummaryTarget, setNextSummaryTarget] = useState('');
  const [displayedKeyPoints, setDisplayedKeyPoints] = useState<KeyPoint[]>([]);

  const connectedChats = state.chats.filter(c => c.connected);
  const settings = state.chatSummarySettings || {
    enableAutoSummary: false,
    summaryInterval: 'realtime' as const,
    selectedChannels: [],
    keywordFilters: [],
    autoConvertTasks: false,
  };

  useEffect(() => {
    setConvertedTasks(loadCreatedKeyPointIds(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    const persisted = loadChatSummaryKeyPoints(user);

    if (persisted.length > 0) {
      setDisplayedKeyPoints(persisted);
      return;
    }

    const initialKeyPoints = generateRandomKeyPoints(mockKeyPointsPool);
    setDisplayedKeyPoints(initialKeyPoints);
    saveChatSummaryKeyPoints(user, initialKeyPoints);
  }, [user?.id, user?.email]);

  // Filter key points based on connected channels and settings
  const visibleKeyPoints = displayedKeyPoints.filter(point =>
    connectedChats.some(c => c.id === point.source) &&
    (settings.selectedChannels.length === 0 || settings.selectedChannels.includes(point.source))
  );

  useEffect(() => {
    onSummaryCountChange?.(visibleKeyPoints.length);
  }, [onSummaryCountChange, visibleKeyPoints.length]);

  useEffect(() => {
    if (!settings.enableAutoSummary || settings.summaryInterval === 'realtime') {
      setSummaryCountdown('');
      setNextSummaryTarget('');
      return;
    }

    const updateCountdown = () => {
      const { hour, minute, second } = getMalaysiaClock();

      if (settings.summaryInterval === 'hourly') {
        const elapsedThisHour = minute * 60 + second;
        const secondsUntilNextHour = elapsedThisHour === 0 ? 3600 : 3600 - elapsedThisHour;
        const nextHour = (hour + 1) % 24;
        setSummaryCountdown(formatCountdown(secondsUntilNextHour));
        setNextSummaryTarget(formatHourTarget(nextHour));
        return;
      }

      const elapsedToday = hour * 3600 + minute * 60 + second;
      const secondsUntilMidnight = elapsedToday === 0 ? 86400 : 86400 - elapsedToday;
      setSummaryCountdown(formatCountdown(secondsUntilMidnight));
      setNextSummaryTarget('12:00 AM MYT (00:00)');
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [settings.enableAutoSummary, settings.summaryInterval]);

  const handleGenerateSummary = () => {
    setIsGenerating(true);
    // Simulate AI processing and generate new key points
    setTimeout(() => {
      const nextKeyPoints = generateRandomKeyPoints(mockKeyPointsPool);
      setDisplayedKeyPoints(nextKeyPoints);
      saveChatSummaryKeyPoints(user, nextKeyPoints);
      setIsGenerating(false);
    }, 2000);
  };

  const getTodayDisplayDate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleConvertToTask = (keyPointId: number) => {
    const keyPoint = visibleKeyPoints.find((point) => point.id === keyPointId);
    if (!keyPoint) return;

    const activeTaskProvider = state.tasks.find((task) => task.connected);
    if (!activeTaskProvider) {
      toast.error('No task provider connected. Please connect one in Task Integration first.');
      return;
    }

    const taskTitle = `${keyPoint.text} (Created From Chat Key Points)`;

    addChatCreatedTask(user, {
      id: `summary-task-${keyPoint.id}-${Date.now()}`,
      title: taskTitle,
      due: getTodayDisplayDate(),
      providerId: activeTaskProvider.id,
      sourceChatProviderId: keyPoint.source,
      createdAt: new Date().toISOString(),
    });

    addCreatedKeyPointId(user, keyPointId);
    setConvertedTasks(prev => (prev.includes(keyPointId) ? prev : [...prev, keyPointId]));
    toast.success('Task created from Chat Key Point.');
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'whatsapp': return '#25D366';
      case 'telegram': return '#0088CC';
      case 'messenger': return '#0084FF';
      default: return '#6366F1';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: '#EF444420', text: '#EF4444' };
      case 'medium': return { bg: '#F59E0B20', text: '#F59E0B' };
      case 'low': return { bg: '#6B728020', text: '#6B7280' };
      default: return { bg: '#6B728020', text: '#6B7280' };
    }
  };

  return (
    <>
      <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" style={{ color: '#22D3EE' }} />
              <CardTitle style={{ color: '#E5E7EB' }}>Chat Key Points</CardTitle>
              {settings.enableAutoSummary && (
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#22D3EE20', color: '#22D3EE' }}>
                  Auto {settings.summaryInterval}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateSummary}
                disabled={isGenerating || connectedChats.length === 0}
                style={{ borderColor: '#6366F1', color: '#6366F1' }}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating ? 'Analyzing...' : 'Summarize'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSettingsOpen(true)}
                style={{ borderColor: '#374151', color: '#9CA3AF' }}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {settings.enableAutoSummary && settings.summaryInterval !== 'realtime' && (
            <div
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#0F172A', border: '1px solid #374151' }}
            >
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Next summary in Malaysia time (MYT)
              </p>
              <p className="text-sm mt-1" style={{ color: '#E5E7EB' }}>
                Target: {nextSummaryTarget}
              </p>
              <p className="text-sm" style={{ color: '#22D3EE' }}>
                Countdown: {summaryCountdown}
              </p>
            </div>
          )}

          {connectedChats.length === 0 ? (
            <div className="p-8 text-center" style={{ color: '#9CA3AF' }}>
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No chat channels connected</p>
              <p className="text-xs mt-1">Connect channels to see AI-powered summaries</p>
            </div>
          ) : !settings.enableAutoSummary && visibleKeyPoints.length === 0 ? (
            <div className="p-8 text-center" style={{ color: '#9CA3AF' }}>
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Chat summary disabled</p>
              <p className="text-xs mt-1">Enable auto-summary in settings</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => setSettingsOpen(true)}
                style={{ backgroundColor: '#6366F1', color: '#fff' }}
              >
                Configure Settings
              </Button>
            </div>
          ) : visibleKeyPoints.length === 0 ? (
            <div className="p-8 text-center" style={{ color: '#9CA3AF' }}>
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No key points extracted yet</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={handleGenerateSummary}
                style={{ backgroundColor: '#6366F1', color: '#fff' }}
              >
                Generate Summary
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: '#22D3EE10', borderLeft: '3px solid #22D3EE' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#22D3EE' }} />
                  <p className="text-sm font-medium" style={{ color: '#E5E7EB' }}>
                    {visibleKeyPoints.length} key point{visibleKeyPoints.length !== 1 ? 's' : ''} identified
                  </p>
                </div>
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  AI-powered analysis from {connectedChats.length} channel{connectedChats.length !== 1 ? 's' : ''}
                </p>
              </div>

              {visibleKeyPoints.map(point => {
                const isConverted = convertedTasks.includes(point.id);
                const priorityColors = getPriorityColor(point.priority);
                
                return (
                  <div
                    key={point.id}
                    className="p-3 rounded-lg border-l-4"
                    style={{
                      backgroundColor: '#0F172A',
                      borderColor: getSourceColor(point.source),
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs px-2 py-0.5 rounded uppercase font-medium"
                            style={{
                              backgroundColor: priorityColors.bg,
                              color: priorityColors.text,
                            }}
                          >
                            {point.priority}
                          </span>
                          <span className="text-xs" style={{ color: '#9CA3AF' }}>
                            {point.timestamp}
                          </span>
                        </div>
                        <p style={{ color: '#E5E7EB', fontSize: '0.95rem' }}>{point.text}</p>
                      </div>
                      {point.isTask && !isConverted && (
                        <Button
                          size="sm"
                          onClick={() => handleConvertToTask(point.id)}
                          style={{ backgroundColor: '#6366F1', color: '#fff', fontSize: '0.75rem' }}
                        >
                          Create Task
                        </Button>
                      )}
                      {isConverted && (
                        <div className="flex items-center gap-1" style={{ color: '#22D3EE' }}>
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-xs">Created</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      <ChatSummarySettings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
