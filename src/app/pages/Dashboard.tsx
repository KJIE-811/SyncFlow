import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, ChevronDown, ChevronUp, Clock, Database, Link, MessageSquare, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useIntegrations } from '../contexts/IntegrationContext';
import { useAI } from '../contexts/AIContext';
import { ConnectionStatusCard } from '../components/ConnectionStatusCard';
import { RippleEffectModal } from '../components/RippleEffectModal';
import { ChatSummaryPanel } from '../components/ChatSummaryPanel';
import { toast } from 'sonner';

// Mock data for unified display
const mockTasks = [
  { id: 1, title: 'Review Q1 Performance Reports', dueDate: '2026-04-23', priority: 'high', status: 'pending', completed: false, provider: 'microsoft-todo' },
  { id: 2, title: 'Prepare Client Presentation', dueDate: '2026-04-24', priority: 'high', status: 'in-progress', completed: false, provider: 'google-tasks' },
  { id: 3, title: 'Update Project Documentation', dueDate: '2026-04-25', priority: 'medium', status: 'pending', completed: false, provider: 'todoist' },
  { id: 4, title: 'Team Sync Meeting', dueDate: '2026-04-23', priority: 'low', status: 'completed', completed: true, provider: 'microsoft-todo' },
  { id: 5, title: 'Code Review - Feature Branch', dueDate: '2026-04-23', priority: 'medium', status: 'in-progress', completed: false, provider: 'google-tasks' },
];

const mockCalendarEvents = [
  { id: 1, title: 'Daily Standup', time: '09:00 AM', duration: '15 min', provider: 'google' },
  { id: 2, title: 'Client Call - Acme Corp', time: '11:00 AM', duration: '1 hr', provider: 'outlook' },
  { id: 3, title: 'Lunch Break', time: '12:30 PM', duration: '30 min', provider: 'google' },
  { id: 4, title: 'Design Review', time: '02:00 PM', duration: '45 min', provider: 'apple' },
];

export function Dashboard() {
  const { state, updateCalendarTaskSync } = useIntegrations();
  const { communicationSummaries } = useAI();
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [liveSummaryCount, setLiveSummaryCount] = useState(communicationSummaries.length);
  const [checkedTimelineTaskIds, setCheckedTimelineTaskIds] = useState<number[]>([]);
  const [completingTimelineTaskIds, setCompletingTimelineTaskIds] = useState<number[]>([]);
  const [dismissedTimelineTaskIds, setDismissedTimelineTaskIds] = useState<number[]>([]);

  const bufferPresets = [5, 10, 15, 20, 30];
  const nextUpBaseTime = '02:00 PM';

  const connectedCalendars = state.calendars.filter(c => c.connected);
  const connectedTasks = state.tasks.filter(t => t.connected);
  const connectedChats = state.chats.filter(c => c.connected);
  const calendarTaskSync = state.calendarTaskSync;
  const bufferMinutes = calendarTaskSync.defaultBufferMinutes;

  // Check if calendar-task integration is active
  const isIntegrationActive = connectedCalendars.length > 0 && connectedTasks.length > 0 && calendarTaskSync.showTasksInCalendarView;

  // Filter displayed data based on connected providers
  const visibleCalendarEvents = mockCalendarEvents.filter(event => 
    connectedCalendars.some(cal => cal.id === event.provider)
  );

  const visibleTasks = mockTasks.filter(task => 
    connectedTasks.some(t => t.id === task.provider)
  );

  const totalTasks = visibleTasks.length;
  const pendingTaskCount = visibleTasks.filter(t => !t.completed).length;
  const summaryCount = liveSummaryCount;
  const focusHours = 4.2;

  const totalConnections = connectedCalendars.length + connectedTasks.length + connectedChats.length;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timelineItems = useMemo(() => {
    const parseEventTime = (time: string) => {
      const parsed = new Date(`${today.toDateString()} ${time}`);
      return Number.isNaN(parsed.getTime()) ? today.getTime() : parsed.getTime();
    };

    const items = [
      ...visibleCalendarEvents.map(event => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        title: event.title,
        detail: `${event.time} • ${event.duration}`,
        sortKey: parseEventTime(event.time),
      })),
      ...visibleTasks
        .filter(task => !task.completed && !dismissedTimelineTaskIds.includes(task.id))
        .map(task => ({
          id: `task-${task.id}`,
          type: 'task' as const,
          taskId: task.id,
          title: task.title,
          detail: `Due: ${task.dueDate}`,
          sortKey: new Date(`${task.dueDate}T23:59:00`).getTime(),
        })),
    ];

    return items.sort((a, b) => a.sortKey - b.sortKey);
  }, [today, visibleCalendarEvents, visibleTasks, dismissedTimelineTaskIds]);

  const visibleTimelineItems = showAllTimeline ? timelineItems : timelineItems.slice(0, 3);

  const nextUpWithBuffer = useMemo(() => {
    const parsed = new Date(`${today.toDateString()} ${nextUpBaseTime}`);
    if (Number.isNaN(parsed.getTime())) {
      return `${nextUpBaseTime} (+${bufferMinutes}m buffer)`;
    }

    parsed.setMinutes(parsed.getMinutes() + bufferMinutes);
    return `${parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })} (+${bufferMinutes}m buffer)`;
  }, [bufferMinutes, nextUpBaseTime, today]);

  const handleAdjustBuffer = () => {
    updateCalendarTaskSync({
      ...calendarTaskSync,
      defaultBufferMinutes: (() => {
        const currentIndex = bufferPresets.indexOf(bufferMinutes);
        return bufferPresets[(currentIndex + 1) % bufferPresets.length];
      })(),
    });
    const currentIndex = bufferPresets.indexOf(bufferMinutes);
    const nextBuffer = bufferPresets[(currentIndex + 1) % bufferPresets.length];
    toast.success(`Smart buffer set to ${nextBuffer} minutes`);
  };

  const handleTimelineTaskComplete = (taskId: number) => {
    if (checkedTimelineTaskIds.includes(taskId) || dismissedTimelineTaskIds.includes(taskId)) {
      return;
    }

    setCheckedTimelineTaskIds(previous => [...previous, taskId]);

    // Show the tick first, then fade the card out for clear completion feedback.
    window.setTimeout(() => {
      setCompletingTimelineTaskIds(previous => {
        if (previous.includes(taskId)) return previous;
        return [...previous, taskId];
      });
    }, 180);

    window.setTimeout(() => {
      setDismissedTimelineTaskIds(previous => {
        if (previous.includes(taskId)) return previous;
        return [...previous, taskId];
      });
      setCompletingTimelineTaskIds(previous => previous.filter(id => id !== taskId));
      setCheckedTimelineTaskIds(previous => previous.filter(id => id !== taskId));
    }, 850);
  };

  return (
    <div className="p-8 space-y-6" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Command Center</h1>
          <p className="mt-1" style={{ color: '#9CA3AF' }}>{formattedDate}</p>
        </div>
        <div className="flex items-center gap-3">
          {totalConnections > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#1E293B', border: '1px solid #374151' }}>
              <Database className="w-4 h-4" style={{ color: '#22D3EE' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                Sources {connectedCalendars.length}C / {connectedTasks.length}T / {connectedChats.length}H
              </span>
            </div>
          )}
          {state.forceLocalOnly && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#EF444420', borderColor: '#EF4444', border: '1px solid' }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }}></div>
              <span className="text-sm font-medium" style={{ color: '#EF4444' }}>Local-Only Mode</span>
            </div>
          )}
          <Button 
            className="shadow-lg" 
            style={{ backgroundColor: '#6366F1', color: '#fff' }}
          >
            <Clock className="w-4 h-4 mr-2" />
            Start Focus Session
          </Button>
        </div>
      </div>

      {/* Horizontal Metrics Bar */}
      <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardContent className="py-3 flex items-center justify-center">
          <div className="flex w-full flex-wrap gap-4 text-sm" style={{ color: '#E5E7EB', paddingTop: '10px' }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#6366F1' }} />
              <span>{totalTasks} Tasks</span>
            </div>
            <span style={{ color: '#6B7280' }}>•</span>
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" style={{ color: '#22D3EE' }} />
              <span>{visibleCalendarEvents.length} Events</span>
            </div>
            <span style={{ color: '#6B7280' }}>•</span>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: '#F59E0B' }} />
              <span>{focusHours}h Focus</span>
            </div>
            <span style={{ color: '#6B7280' }}>•</span>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" style={{ color: '#10B981' }} />
              <span>{summaryCount} Summaries</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Banner */}
      {totalConnections > 0 ? (
        <Card style={{ backgroundColor: '#1E293B', borderColor: '#22D3EE' }}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5" style={{ color: '#22D3EE' }} />
                <div>
                  <p className="font-medium" style={{ color: '#E5E7EB' }}>
                    Unified Data Stream Active
                  </p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    {connectedCalendars.length} calendar{connectedCalendars.length !== 1 ? 's' : ''} • {' '}
                    {connectedTasks.length} task provider{connectedTasks.length !== 1 ? 's' : ''} • {' '}
                    {connectedChats.length} chat channel{connectedChats.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22D3EE' }}></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" style={{ color: '#E5E7EB' }}>
                      Welcome to SyncFlow Command Center
                    </p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Connect your calendars, tasks, and chat platforms to see unified data here
                    </p>
                  </div>
                  <Button variant="outline" style={{ borderColor: '#6366F1', color: '#6366F1' }}>
                    Get Started
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          <ConnectionStatusCard />
        </div>
      )}

      {isIntegrationActive ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2" style={{ backgroundColor: '#1E293B', borderColor: '#22D3EE' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link className="w-6 h-6" style={{ color: '#22D3EE' }} />
                  <div>
                    <CardTitle style={{ color: '#E5E7EB' }}>Unified Timeline</CardTitle>
                    <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                      Focused view of what is happening now and what comes next
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {visibleTimelineItems.map((item) => {
                  const isTask = item.type === 'task' && 'taskId' in item;
                  const isChecked = isTask && checkedTimelineTaskIds.includes(item.taskId);
                  const isCompleting = isTask && completingTimelineTaskIds.includes(item.taskId);

                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg flex items-center gap-4"
                      style={{
                        backgroundColor: '#0F172A',
                        borderLeft: item.type === 'task' ? '4px solid #6366F1' : '4px solid #EF4444',
                        opacity: isCompleting ? 0 : 1,
                        transform: isCompleting ? 'translateY(-4px) scale(0.98)' : 'translateY(0) scale(1)',
                        transition: 'opacity 640ms ease, transform 640ms ease',
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p style={{ color: '#E5E7EB' }}>{item.title}</p>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: item.type === 'task' ? '#6366F120' : '#EF444420',
                              color: item.type === 'task' ? '#6366F1' : '#EF4444',
                              border: `1px solid ${item.type === 'task' ? '#6366F1' : '#EF4444'}`,
                            }}
                          >
                            {item.type === 'task' ? 'Task' : 'Event'}
                          </span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                          {item.detail}
                        </p>
                      </div>
                      {isTask && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isChecked}
                          className="w-5 h-5 rounded"
                          onChange={() => handleTimelineTaskComplete(item.taskId)}
                          style={{ accentColor: '#6366F1' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {timelineItems.length > 3 && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setShowAllTimeline(prev => !prev)}
                    style={{ borderColor: '#6366F1', color: '#6366F1' }}
                  >
                    {showAllTimeline ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 mr-2" />
                        Show More
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="mt-4 p-3 rounded-lg text-center" style={{ backgroundColor: '#0F172A', borderColor: '#22D3EE', border: '1px dashed' }}>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  💡 AI can suggest optimal work blocks around your upcoming events.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: '#E5E7EB' }}>
                <MessageSquare className="w-5 h-5" style={{ color: '#22D3EE' }} />
                Chat & Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Chat summaries available
                </p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#E5E7EB' }}>
                  {summaryCount}
                </p>
              </div>

              {summaryCount > 0 ? (
                <div className="space-y-2">
                  {communicationSummaries.slice(0, 3).map((summary, index) => (
                    <div key={`${summary.contact}-${index}`} className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                      <p className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{summary.contact}</p>
                      <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>{summary.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: '#9CA3AF' }}>No chat summaries generated yet.</p>
              )}
              <ChatSummaryPanel onSummaryCountChange={setLiveSummaryCount} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Widget */}
        <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" style={{ color: '#E5E7EB' }}>
                <CalendarIcon className="w-5 h-5" style={{ color: '#6366F1' }} />
                Today's Schedule
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {visibleCalendarEvents.length > 0 ? (
              visibleCalendarEvents.map(event => {
                const providerColor = event.provider === 'google' ? '#4285F4' : event.provider === 'outlook' ? '#0078D4' : '#FC3C44';
                return (
                  <div 
                    key={event.id} 
                    className="p-3 rounded-lg border-l-4"
                    style={{ backgroundColor: '#0F172A', borderColor: providerColor }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium" style={{ color: '#E5E7EB' }}>{event.title}</p>
                        <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{event.time} • {event.duration}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center" style={{ color: '#9CA3AF' }}>
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No calendars connected</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks Widget */}
        <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2" style={{ color: '#E5E7EB' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: '#6366F1' }} />
                Active Tasks
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTaskCount > 0 ? (
              visibleTasks.filter(t => !t.completed).slice(0, 4).map(task => (
                <div 
                  key={task.id}
                  className="p-3 rounded-lg flex items-start gap-3 hover:bg-opacity-50 transition-all cursor-pointer"
                  style={{ backgroundColor: '#0F172A' }}
                >
                  <input 
                    type="checkbox" 
                    className="mt-1 w-4 h-4 rounded"
                    style={{ accentColor: '#6366F1' }}
                  />
                  <div className="flex-1">
                    <p style={{ color: '#E5E7EB' }}>{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>{task.dueDate}</span>
                      <span 
                        className="text-xs px-2 py-0.5 rounded"
                        style={{ 
                          backgroundColor: task.priority === 'high' ? '#EF444420' : task.priority === 'medium' ? '#F59E0B20' : '#6B728020',
                          color: task.priority === 'high' ? '#EF4444' : task.priority === 'medium' ? '#F59E0B' : '#6B7280'
                        }}
                      >
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center" style={{ color: '#9CA3AF' }}>
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No task providers connected</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Summary Panel with AI Key Points */}
        <ChatSummaryPanel onSummaryCountChange={setLiveSummaryCount} />
      </div>
      )}

      {/* Live Flow Bar */}
      <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22D3EE' }}></div>
              <div>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>Current Focus</p>
                <p className="font-medium" style={{ color: '#E5E7EB' }}>Client Call - Acme Corp</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-right" style={{ color: '#9CA3AF' }}>Next Up</p>
                <p className="font-medium" style={{ color: '#E5E7EB' }}>Design Review at {nextUpWithBuffer}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleAdjustBuffer}
                style={{ borderColor: '#6366F1', color: '#6366F1' }}
              >
                Adjust Buffer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ripple Effect Modal - Triggers when schedule changes detected */}
      <RippleEffectModal />
    </div>
  );
}