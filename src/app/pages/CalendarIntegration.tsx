import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Calendar as CalendarIcon, Clock, Trash2, Lock, ChevronLeft, ChevronRight, Sparkles, Undo2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useIntegrations } from '../contexts/IntegrationContext';
import { CalendarConnectionModal } from '../components/CalendarConnectionModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

const calendarProviderInfo = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Sync with your Google Calendar account',
    icon: '🗓️',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Sync with Outlook Calendar',
    icon: '📅',
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    description: 'Sync with iCloud Calendar',
    icon: '🍎',
  },
];

export function CalendarIntegration() {
  type ScheduleItem = { id: string; title: string; date: string; time?: string; isTask?: boolean };
  type SyncFrequency = 'real-time' | '15-min' | 'hourly';
  type EventTypes = 'all-events' | 'work-only';
  type SyncDirection = 'two-way' | 'one-way';
  type ConflictHandling = 'auto-resolve' | 'notify-only';
  type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';
  type OnboardingStepId =
    | 'sync-frequency'
    | 'event-types'
    | 'sync-direction'
    | 'notifications'
    | 'conflict-handling'
    | 'select-provider'
    | 'grant-permissions'
    | 'date-filter'
    | 'optimize-button';

  const { state, connectCalendar, disconnectCalendar, syncProvider, canConnect, getActiveProvider } = useIntegrations();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [isOptimized, setIsOptimized] = useState(false);
  const [showOptimizeDialog, setShowOptimizeDialog] = useState(false);
  const [optimizationChanges, setOptimizationChanges] = useState<Array<{
    id: string;
    title: string;
    oldTime: string;
    newTime: string;
    reason: string;
  }>>([]);
  const [selectedOptimizationChangeIds, setSelectedOptimizationChangeIds] = useState<string[]>([]);
  const [originalSchedule, setOriginalSchedule] = useState<ScheduleItem[]>([]);
  const [baselineSchedule, setBaselineSchedule] = useState<ScheduleItem[] | null>(null);
  const [syncSettings, setSyncSettings] = useState<{
    syncFrequency: SyncFrequency;
    eventTypes: EventTypes;
    syncDirection: SyncDirection;
    notifications: boolean;
    conflictHandling: ConflictHandling;
  }>({
    syncFrequency: '15-min',
    eventTypes: 'all-events',
    syncDirection: 'two-way',
    notifications: true,
    conflictHandling: 'auto-resolve',
  });
  const [settingsTouched, setSettingsTouched] = useState({
    syncFrequency: false,
    eventTypes: false,
    syncDirection: false,
    notifications: false,
    conflictHandling: false,
  });
  const [selectedConnectionMethod, setSelectedConnectionMethod] = useState<'oauth' | 'manual' | null>(null);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !state.calendars.some((calendar) => calendar.connected));
  const [hasUserRequestedTutorial, setHasUserRequestedTutorial] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [connectionStepState, setConnectionStepState] = useState({
    signInDone: false,
    permissionsGranted: false,
  });
  const [onboardingProviderChoice, setOnboardingProviderChoice] = useState<string | null>(null);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [spotlightRects, setSpotlightRects] = useState<Array<{ top: number; left: number; width: number; height: number }>>([]);
  const [spotlightGroupRect, setSpotlightGroupRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [spotlightTargetMissing, setSpotlightTargetMissing] = useState(false);
  const [spotlightFallbackMessage, setSpotlightFallbackMessage] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: OnboardingPlacement }>({
    top: 24,
    left: 24,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  type OnboardingStep = {
    id: OnboardingStepId;
    action: string;
    instruction: string;
    microcopy: string;
    whyItMatters: string;
    targetSelector?: string;
    requiresModal?: boolean;
    fallbackMessage?: string;
    target?: 'syncFrequency' | 'eventTypes' | 'syncDirection' | 'notifications' | 'conflictHandling';
  };

  const baseOnboardingSteps: OnboardingStep[] = [
    {
      id: 'sync-frequency',
      action: 'Choose sync frequency',
      instruction: 'Pick how often SyncFlow checks your calendar.',
      microcopy: 'Most users start with every 15 minutes for a balanced setup.',
      whyItMatters: 'This controls update speed, background activity, and battery usage.',
      targetSelector: '[data-onboarding="sync-frequency"]',
      target: 'syncFrequency',
    },
    {
      id: 'event-types',
      action: 'Choose event types',
      instruction: 'Decide whether to sync all events or only work events.',
      microcopy: 'Choose work-only if you want personal events kept private.',
      whyItMatters: 'This keeps your data scope aligned with privacy and focus preferences.',
      targetSelector: '[data-onboarding="event-types"]',
      target: 'eventTypes',
    },
    {
      id: 'sync-direction',
      action: 'Choose sync direction',
      instruction: 'Select one-way or two-way sync.',
      microcopy: 'Choose one-way if you only want to read events from your calendar.',
      whyItMatters: 'This determines whether SyncFlow can edit external calendar events.',
      targetSelector: '[data-onboarding="sync-direction"]',
      target: 'syncDirection',
    },
    {
      id: 'notifications',
      action: 'Set notification preference',
      instruction: 'Turn sync notifications on or off.',
      microcopy: 'Leave this on while getting started so you can verify behavior.',
      whyItMatters: 'Notifications keep you informed when sync happens or needs your attention.',
      targetSelector: '[data-onboarding="notifications"]',
      target: 'notifications',
    },
    {
      id: 'conflict-handling',
      action: 'Set conflict handling',
      instruction: 'Choose how overlapping events should be handled.',
      microcopy: 'Auto-resolve can save time, while notify-only gives full manual control.',
      whyItMatters: 'This decides whether the app auto-adjusts conflicts or asks you first.',
      targetSelector: '[data-onboarding="conflict-handling"]',
      target: 'conflictHandling',
    },
    {
      id: 'select-provider',
      action: 'Select calendar provider',
      instruction: 'Choose one provider card (Google, Outlook, or Apple) and click its Connect button.',
      microcopy: 'Only one provider can be active at a time.',
      whyItMatters: 'This picks your source of truth for events.',
      targetSelector: '[data-onboarding="select-provider"]',
      fallbackMessage: 'Provider options are not available yet. Disconnect the active provider or reconnect later.',
    },
  ];

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    const chosenProvider = onboardingProviderChoice;
    const providerName = chosenProvider
      ? calendarProviderInfo.find((provider) => provider.id === chosenProvider)?.name || 'selected provider'
      : 'selected provider';

    const finalProviderStep: OnboardingStep =
      chosenProvider === 'apple'
        ? {
            id: 'grant-permissions',
            action: `Connect ${providerName}`,
            instruction: `Complete manual setup for ${providerName}, then click Connect Manually.`,
            microcopy: 'Double-check the feed URL before confirming.',
            whyItMatters: 'This final step securely links your calendar to SyncFlow.',
            targetSelector: '[data-onboarding="modal-authorize"]',
            requiresModal: true,
            fallbackMessage: 'Manual connect action is unavailable. Reopen the provider modal and retry.',
          }
        : {
            id: 'grant-permissions',
            action: `Authorize ${providerName}`,
            instruction: `Approve ${providerName} access and complete the calendar connection.`,
            microcopy: 'Review permission scope before authorizing.',
            whyItMatters: 'This permission enables SyncFlow to read and sync your events.',
            targetSelector: '[data-onboarding="modal-authorize"]',
            requiresModal: true,
            fallbackMessage: 'Authorize action is unavailable. Reopen the provider modal and retry.',
          };

    const postConnectionSteps: OnboardingStep[] = [
      {
        id: 'date-filter',
        action: 'Use date filter',
        instruction: 'Adjust year and period controls to focus on a specific date range in your calendar.',
        microcopy: 'Use year selector with previous/next controls for faster navigation.',
        whyItMatters: 'Helps you quickly narrow the schedule to the timeframe you want to plan.',
        targetSelector: '[data-onboarding="date-filter"]',
        fallbackMessage: 'Date filter controls are not available yet. Connect a calendar provider first.',
      },
      {
        id: 'optimize-button',
        action: 'Optimize your schedule',
        instruction: 'Click Optimize to resolve overlapping event-task conflicts automatically.',
        microcopy: 'Use Undo if you want to revert optimization changes.',
        whyItMatters: 'Reduces manual rescheduling and keeps task execution realistic.',
        targetSelector: '[data-onboarding="optimize-button"]',
        fallbackMessage: 'Optimize action is unavailable right now. Ensure calendar view is visible.',
      },
    ];

    return [...baseOnboardingSteps, finalProviderStep, ...postConnectionSteps];
  }, [onboardingProviderChoice]);

  const activeTaskProvider = getActiveProvider('task');
  const calendarTaskSync = state.calendarTaskSync;
  const activeProviderId = getActiveProvider('calendar');
  const connectedCount = state.calendars.filter(c => c.connected).length;
  const currentOnboardingStep = onboardingSteps[onboardingStepIndex];
  const passiveOnboardingSteps: OnboardingStepId[] = [
    'sync-frequency',
    'event-types',
    'sync-direction',
    'notifications',
    'conflict-handling',
    'date-filter',
    'optimize-button',
  ];
  const isPassiveInfoStep = currentOnboardingStep ? passiveOnboardingSteps.includes(currentOnboardingStep.id) : false;
  const isProviderSelectionStep = currentOnboardingStep?.id === 'select-provider';

  const providerLabel = onboardingProviderChoice
    ? calendarProviderInfo.find((provider) => provider.id === onboardingProviderChoice)?.name || 'selected provider'
    : 'selected provider';

  const isOnboardingStepComplete = (stepId: OnboardingStepId) => {
    switch (stepId) {
      case 'sync-frequency':
        return settingsTouched.syncFrequency;
      case 'event-types':
        return settingsTouched.eventTypes;
      case 'sync-direction':
        return settingsTouched.syncDirection;
      case 'notifications':
        return settingsTouched.notifications;
      case 'conflict-handling':
        return settingsTouched.conflictHandling;
      case 'select-provider':
        return onboardingProviderChoice !== null;
      case 'grant-permissions':
        return connectionStepState.permissionsGranted || activeProviderId !== null;
      case 'date-filter':
      case 'optimize-button':
        return true;
      default:
        return false;
    }
  };

  const isSettingFocused = (settingKey: 'syncFrequency' | 'eventTypes' | 'syncDirection' | 'notifications' | 'conflictHandling') => {
    return showOnboarding && currentOnboardingStep?.target === settingKey;
  };

  const canAdvanceOnboardingStep = currentOnboardingStep
    ? isPassiveInfoStep
      ? true
      : isProviderSelectionStep
        ? false
        : currentOnboardingStep.requiresModal
          ? isOnboardingStepComplete(currentOnboardingStep.id)
          : isOnboardingStepComplete(currentOnboardingStep.id) || spotlightTargetMissing
    : false;

  const getStepIndexById = (stepId: OnboardingStepId) => onboardingSteps.findIndex((step) => step.id === stepId);

  const getScrollableAncestors = (element: HTMLElement) => {
    const ancestors: HTMLElement[] = [];
    let parent = element.parentElement;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const canScroll =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay' || overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
        (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth);

      if (canScroll) {
        ancestors.push(parent);
      }
      parent = parent.parentElement;
    }

    return ancestors;
  };

  const ensureElementVisibility = (element: HTMLElement) => {
    const margin = 24;
    const targetRect = element.getBoundingClientRect();
    const outsideWindow = targetRect.top < margin || targetRect.bottom > window.innerHeight - margin;

    if (outsideWindow) {
      const targetY = window.scrollY + targetRect.top - window.innerHeight / 2 + targetRect.height / 2;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }

    const scrollableAncestors = getScrollableAncestors(element);
    scrollableAncestors.forEach((container) => {
      const containerRect = container.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const outsideContainer = rect.top < containerRect.top + margin || rect.bottom > containerRect.bottom - margin;

      if (outsideContainer) {
        const relativeTop = rect.top - containerRect.top + container.scrollTop;
        const targetScrollTop = relativeTop - container.clientHeight / 2 + rect.height / 2;
        container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      }
    });
  };

  const computeTooltipPlacement = (
    rect: { top: number; left: number; width: number; height: number },
    tooltipWidth: number,
    tooltipHeight: number
  ) => {
    const gap = 14;
    const viewportPadding = 12;
    const spaces = {
      top: rect.top,
      bottom: window.innerHeight - (rect.top + rect.height),
      left: rect.left,
      right: window.innerWidth - (rect.left + rect.width),
    };

    let placement: OnboardingPlacement = 'bottom';
    if (spaces.bottom >= tooltipHeight + gap) {
      placement = 'bottom';
    } else if (spaces.top >= tooltipHeight + gap) {
      placement = 'top';
    } else if (spaces.right >= tooltipWidth + gap) {
      placement = 'right';
    } else {
      placement = 'left';
    }

    let top = rect.top + rect.height + gap;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (placement === 'top') {
      top = rect.top - tooltipHeight - gap;
    }
    if (placement === 'right') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width + gap;
    }
    if (placement === 'left') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - gap;
    }

    const clampedTop = Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding));
    const clampedLeft = Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding));

    return { placement, top: clampedTop, left: clampedLeft };
  };

  const waitForElement = (selector: string, timeoutMs = 1600) => {
    return new Promise<HTMLElement | null>((resolve) => {
      const startedAt = Date.now();

      const tick = () => {
        const element = document.querySelector(selector) as HTMLElement | null;
        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startedAt >= timeoutMs) {
          resolve(null);
          return;
        }

        window.requestAnimationFrame(tick);
      };

      tick();
    });
  };

  const updateSpotlightForStep = () => {
    if (!showOnboarding || !currentOnboardingStep) {
      setSpotlightRect(null);
      setSpotlightRects([]);
      setSpotlightGroupRect(null);
      return;
    }

    if (currentOnboardingStep.requiresModal && !selectedProvider && !activeProviderId) {
      const routedProvider = onboardingProviderChoice
        ? state.calendars.find((provider) => provider.id === onboardingProviderChoice)
        : null;

      const connectableProvider = routedProvider && canConnect('calendar', routedProvider.id).allowed
        ? routedProvider
        : state.calendars.find((provider) => canConnect('calendar', provider.id).allowed);

      if (connectableProvider) {
        void handleConnect(connectableProvider.id);
      }
    }

    if (!currentOnboardingStep.targetSelector) {
      setSpotlightTargetMissing(true);
      setSpotlightFallbackMessage(currentOnboardingStep.fallbackMessage || 'No target is associated with this step. Continue when ready.');
      setSpotlightRect(null);
      setSpotlightRects([]);
      setSpotlightGroupRect(null);
      return;
    }

    const targets = Array.from(document.querySelectorAll(currentOnboardingStep.targetSelector)) as HTMLElement[];
    if (targets.length === 0) {
      setSpotlightTargetMissing(true);
      if (currentOnboardingStep.requiresModal && selectedProvider) {
        setSpotlightFallbackMessage('Preparing provider modal... please wait a moment while we locate this step.');
      } else {
        setSpotlightFallbackMessage(currentOnboardingStep.fallbackMessage || 'This UI element is not available right now. You can continue to the next step.');
      }
      setSpotlightRect(null);
      setSpotlightRects([]);
      setSpotlightGroupRect(null);
      return;
    }

    setSpotlightTargetMissing(false);
    setSpotlightFallbackMessage(null);

    // Ensure the focused area is visible before drawing the spotlight.
    ensureElementVisibility(targets[0]);
    if (targets.length > 1) {
      ensureElementVisibility(targets[targets.length - 1]);
    }

    const remeasure = () => {
      const paddedRects = targets.map((target) => {
        const rect = target.getBoundingClientRect();
        return {
          top: Math.max(6, rect.top - 8),
          left: Math.max(6, rect.left - 8),
          width: rect.width + 16,
          height: rect.height + 16,
        };
      });

      setSpotlightRects(paddedRects);

      const hasMultipleTargets = paddedRects.length > 1;
      const aggregateRect = hasMultipleTargets
        ? {
            top: Math.min(...paddedRects.map((rect) => rect.top)) - 6,
            left: Math.min(...paddedRects.map((rect) => rect.left)) - 6,
            width:
              Math.max(...paddedRects.map((rect) => rect.left + rect.width)) -
              Math.min(...paddedRects.map((rect) => rect.left)) +
              12,
            height:
              Math.max(...paddedRects.map((rect) => rect.top + rect.height)) -
              Math.min(...paddedRects.map((rect) => rect.top)) +
              12,
          }
        : null;

      setSpotlightGroupRect(aggregateRect);
      const primaryRect = aggregateRect || paddedRects[0];
      setSpotlightRect(primaryRect);

      if (tooltipRef.current && primaryRect) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const placement = computeTooltipPlacement(primaryRect, tooltipRect.width, tooltipRect.height);
        setTooltipPosition(placement);
      }
    };

    remeasure();
    window.setTimeout(remeasure, 280);
  };

  useEffect(() => {
    updateSpotlightForStep();
  }, [
    showOnboarding,
    onboardingStepIndex,
    onboardingProviderChoice,
    selectedProvider,
    activeProviderId,
    state.calendars,
    connectionStepState.signInDone,
    connectionStepState.permissionsGranted,
  ]);

  useEffect(() => {
    if (!showOnboarding || !currentOnboardingStep?.requiresModal || !currentOnboardingStep.targetSelector) return;

    let cancelled = false;
    const stepId = currentOnboardingStep.id;

    waitForElement(currentOnboardingStep.targetSelector, 2600).then((target) => {
      if (cancelled || !target) return;
      if (onboardingSteps[onboardingStepIndex]?.id !== stepId) return;
      updateSpotlightForStep();
    });

    return () => {
      cancelled = true;
    };
  }, [
    showOnboarding,
    onboardingStepIndex,
    selectedProvider,
    onboardingProviderChoice,
    currentOnboardingStep?.id,
    currentOnboardingStep?.targetSelector,
  ]);

  useEffect(() => {
    if (onboardingStepIndex <= onboardingSteps.length - 1) return;
    setOnboardingStepIndex(Math.max(0, onboardingSteps.length - 1));
  }, [onboardingStepIndex, onboardingSteps.length]);

  useEffect(() => {
    const hasConnectedCalendar = state.calendars.some((calendar) => calendar.connected);
    if (hasConnectedCalendar && !hasUserRequestedTutorial && onboardingProviderChoice === null) {
      setShowOnboarding(false);
    }
  }, [state.calendars, hasUserRequestedTutorial, onboardingProviderChoice]);

  useEffect(() => {
    if (!showOnboarding) return;

    const handleViewportChange = () => updateSpotlightForStep();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [showOnboarding, onboardingStepIndex, onboardingProviderChoice, selectedProvider, activeProviderId]);

  const timeToMinutes = (time: string) => {
    const [hh, mm] = time.split(':').map(Number);
    return hh * 60 + mm;
  };

  const minutesToTime = (mins: number) => {
    const dayMinutes = 24 * 60;
    const normalized = ((mins % dayMinutes) + dayMinutes) % dayMinutes;
    const hh = Math.floor(normalized / 60);
    const mm = normalized % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const roundToQuarterMinutes = (mins: number) => Math.round(mins / 15) * 15;

  const normalizeToQuarterHour = (time: string) => minutesToTime(roundToQuarterMinutes(timeToMinutes(time)));

  // Mock tasks from task provider - only show if integration is enabled
  const generateTasksForCalendar = () => {
    if (!activeTaskProvider || !calendarTaskSync.showTasksInCalendarView) {
      return [] as Array<{ id: string; title: string; date: string; time?: string; isTask: boolean }>;
    }
    
    // Sample tasks with due dates
    return [
      { id: 'task-1', title: '📝 Prepare wireframe handoff', date: '2026-03-29', time: normalizeToQuarterHour('09:00'), isTask: true },
      { id: 'task-2', title: '📝 Draft sprint update notes', date: '2026-03-31', time: normalizeToQuarterHour('11:00'), isTask: true },
      { id: 'task-3', title: '📝 Complete neural network assignment', date: '2026-04-02', time: normalizeToQuarterHour('15:00'), isTask: true },
      { id: 'task-4', title: '📝 Publish weekly summary', date: '2026-04-04', time: normalizeToQuarterHour('10:00'), isTask: true },
    ].map(task => ({ ...task, time: task.time ? normalizeToQuarterHour(task.time) : task.time }));
  };

  // Simple mock tasks pinned to dates for the connected calendar
  const generateMockTasks = (providerId: string | null) => {
    if (!providerId) return [] as Array<{ id: string; title: string; date: string; time?: string; isTask?: boolean }>;

    // Create a busy week between 2026-03-29 and 2026-04-04 with some intentional overlaps
    const busyStart = new Date('2026-03-29T00:00:00');
    const busyDays = 7; // Mar 29..Apr 4
    const titlePool = [
      'Team Standup',
      'Client Call',
      'Sync with Product',
      'Deep Work Block',
      'Design Review',
      '1:1',
      'Wrap up / Notes',
      'All-hands Meeting',
      'Project Planning'
    ];

    const tasks: Array<{ id: string; title: string; date: string; time?: string; isTask?: boolean }> = [];
    let idCounter = 100;

    // helper to format and normalize to nearest 15-minute slot
    const fmt = (h: number, m: number) => minutesToTime(roundToQuarterMinutes(h * 60 + m));

    for (let d = 0; d < busyDays; d++) {
      const day = new Date(busyStart);
      day.setDate(busyStart.getDate() + d);
      const dateKey = day.toISOString().split('T')[0];

      // Determine number of events this day (3-4) — keep week lighter
      const eventsCount = 3 + (d % 2);

      // Start the day at 08:30
      let currentHour = 8;
      let currentMin = 30;

      for (let i = 0; i < eventsCount; i++) {
        // Random duration in 15-minute aligned blocks (30-90 minutes)
        const durationOptions = [30, 45, 60, 75, 90];
        const duration = durationOptions[Math.floor(Math.random() * durationOptions.length)];

        // Choose a title
        const titleBase = titlePool[(i + d) % titlePool.length];

        // Push event at current time
        tasks.push({ id: `busy-${idCounter++}`, title: `${titleBase}`, date: dateKey, time: fmt(currentHour, currentMin) });

        // Intentionally create overlaps on specific days (day 1 and day 3)
        if (d === 1 && i === 1) {
          // Add overlapping event
          tasks.push({ id: `busy-${idCounter++}`, title: 'Urgent Team Sync', date: dateKey, time: fmt(currentHour, currentMin + 15) });
        }
        if (d === 3 && i === 2) {
          // Add another overlap
          tasks.push({ id: `busy-${idCounter++}`, title: 'Quick Check-in', date: dateKey, time: fmt(currentHour, currentMin + 20) });
        }

        // Advance current time by duration + buffer (15-30 minutes)
        const buffer = Math.random() < 0.5 ? 15 : 30;
        let totalAdvance = duration + buffer;
        currentHour += Math.floor((currentMin + totalAdvance) / 60);
        currentMin = (currentMin + totalAdvance) % 60;

        // If we go past 20:00 stop adding events
        if (currentHour >= 20) break;
      }

      // Add at most one mid-week special event to avoid over-crowding
      if (d === 2) {
        const existingCount = tasks.filter(t => t.date === dateKey).length;
        if (existingCount < 4) {
          tasks.push({ id: `busy-${idCounter++}`, title: `All-hands Meeting`, date: dateKey, time: '09:00' });
        }
      }
    }

    // Add one wrap-up event near the end of the selected week
    const after = new Date('2026-04-04');
    tasks.push({ id: `busy-${idCounter++}`, title: 'Post-week retrospective', date: after.toISOString().split('T')[0], time: '10:00' });

    // Guaranteed event/task conflicts for optimization demo
    tasks.push({ id: `busy-${idCounter++}`, title: 'Sprint kickoff meeting', date: '2026-03-29', time: '09:00' });
    tasks.push({ id: `busy-${idCounter++}`, title: 'Product sync call', date: '2026-03-31', time: '11:00' });
    tasks.push({ id: `busy-${idCounter++}`, title: 'Design review session', date: '2026-04-02', time: '15:00' });

    return tasks.map(task => ({
      ...task,
      time: task.time ? normalizeToQuarterHour(task.time) : task.time,
    }));
  };

  const mockTasks: ScheduleItem[] = [...generateMockTasks(getActiveProvider('calendar')), ...generateTasksForCalendar()];
  
  // Function to detect overlaps and generate optimized schedule
  const generateOptimizedSchedule = (schedule: typeof mockTasks) => {
    const changes: typeof optimizationChanges = [];
    const optimized = schedule.map(item => ({
      ...item,
      time: item.time ? normalizeToQuarterHour(item.time) : item.time,
    }));

    const EVENT_DURATION_MIN = 60;
    const BUFFER_MIN = 15;
    const DAY_END_MIN = 22 * 60;

    const hasOverlap = (startA: number, startB: number) => {
      const endA = startA + EVENT_DURATION_MIN;
      const endB = startB + EVENT_DURATION_MIN;
      return startA < endB && startB < endA;
    };

    const findNextAvailableTime = (
      itemsForDate: Array<{ id: string; title: string; date: string; time?: string; isTask?: boolean }>,
      movingItemId: string,
      fromMinutes: number
    ) => {
      let candidate = fromMinutes;
      while (candidate + EVENT_DURATION_MIN <= DAY_END_MIN) {
        const isFree = itemsForDate
          .filter(item => item.id !== movingItemId && item.time)
          .every(item => !hasOverlap(candidate, timeToMinutes(item.time!)));

        if (isFree) return candidate;
        candidate += BUFFER_MIN;
      }
      return null;
    };
    
    // Group by date
    const byDate: Record<string, typeof optimized> = {};
    optimized.forEach(item => {
      if (!byDate[item.date]) byDate[item.date] = [];
      byDate[item.date].push(item);
    });
    
    // For each date, detect and resolve only event-task conflicts.
    Object.keys(byDate).forEach(date => {
      const items = byDate[date].filter(item => item.time).sort((a, b) => {
        return timeToMinutes(a.time!) - timeToMinutes(b.time!);
      });
      
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          if (!a.time || !b.time) continue;

          // Consider only event-task pairs.
          const isEventTaskConflict = Boolean(a.isTask) !== Boolean(b.isTask);
          if (!isEventTaskConflict) continue;

          const aStart = timeToMinutes(a.time);
          const bStart = timeToMinutes(b.time);
          const isConflicting = hasOverlap(aStart, bStart);
          if (!isConflicting) continue;

          // Prefer moving task items; keep calendar event time intact.
          const fixedItem = a.isTask ? b : a;
          const movingItem = a.isTask ? a : b;
          if (!movingItem.time || !fixedItem.time) continue;

          const fixedStart = timeToMinutes(fixedItem.time);
          const desiredStart = roundToQuarterMinutes(fixedStart + EVENT_DURATION_MIN + BUFFER_MIN);
          const nextAvailableStart = findNextAvailableTime(items, movingItem.id, desiredStart);
          if (nextAvailableStart === null) continue;

          const oldTime = movingItem.time;
          const newTime = minutesToTime(roundToQuarterMinutes(nextAvailableStart));

          // Update all representations so subsequent checks use the new slot.
          movingItem.time = newTime;
          const inDayIndex = items.findIndex(item => item.id === movingItem.id);
          if (inDayIndex !== -1) {
            items[inDayIndex] = { ...items[inDayIndex], time: newTime };
          }

          const itemIndex = optimized.findIndex(item => item.id === movingItem.id);
          if (itemIndex !== -1) {
            optimized[itemIndex] = { ...optimized[itemIndex], time: newTime };
          }

          const existingChangeIndex = changes.findIndex(change => change.id === movingItem.id);
          const reason = `Resolved overlap with "${fixedItem.title}" on ${date}`;
          if (existingChangeIndex === -1) {
            changes.push({
              id: movingItem.id,
              title: movingItem.title,
              oldTime,
              newTime,
              reason,
            });
          } else {
            changes[existingChangeIndex] = {
              ...changes[existingChangeIndex],
              newTime,
              reason,
            };
          }
        }
      }
    });
    
    return { optimized, changes };
  };

  const applySelectedOptimizationChanges = (
    schedule: ScheduleItem[],
    changes: typeof optimizationChanges,
    selectedIds: string[]
  ) => {
    const selectedIdSet = new Set(selectedIds);
    return schedule.map((item) => {
      const selectedChange = changes.find((change) => change.id === item.id && selectedIdSet.has(change.id));
      if (!selectedChange) {
        return { ...item, time: item.time ? normalizeToQuarterHour(item.time) : item.time };
      }
      return { ...item, time: normalizeToQuarterHour(selectedChange.newTime) };
    });
  };

  const getBaselineSchedule = (): ScheduleItem[] => {
    if (baselineSchedule) return baselineSchedule;
    const freshBaseline = mockTasks.map(item => ({
      ...item,
      time: item.time ? normalizeToQuarterHour(item.time) : item.time,
    }));
    setBaselineSchedule(freshBaseline);
    return freshBaseline;
  };
  
  // Use optimized schedule if optimization is active
  const displaySchedule = isOptimized ? originalSchedule : (baselineSchedule ?? mockTasks);
  
  const tasksForSelectedDate = (date?: Date): Array<{ id: string; title: string; date: string; time?: string; isTask?: boolean }> => {
    if (!date) return [];
    const key = date.toISOString().split('T')[0];
    return displaySchedule.filter(t => t.date === key);
  };
  
  // Handle optimize button click
  const handleOptimize = () => {
    if (isOptimized) {
      // Undo optimization
      setIsOptimized(false);
      setOriginalSchedule([]);
      setOptimizationChanges([]);
      setSelectedOptimizationChangeIds([]);
      toast.success('Schedule Restored', {
        description: 'Your original schedule has been restored.',
        duration: 3000,
      });
    } else {
      // Generate optimized schedule
      const sourceSchedule = getBaselineSchedule();
      const { changes } = generateOptimizedSchedule(sourceSchedule);
      
      if (changes.length === 0) {
        toast.info('Schedule Already Optimized', {
          description: 'No overlapping event-task conflicts were found.',
          duration: 3000,
        });
      } else {
        setOptimizationChanges(changes);
        setSelectedOptimizationChangeIds(changes.map(change => change.id));
        setShowOptimizeDialog(true);
      }
    }
  };
  
  // Handle user approval of optimization
  const handleApproveOptimization = () => {
    if (selectedOptimizationChangeIds.length === 0) {
      setShowOptimizeDialog(false);
      toast.info('No Changes Applied', {
        description: 'Select at least one optimization change to apply.',
        duration: 3000,
      });
      return;
    }

    const approvedChanges = optimizationChanges.filter(change => selectedOptimizationChangeIds.includes(change.id));
    const sourceSchedule = getBaselineSchedule();
    const approvedSchedule = applySelectedOptimizationChanges(sourceSchedule, optimizationChanges, selectedOptimizationChangeIds);

    setOriginalSchedule(approvedSchedule);
    setOptimizationChanges(approvedChanges);
    setIsOptimized(true);
    setShowOptimizeDialog(false);
    toast.success('Schedule Optimized', {
      description: `${approvedChanges.length} event(s) rearranged to resolve conflicts.`,
      duration: 4000,
    });
  };

  // Lightweight week view renderer (no extra deps)
  function WeekGrid({ referenceDate }: { referenceDate: Date }) {
    // Calculate start of week (Sunday)
    const start = new Date(referenceDate);
    start.setDate(referenceDate.getDate() - referenceDate.getDay());

    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });

    const HOUR_PX = 60; // increase vertical space per hour
    const hours = Array.from({ length: 14 }).map((_, i) => i + 7); // 7AM - 8PM

    // Group events by day and sort by time to compute small vertical offsets for stacking
    const eventsByDay: Array<Array<{ evt: any; hh: number; mm: number }>> = days.map(() => []);
    displaySchedule.forEach(evt => {
      if (!evt.time) return;
      const dayIndex = days.findIndex(d => d.toISOString().split('T')[0] === evt.date);
      if (dayIndex === -1) return;
      const [hh, mm] = evt.time.split(':').map(Number);
      eventsByDay[dayIndex].push({ evt, hh, mm });
    });
    eventsByDay.forEach(list => list.sort((a, b) => (a.hh * 60 + a.mm) - (b.hh * 60 + b.mm)));

    const eventElements: JSX.Element[] = [];
    eventsByDay.forEach((list, dayIndex) => {
      list.forEach((item, idx) => {
        const { evt, hh, mm } = item;
        const top = ((hh + mm / 60) - 7) * HOUR_PX + idx * 8; // add small offset per item to separate stacked events
        const left = (dayIndex / 7) * 100;
        const isTask = evt.isTask || false;
        eventElements.push(
          <div
            key={evt.id}
            style={{
              position: 'absolute',
              top: `${top}px`,
              left: `calc(${left}% + 6px)`,
              width: `calc(${100 / 7}% - 12px)`,
              backgroundColor: isTask ? '#6366F1' : '#EF4444',
              color: '#fff',
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: '0.88rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.16)',
              lineHeight: 1.1,
              border: isTask ? '2px solid #22D3EE' : 'none',
            }}
          >
            <div style={{ fontWeight: 700 }}>{evt.title}</div>
            <div style={{ fontSize: '0.78rem', opacity: 0.95 }}>{evt.time}</div>
          </div>
        );
      });
    });

    return (
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 80 }}>
          {hours.map(h => (
            <div key={h} style={{ height: 48, color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'right', paddingRight: 8 }}>{`${h}:00`}</div>
          ))}
        </div>

        <div style={{ flex: 1, position: 'relative', borderRadius: 8, overflow: 'hidden', backgroundColor: '#fff', color: '#111' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(7, 1fr)`, borderBottom: '1px solid #e6e6e6', backgroundColor: '#fafafa' }}>
            {days.map((d, i) => (
              <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderRight: i < 6 ? '1px solid #eee' : 'none' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</div>
                <div style={{ marginTop: 6, width: 28, height: 28, borderRadius: 14, backgroundColor: d.toDateString() === new Date().toDateString() ? '#2563EB' : 'transparent', color: d.toDateString() === new Date().toDateString() ? '#fff' : '#111', margin: '6px auto' }}>{d.getDate()}</div>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div style={{ position: 'relative', height: hours.length * 48, display: 'grid', gridTemplateColumns: `repeat(7, 1fr)` }}>
            {/* vertical grid lines */}
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} style={{ borderRight: i < 6 ? '1px solid #f0f0f0' : 'none' }} />
            ))}

            {/* hour rows overlay */}
            <div style={{ position: 'absolute', inset: 0 }}>
              {hours.map((h, idx) => (
                <div key={h} style={{ position: 'absolute', top: idx * 48 - 1, left: 0, right: 0, height: 1, borderTop: '1px solid #f3f4f6' }} />
              ))}
            </div>

            {/* events */}
            <div style={{ position: 'absolute', inset: 0 }}>
              {eventElements}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const changeMonth = (delta: number) => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setMonth(base.getMonth() + delta);
    setSelectedDate(new Date(base));
  };

  const changeYear = (delta: number) => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setFullYear(base.getFullYear() + delta);
    setSelectedDate(new Date(base));
  };

  const setYear = (year: number) => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setFullYear(year);
    setSelectedDate(new Date(base));
  };

  const goToday = () => setSelectedDate(new Date());

  const changeWeek = (deltaWeeks: number) => {
    const base = selectedDate ? new Date(selectedDate) : new Date();
    base.setDate(base.getDate() + deltaWeeks * 7);
    setSelectedDate(new Date(base));
  };

  const handleConnect = async (providerId: string) => {
    // Check if another provider is already connected
    const check = canConnect('calendar', providerId);
    if (!check.allowed) {
      const activeProviderName = calendarProviderInfo.find(p => p.id === check.activeProvider)?.name;
      toast.error('Only One Calendar Provider Allowed', {
        description: `Please disconnect ${activeProviderName} before connecting to a new provider.`,
        duration: 4000,
      });
      return;
    }
    setConnectionError(null);
    setConnectionStepState({ signInDone: false, permissionsGranted: false });
    setOnboardingProviderChoice(providerId);
    setSelectedProvider(providerId);

    if (showOnboarding && currentOnboardingStep?.id === 'select-provider') {
      const finalStepIndex = getStepIndexById('grant-permissions');
      if (finalStepIndex !== -1) {
        setOnboardingStepIndex(finalStepIndex);
      }

      const target = await waitForElement('[data-onboarding="modal-authorize"]', 2600);
      if (target) {
        updateSpotlightForStep();
      }
    }
  };

  const handleConnectFromModal = (providerId: string, credentials: any) => {
    setConnectionError(null);
    setIsConnectingCalendar(true);
    setSelectedConnectionMethod(credentials.method === 'manual' ? 'manual' : 'oauth');
    setConnectionStepState(prev => ({ ...prev, signInDone: true }));

    const loadingToastId = toast.loading('Connecting calendar...', {
      description: 'Signing in and validating permissions.',
    });

    window.setTimeout(() => {
      try {
        if (credentials.method === 'manual' && providerId !== 'apple') {
          if (!credentials.clientId || !credentials.clientSecret) {
            throw new Error('Manual setup requires both Client ID and Client Secret.');
          }
        }

        if (credentials.method === 'manual' && providerId === 'apple') {
          if (!credentials.iCalUrl) {
            throw new Error('Apple Calendar manual setup requires an iCal URL.');
          }
        }

        connectCalendar(providerId, credentials);
        setConnectionStepState({ signInDone: true, permissionsGranted: true });
        setSelectedProvider(null);
        setConnectionError(null);
        if (showOnboarding && currentOnboardingStep?.id === 'grant-permissions') {
          const nextStepIndex = getStepIndexById('date-filter');
          if (nextStepIndex !== -1) {
            setOnboardingStepIndex(nextStepIndex);
          } else {
            setShowOnboarding(false);
            setHasUserRequestedTutorial(false);
          }
        }
        toast.dismiss(loadingToastId);
        toast.success('Calendar Connected', {
          description: `${calendarProviderInfo.find(p => p.id === providerId)?.name} is now linked to SyncFlow.`,
          duration: 3500,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed. Please try again.';
        setConnectionError(errorMessage);
        toast.dismiss(loadingToastId);
        toast.error('Connection Failed', {
          description: errorMessage,
          duration: 4500,
        });
      } finally {
        setIsConnectingCalendar(false);
      }
    }, 1000);
  };

  const goToNextOnboardingStep = async () => {
    if (!currentOnboardingStep) return;
    if (!canAdvanceOnboardingStep) return;

    const nextIndex = onboardingStepIndex + 1;
    if (nextIndex >= onboardingSteps.length) {
      setShowOnboarding(false);
      return;
    }

    setOnboardingStepIndex(nextIndex);
  };

  const goToPreviousOnboardingStep = () => {
    setOnboardingStepIndex((prev) => Math.max(0, prev - 1));
  };

  const restartOnboarding = () => {
    setHasUserRequestedTutorial(true);
    setShowOnboarding(true);
    setOnboardingStepIndex(0);
    setOnboardingProviderChoice(null);
    setConnectionStepState({ signInDone: false, permissionsGranted: false });
    setSelectedProvider(null);
    setConnectionError(null);
  };

  const handleDisconnect = (providerId: string) => {
    if (confirm(`Disconnect ${calendarProviderInfo.find(p => p.id === providerId)?.name}?`)) {
      disconnectCalendar(providerId);
      toast.success('Calendar Disconnected', {
        description: 'You can now connect a different calendar provider.',
        duration: 3000,
      });
    }
  };

  const selectedYear = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, index) => selectedYear - 5 + index);

  return (
    <div className="p-8 space-y-6" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Calendar Integration</h1>
          <p className="mt-2" style={{ color: '#9CA3AF' }}>
            One Source of Truth • {connectedCount > 0 ? `${calendarProviderInfo.find(p => p.id === activeProviderId)?.name} Active` : 'No Active Provider'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => {
              if (showOnboarding) {
                setShowOnboarding(false);
                setHasUserRequestedTutorial(false);
                return;
              }
              restartOnboarding();
            }}
            style={{ borderColor: '#6366F1', color: '#6366F1', backgroundColor: '#1E293B' }}
          >
            {showOnboarding ? 'Hide Tutorial' : 'Revisit Tutorial'}
          </Button>
          {connectedCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: '#22D3EE20', borderColor: '#22D3EE', border: '1px solid' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#22D3EE' }}></div>
              <span className="text-sm font-medium" style={{ color: '#22D3EE' }}>Live Sync Active</span>
            </div>
          )}
        </div>
      </div>

      {/* Spotlight Onboarding */}
      {showOnboarding && currentOnboardingStep && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(3, 7, 18, 0.34)',
              zIndex: 90,
              pointerEvents: 'none',
            }}
          />

          {spotlightRects.map((rect, index) => (
            <div
              key={`spotlight-${index}`}
              style={{
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: 12,
                border: '2px solid #22D3EE',
                boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.30)',
                transition: 'top 280ms ease, left 280ms ease, width 280ms ease, height 280ms ease',
                zIndex: 91,
                pointerEvents: 'none',
              }}
            />
          ))}

          {spotlightGroupRect && (
            <div
              style={{
                position: 'fixed',
                top: spotlightGroupRect.top,
                left: spotlightGroupRect.left,
                width: spotlightGroupRect.width,
                height: spotlightGroupRect.height,
                borderRadius: 16,
                border: '2px dashed #A5B4FC',
                backgroundColor: 'rgba(99, 102, 241, 0.07)',
                transition: 'top 280ms ease, left 280ms ease, width 280ms ease, height 280ms ease',
                zIndex: 90,
                pointerEvents: 'none',
              }}
            />
          )}

          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              backgroundColor: '#0B1220',
              border: '1px solid #6366F1',
              borderRadius: 12,
              padding: 16,
              zIndex: 92,
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.45)',
              transition: 'top 260ms ease, left 260ms ease',
            }}
          >
            <div className="text-xs uppercase tracking-wide" style={{ color: '#22D3EE' }}>
              Guided Setup • Step {onboardingStepIndex + 1} of {onboardingSteps.length}
            </div>
            <p className="mt-2 font-semibold" style={{ color: '#E5E7EB' }}>{currentOnboardingStep.action}</p>
            <p className="text-sm mt-2" style={{ color: '#CBD5E1' }}>
              {currentOnboardingStep.id === 'grant-permissions'
                  ? `Review and approve permission prompts for ${providerLabel}.`
                  : currentOnboardingStep.id === 'select-provider'
                    ? 'Choose one provider below.'
                    : currentOnboardingStep.instruction}
            </p>
            <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>Tip: {currentOnboardingStep.microcopy}</p>

            {spotlightTargetMissing && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}>
                <p className="text-xs" style={{ color: '#FCD34D' }}>
                  {spotlightFallbackMessage || 'This element is currently unavailable. You can continue to the next step.'}
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={goToPreviousOnboardingStep}
                disabled={onboardingStepIndex === 0}
                style={{ borderColor: '#374151', color: '#000000' }}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowOnboarding(false)}
                  style={{ borderColor: '#374151', color: '#000000' }}
                >
                  Skip
                </Button>
                {!isProviderSelectionStep ? (
                  <Button
                    onClick={goToNextOnboardingStep}
                    disabled={!canAdvanceOnboardingStep}
                    style={{ backgroundColor: '#6366F1', color: '#fff' }}
                  >
                    {onboardingStepIndex === onboardingSteps.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Connection Feedback */}
      {(isConnectingCalendar || connectionError) && (
        <Card style={{ backgroundColor: '#1E293B', borderColor: connectionError ? '#EF4444' : '#22D3EE' }}>
          <CardContent className="py-4">
            {isConnectingCalendar ? (
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: '#22D3EE' }}></div>
                <div>
                  <p className="font-medium" style={{ color: '#E5E7EB' }}>Connecting your calendar...</p>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>Please wait while we authenticate and apply your sync settings.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="font-medium" style={{ color: '#FCA5A5' }}>We could not connect your calendar.</p>
                <p className="text-sm" style={{ color: '#FECACA' }}>{connectionError}</p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Troubleshooting tips: verify credentials, ensure calendar permissions are granted, and retry from the same provider card.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Connection Success Summary */}
      {activeProviderId && (
        <Card data-onboarding="connection-summary" style={{ backgroundColor: '#10B98120', borderColor: '#10B981' }}>
          <CardContent className="py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold" style={{ color: '#E5E7EB' }}>
                  Calendar Connected Successfully
                </p>
                <p className="text-sm mt-1" style={{ color: '#D1FAE5' }}>
                  Connected provider: {calendarProviderInfo.find((p) => p.id === activeProviderId)?.name}
                  {selectedConnectionMethod ? ` (${selectedConnectionMethod === 'oauth' ? 'OAuth' : 'Manual'} setup)` : ''}
                </p>
                <p className="text-sm mt-1" style={{ color: '#D1FAE5' }}>
                  Sync profile: {syncSettings.syncFrequency} • {syncSettings.eventTypes === 'all-events' ? 'All events' : 'Work-only events'} • {syncSettings.syncDirection === 'two-way' ? 'Two-way sync' : 'One-way sync'} • {syncSettings.notifications ? 'Notifications on' : 'Notifications off'} • {syncSettings.conflictHandling === 'auto-resolve' ? 'Auto-resolve conflicts' : 'Notify-only conflicts'}
                </p>
              </div>
              
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View (shown when a calendar provider is connected) */}
      {getActiveProvider('calendar') && (
        <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div>
                <CardTitle style={{ color: '#E5E7EB' }}>Calendar View</CardTitle>
                <CardDescription style={{ color: '#9CA3AF' }}>
                  See your calendar and pinned tasks for the selected date
                </CardDescription>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div data-onboarding="date-filter" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, border: '1px solid #374151', padding: 4, borderRadius: 8 }}>
                  <button
                    onClick={() => setViewMode('week')}
                    style={{ padding: '6px 10px', borderRadius: 6, background: viewMode === 'week' ? '#6366F1' : 'transparent', color: viewMode === 'week' ? '#fff' : '#E5E7EB' }}
                  >
                    Week
                  </button>
                  <button
                    onClick={() => setViewMode('month')}
                    style={{ padding: '6px 10px', borderRadius: 6, background: viewMode === 'month' ? '#6366F1' : 'transparent', color: viewMode === 'month' ? '#fff' : '#E5E7EB' }}
                  >
                    Month
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 6, border: '1px solid #374151', padding: 4, borderRadius: 8 }}>
                  <button
                    onClick={() => changeYear(-1)}
                    title="Previous Year"
                    style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', color: '#E5E7EB' }}
                  >
                    «
                  </button>
                  <select
                    aria-label="Filter by year"
                    value={String(selectedYear)}
                    onChange={(e) => setYear(Number(e.target.value))}
                    style={{
                      background: '#0F172A',
                      border: '1px solid #374151',
                      color: '#E5E7EB',
                      padding: '6px 10px',
                      borderRadius: 6,
                    }}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => changeYear(1)}
                    title="Next Year"
                    style={{ padding: '6px 8px', borderRadius: 6, background: 'transparent', color: '#E5E7EB' }}
                  >
                    »
                  </button>
                </div>

                <button
                  onClick={() => (viewMode === 'month' ? changeMonth(-1) : changeWeek(-1))}
                  title="Previous"
                  style={{ background: 'transparent', border: '1px solid #374151', color: '#E5E7EB', padding: '6px 8px', borderRadius: 6 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div style={{ color: '#E5E7EB', minWidth: 220, textAlign: 'center' }}>
                  <div style={{ fontWeight: 600 }}>
                    {selectedDate ? (
                      viewMode === 'month' ?
                        selectedDate.toLocaleString(undefined, { month: 'long', year: 'numeric' }) :
                        (() => {
                          const s = new Date(selectedDate);
                          const start = new Date(s);
                          start.setDate(s.getDate() - s.getDay());
                          const end = new Date(start);
                          end.setDate(start.getDate() + 6);
                          const startStr = start.toLocaleString(undefined, { month: 'short', day: 'numeric' });
                          const endStr = end.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                          return `${startStr} — ${endStr}`;
                        })()
                    ) : ''}
                  </div>
                </div>

                <button
                  onClick={() => (viewMode === 'month' ? changeMonth(1) : changeWeek(1))}
                  title="Next"
                  style={{ background: 'transparent', border: '1px solid #374151', color: '#E5E7EB', padding: '6px 8px', borderRadius: 6 }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button onClick={goToday} title="Today" style={{ backgroundColor: '#6366F1', color: '#fff', padding: '6px 10px', borderRadius: 6 }}>
                  Today
                </button>
                </div>

                <button 
                  data-onboarding="optimize-button"
                  onClick={handleOptimize} 
                  title={isOptimized ? "Undo Optimization" : "Optimize Schedule"} 
                  style={{ 
                    backgroundColor: isOptimized ? '#F59E0B' : '#10B981', 
                    color: '#fff', 
                    padding: '6px 10px', 
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {isOptimized ? (
                    <>
                      <Undo2 className="w-4 h-4" />
                      Undo
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Optimize
                    </>
                  )}
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 md:flex md:gap-6">
            <div style={{ width: '100%' }}>
              {/* Optimization Status Banner */}
              {isOptimized && (
                <div className="mb-4 p-3 rounded-lg flex items-center justify-between" style={{ backgroundColor: '#10B98120', border: '1px solid #10B981' }}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" style={{ color: '#10B981' }} />
                    <div>
                      <div className="font-medium" style={{ color: '#E5E7EB' }}>Schedule Optimized</div>
                      <div className="text-sm" style={{ color: '#9CA3AF' }}>
                        {optimizationChanges.length} event(s) rearranged to resolve conflicts
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleOptimize}
                    style={{ borderColor: '#F59E0B', color: '#F59E0B' }}
                  >
                    <Undo2 className="w-4 h-4 mr-1" />
                    Undo
                  </Button>
                </div>
              )}
              
              <WeekGrid referenceDate={selectedDate || new Date()} />
              
              {/* Legend */}
              {activeTaskProvider && calendarTaskSync.showTasksInCalendarView && (
                <div className="flex items-center gap-6 mt-4 p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 24, height: 24, backgroundColor: '#EF4444', borderRadius: 4 }}></div>
                    <span className="text-sm" style={{ color: '#E5E7EB' }}>Calendar Events</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div style={{ width: 24, height: 24, backgroundColor: '#6366F1', border: '2px solid #22D3EE', borderRadius: 4 }}></div>
                    <span className="text-sm" style={{ color: '#E5E7EB' }}>Tasks</span>
                  </div>
                  <div className="flex-1 text-right">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      Calendar-Task Integration Active
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rule Info Banner */}
      <Card style={{ backgroundColor: '#6366F120', borderColor: '#6366F1' }}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5" style={{ color: '#6366F1' }} />
            <div>
              <p className="font-medium" style={{ color: '#E5E7EB' }}>
                One Source of Truth Rule
              </p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Only one calendar provider can be active at a time. Disconnect the current provider to switch.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        style={
          showOnboarding && isProviderSelectionStep
            ? {
                outline: '2px dashed #A5B4FC',
                outlineOffset: 8,
                borderRadius: 12,
                padding: 4,
              }
            : undefined
        }
      >
        {calendarProviderInfo.map((providerInfo) => {
          const provider = state.calendars.find(c => c.id === providerInfo.id);
          if (!provider) return null;

          const isActive = provider.connected;
          const isLocked = !isActive && activeProviderId !== null;

          return (
            <Card
              key={provider.id}
              data-onboarding="select-provider"
              className="relative transition-all duration-300"
              style={{
                backgroundColor: '#1E293B',
                borderColor: isActive
                  ? '#22D3EE'
                  : showOnboarding && currentOnboardingStep?.id === 'select-provider'
                    ? '#6366F1'
                    : '#374151',
                border: isActive || (showOnboarding && currentOnboardingStep?.id === 'select-provider') ? '2px solid' : '1px solid',
                boxShadow: isActive ? '0 0 30px rgba(34, 211, 238, 0.3)' : 'none',
                opacity: isLocked ? 0.4 : 1,
                filter: isLocked ? 'grayscale(100%)' : 'none',
              }}
            >
              {isActive && (
                <div className="absolute top-4 right-4 z-10">
                  <div className="px-3 py-1 rounded-full flex items-center gap-2" style={{ backgroundColor: '#22D3EE20', border: '1px solid #22D3EE' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22D3EE' }}></div>
                    <span className="text-xs font-medium" style={{ color: '#22D3EE' }}>Active</span>
                  </div>
                </div>
              )}

              {isLocked && (
                <div className="absolute top-4 right-4 z-10">
                  <Lock className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                </div>
              )}

              <CardHeader>
                <div className="text-4xl mb-3">{providerInfo.icon}</div>
                <CardTitle style={{ color: '#E5E7EB' }}>{providerInfo.name}</CardTitle>
                <CardDescription style={{ color: '#9CA3AF' }}>
                  {providerInfo.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {isActive ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Status</span>
                        <span className="text-sm font-medium flex items-center gap-1" style={{ color: '#22D3EE' }}>
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22D3EE' }}></div>
                          Connected
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Last Sync</span>
                        <span className="text-sm" style={{ color: '#E5E7EB' }}>
                          {provider.lastSync ? new Date(provider.lastSync).toLocaleTimeString() : 'Never'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Events Synced</span>
                        <span className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{provider.eventCount || 0}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        className="flex-1"
                        variant="outline"
                        onClick={() => syncProvider('calendar', provider.id)}
                        style={{ borderColor: '#6366F1', color: '#6366F1' }}
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleDisconnect(provider.id)}
                        style={{ borderColor: '#EF4444', color: '#EF4444' }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full transition-all duration-300"
                    onClick={() => handleConnect(provider.id)}
                    disabled={isLocked}
                    style={{ 
                      backgroundColor: isLocked ? '#374151' : '#6366F1', 
                      color: '#fff',
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLocked ? (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Locked
                      </>
                    ) : (
                      `Connect ${providerInfo.name}`
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Settings */}
      <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <CardTitle style={{ color: '#E5E7EB' }}>Sync Settings</CardTitle>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Configure how SyncFlow interacts with your calendars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showOnboarding && currentOnboardingStep?.target && (
            <div className="rounded-lg p-4" style={{ backgroundColor: '#6366F120', border: '1px solid #6366F1' }}>
              <div className="flex items-start gap-2">
                <CalendarIcon className="w-5 h-5 mt-0.5" style={{ color: '#6366F1' }} />
                <div>
                  <p className="font-medium" style={{ color: '#E5E7EB' }}>
                    Tutorial Focus: {currentOnboardingStep.action}
                  </p>
                  <p className="text-sm mt-1" style={{ color: '#C7D2FE' }}>{currentOnboardingStep.instruction}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              data-onboarding="sync-frequency"
              className="p-4 rounded-lg"
              style={{
                backgroundColor: '#0F172A',
                border: isSettingFocused('syncFrequency') ? '2px solid #6366F1' : '1px solid #1F2937',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Sync Frequency</span>
                <select
                  value={syncSettings.syncFrequency}
                  onChange={(e) => {
                    setSyncSettings(prev => ({ ...prev, syncFrequency: e.target.value as SyncFrequency }));
                    setSettingsTouched(prev => ({ ...prev, syncFrequency: true }));
                  }}
                  style={{ background: '#111827', border: '1px solid #374151', color: '#E5E7EB', padding: '4px 8px', borderRadius: 6 }}
                >
                  <option value="real-time">Real-time</option>
                  <option value="15-min">Every 15 minutes</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                How often SyncFlow checks for changes and updates your events.
              </p>
            </div>

            <div
              data-onboarding="event-types"
              className="p-4 rounded-lg"
              style={{
                backgroundColor: '#0F172A',
                border: isSettingFocused('eventTypes') ? '2px solid #6366F1' : '1px solid #1F2937',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Event Types to Sync</span>
                <select
                  value={syncSettings.eventTypes}
                  onChange={(e) => {
                    setSyncSettings(prev => ({ ...prev, eventTypes: e.target.value as EventTypes }));
                    setSettingsTouched(prev => ({ ...prev, eventTypes: true }));
                  }}
                  style={{ background: '#111827', border: '1px solid #374151', color: '#E5E7EB', padding: '4px 8px', borderRadius: 6 }}
                >
                  <option value="all-events">All events</option>
                  <option value="work-only">Only work-related</option>
                </select>
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Choose whether personal + work events sync, or only work-related events.
              </p>
            </div>

            <div
              data-onboarding="sync-direction"
              className="p-4 rounded-lg"
              style={{
                backgroundColor: '#0F172A',
                border: isSettingFocused('syncDirection') ? '2px solid #6366F1' : '1px solid #1F2937',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Sync Direction</span>
                <select
                  value={syncSettings.syncDirection}
                  onChange={(e) => {
                    setSyncSettings(prev => ({ ...prev, syncDirection: e.target.value as SyncDirection }));
                    setSettingsTouched(prev => ({ ...prev, syncDirection: true }));
                  }}
                  style={{ background: '#111827', border: '1px solid #374151', color: '#E5E7EB', padding: '4px 8px', borderRadius: 6 }}
                >
                  <option value="two-way">Two-way</option>
                  <option value="one-way">One-way</option>
                </select>
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                One-way reads events only. Two-way can also write updates back.
              </p>
            </div>

            <div
              data-onboarding="notifications"
              className="p-4 rounded-lg"
              style={{
                backgroundColor: '#0F172A',
                border: isSettingFocused('notifications') ? '2px solid #6366F1' : '1px solid #1F2937',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Notification Preferences</span>
                <input
                  type="checkbox"
                  checked={syncSettings.notifications}
                  onChange={(e) => {
                    setSyncSettings(prev => ({ ...prev, notifications: e.target.checked }));
                    setSettingsTouched(prev => ({ ...prev, notifications: true }));
                  }}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: '#6366F1' }}
                />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Get alerts when sync runs, fails, or needs your review.
              </p>
            </div>

            <div
              data-onboarding="conflict-handling"
              className="p-4 rounded-lg md:col-span-2"
              style={{
                backgroundColor: '#0F172A',
                border: isSettingFocused('conflictHandling') ? '2px solid #6366F1' : '1px solid #1F2937',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Conflict Handling</span>
                <select
                  value={syncSettings.conflictHandling}
                  onChange={(e) => {
                    setSyncSettings(prev => ({ ...prev, conflictHandling: e.target.value as ConflictHandling }));
                    setSettingsTouched(prev => ({ ...prev, conflictHandling: true }));
                  }}
                  style={{ background: '#111827', border: '1px solid #374151', color: '#E5E7EB', padding: '4px 8px', borderRadius: 6 }}
                >
                  <option value="auto-resolve">Auto-resolve overlaps</option>
                  <option value="notify-only">Notify only</option>
                </select>
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Choose whether SyncFlow fixes overlapping schedules automatically or asks first.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Modal */}
      {selectedProvider && (
        <CalendarConnectionModal
          open={!!selectedProvider}
          onClose={() => {
            setSelectedProvider(null);
            setIsConnectingCalendar(false);
            if (showOnboarding && currentOnboardingStep?.id === 'grant-permissions') {
              setConnectionStepState(prev => ({ ...prev, signInDone: false }));
            }
          }}
          providerId={selectedProvider}
          providerName={calendarProviderInfo.find(p => p.id === selectedProvider)?.name || ''}
          onConnect={(credentials) => handleConnectFromModal(selectedProvider, credentials)}
          isConnecting={isConnectingCalendar}
          connectError={connectionError}
          initialAuthMethod={selectedProvider === 'apple' ? 'manual' : 'oauth'}
        />
      )}

      {/* Optimization Dialog */}
      <AlertDialog open={showOptimizeDialog} onOpenChange={setShowOptimizeDialog}>
        <AlertDialogContent style={{ backgroundColor: '#1E293B', borderColor: '#374151', maxWidth: '600px' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#E5E7EB', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles className="w-6 h-6" style={{ color: '#10B981' }} />
              AI Schedule Optimization
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#9CA3AF' }}>
              Our AI has detected overlapping events and tasks in your calendar. Review the suggested changes below.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-3 my-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {optimizationChanges.map((change, index) => (
              <div key={change.id} className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A', border: '1px solid #374151' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedOptimizationChangeIds.includes(change.id)}
                      onChange={(e) => {
                        setSelectedOptimizationChangeIds(prev => {
                          if (e.target.checked) {
                            return [...prev, change.id];
                          }
                          return prev.filter(id => id !== change.id);
                        });
                      }}
                      className="mt-1 w-4 h-4 rounded"
                      style={{ accentColor: '#10B981' }}
                    />
                    <div>
                      <div className="font-medium" style={{ color: '#E5E7EB' }}>{change.title}</div>
                      <div className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{change.reason}</div>
                    </div>
                  </div>
                  <div className="ml-4 px-2 py-1 rounded text-xs font-medium" style={{ backgroundColor: '#10B98120', color: '#10B981', border: '1px solid #10B981' }}>
                    Change #{index + 1}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-3" style={{ color: '#E5E7EB' }}>
                  <div className="px-3 py-1 rounded" style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
                    {change.oldTime}
                  </div>
                  <ChevronRight className="w-4 h-4" style={{ color: '#9CA3AF' }} />
                  <div className="px-3 py-1 rounded" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
                    {change.newTime}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-lg" style={{ backgroundColor: '#6366F120', border: '1px solid #6366F1' }}>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5" style={{ color: '#6366F1' }} />
              <div>
                <div className="font-medium" style={{ color: '#E5E7EB' }}>AI Recommendation</div>
                <div className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                  Apply {selectedOptimizationChangeIds.length} of {optimizationChanges.length} suggested change(s) to resolve conflicts and add appropriate buffer time between events.
                </div>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              style={{ 
                backgroundColor: 'transparent', 
                borderColor: '#374151', 
                color: '#E5E7EB' 
              }}
              onClick={() => setShowOptimizeDialog(false)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              style={{ 
                backgroundColor: '#10B981', 
                color: '#fff' 
              }}
              onClick={handleApproveOptimization}
              disabled={selectedOptimizationChangeIds.length === 0}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Approve Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}