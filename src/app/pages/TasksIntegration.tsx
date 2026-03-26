import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw, Filter, Trash2, Lock, Calendar as CalendarIcon, Link } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useIntegrations } from '../contexts/IntegrationContext';
import { useAuth } from '../contexts/AuthContext';
import { TaskConnectionModal } from '../components/TaskConnectionModal';
import { ChatCreatedTask, clearManualTasks, loadChatCreatedTasks, loadManualTasks, saveManualTasks } from '../services/chatSimulatorStorage';
import { toast } from 'sonner';

const taskProviderInfo = [
  {
    id: 'google-tasks',
    name: 'Google Tasks',
    description: 'Sync with Google Tasks',
    icon: '📝',
  },
  {
    id: 'microsoft-todo',
    name: 'Microsoft To Do',
    description: 'Sync with Microsoft To Do lists',
    icon: '✅',
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Sync with Todoist projects',
    icon: '📋',
  },
];

export function TasksIntegration() {
  type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';
  type OnboardingStepId =
    | 'sync-direction'
    | 'sync-subtasks'
    | 'ai-task-creation'
    | 'select-provider'
    | 'grant-permissions'
    | 'integration-overview'
    | 'integration-sync-tasks'
    | 'integration-auto-block'
    | 'integration-calendar-view'
    | 'integration-events-to-tasks'
    | 'integration-sync-completed'
    | 'integration-block-duration'
    | 'task-creation-panel'
    | 'task-creation-submit';
  type OnboardingStep = {
    id: OnboardingStepId;
    action: string;
    instruction: string;
    microcopy: string;
    whyItMatters: string;
    targetSelector?: string;
    requiresModal?: boolean;
    fallbackMessage?: string;
  };

  const { state, connectTask, disconnectTask, syncProvider, canConnect, getActiveProvider, updateCalendarTaskSync } = useIntegrations();
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(() => !state.tasks.some((task) => task.connected));
  const [hasUserRequestedTutorial, setHasUserRequestedTutorial] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [onboardingProviderChoice, setOnboardingProviderChoice] = useState<string | null>(null);
  const [isConnectingTask, setIsConnectingTask] = useState(false);
  const [taskConnectionError, setTaskConnectionError] = useState<string | null>(null);
  const [selectedConnectionMethod, setSelectedConnectionMethod] = useState<'oauth' | 'apikey' | null>(null);
  const [connectionStepState, setConnectionStepState] = useState({ permissionsGranted: false });
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
  const [demoTaskTitle, setDemoTaskTitle] = useState('');
  const [demoTaskDueDate, setDemoTaskDueDate] = useState('');
  const [demoTasks, setDemoTasks] = useState<Array<{ id: string; title: string; due: string; providerId: string }>>([]);
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const [openedTaskTitle, setOpenedTaskTitle] = useState('');
  const [openedTaskDueDate, setOpenedTaskDueDate] = useState('');
  const [taskOverrides, setTaskOverrides] = useState<Record<string, { title: string; due: string }>>({});
  const [chatCreatedTasks, setChatCreatedTasks] = useState<ChatCreatedTask[]>([]);
  const [taskSearchKeyword, setTaskSearchKeyword] = useState('');
  const [dueDateSortOrder, setDueDateSortOrder] = useState<'asc' | 'desc'>('asc');
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setChatCreatedTasks(loadChatCreatedTasks(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    setDemoTasks(loadManualTasks(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    saveManualTasks(user, demoTasks);
  }, [demoTasks, user?.id, user?.email]);

  const baseOnboardingSteps: OnboardingStep[] = [
    {
      id: 'sync-direction',
      action: 'Review two-way sync',
      instruction: 'This controls whether task changes sync back to your source provider.',
      microcopy: 'Keep this on if you want edits in SyncFlow to reflect externally.',
      whyItMatters: 'Defines write access and prevents unexpected edits in external apps.',
      targetSelector: '[data-onboarding="sync-direction"]',
    },
    {
      id: 'sync-subtasks',
      action: 'Review subtask sync',
      instruction: 'Subtasks and dependencies can be included in synchronization.',
      microcopy: 'Enable this when task hierarchy matters for your planning.',
      whyItMatters: 'Preserves task structure and execution order.',
      targetSelector: '[data-onboarding="sync-subtasks"]',
    },
    {
      id: 'ai-task-creation',
      action: 'Review AI task creation',
      instruction: 'AI can generate tasks from chat and notes when enabled.',
      microcopy: 'Leave on to speed up capture from conversations.',
      whyItMatters: 'Controls automated task generation behavior and data flow.',
      targetSelector: '[data-onboarding="ai-task-creation"]',
    },
    {
      id: 'select-provider',
      action: 'Select task provider',
      instruction: 'Choose one provider card and click Connect to continue.',
      microcopy: 'Only one task provider can be active at a time.',
      whyItMatters: 'Sets the source of truth for your tasks.',
      targetSelector: '[data-onboarding="select-provider"]',
      fallbackMessage: 'Provider options are unavailable right now. Disconnect active provider or retry.',
    },
  ];

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    const providerName = onboardingProviderChoice
          ? taskProviderInfo.find((provider) => provider.id === onboardingProviderChoice)?.name || 'selected provider'
      : 'selected provider';

    const hasConnectedCalendar = state.calendars.some((calendar) => calendar.connected);

    const integrationSteps: OnboardingStep[] = hasConnectedCalendar
      ? [
          {
            id: 'integration-overview',
            action: 'Review Calendar-Task Integration',
            instruction: 'Now that tasks are connected, configure how tasks and calendar work together.',
            microcopy: 'This section lets you coordinate scheduling and task execution in one place.',
            whyItMatters: 'Creates a unified workflow between due dates and calendar planning.',
            targetSelector: '[data-onboarding="integration-overview"]',
          },
          {
            id: 'integration-sync-tasks',
            action: 'Sync tasks to calendar',
            instruction: 'Enable this to surface task due dates in your calendar timeline.',
            microcopy: 'Great for seeing deadlines alongside meetings.',
            whyItMatters: 'Keeps time-sensitive tasks visible in daily planning.',
            targetSelector: '[data-onboarding="integration-sync-tasks"]',
          },
          {
            id: 'integration-auto-block',
            action: 'Auto-block focus time',
            instruction: 'Auto-blocking reserves calendar time for tasks automatically.',
            microcopy: 'Turn this on when you want proactive planning support.',
            whyItMatters: 'Prevents overbooking and protects execution time.',
            targetSelector: '[data-onboarding="integration-auto-block"]',
          },
          {
            id: 'integration-calendar-view',
            action: 'Show tasks in calendar view',
            instruction: 'Display task items directly in your calendar interface.',
            microcopy: 'Helpful when you review your week visually.',
            whyItMatters: 'Unifies visibility across tools so nothing gets missed.',
            targetSelector: '[data-onboarding="integration-calendar-view"]',
          },
          {
            id: 'integration-events-to-tasks',
            action: 'Convert events into tasks',
            instruction: 'Enable this to convert selected calendar events into actionable tasks.',
            microcopy: 'Useful for follow-up actions after meetings.',
            whyItMatters: 'Captures execution work from your schedule automatically.',
            targetSelector: '[data-onboarding="integration-events-to-tasks"]',
          },
          {
            id: 'integration-sync-completed',
            action: 'Sync completion status',
            instruction: 'When enabled, completed tasks update linked calendar records.',
            microcopy: 'Keeps your calendar and task list status aligned.',
            whyItMatters: 'Prevents stale items and improves reporting accuracy.',
            targetSelector: '[data-onboarding="integration-sync-completed"]',
          },
          {
            id: 'integration-block-duration',
            action: 'Set task block duration',
            instruction: 'Adjust the default number of minutes auto-blocked for tasks.',
            microcopy: 'Start with 60 minutes and tune based on your workflow.',
            whyItMatters: 'Right-sized blocks improve planning reliability and focus.',
            targetSelector: '[data-onboarding="integration-block-duration"]',
          },
        ]
      : [
          {
            id: 'integration-overview',
            action: 'Calendar-Task Integration is ready',
            instruction: 'Connect a calendar provider next to unlock linked automation controls here.',
            microcopy: 'You can continue now and complete calendar setup afterward.',
            whyItMatters: 'Both providers are required for cross-surface syncing.',
            targetSelector: '[data-onboarding="integration-overview"]',
          },
        ];

    const taskCreationSteps: OnboardingStep[] = [
      {
        id: 'task-creation-panel',
        action: 'Review task creation panel',
        instruction: 'This section lets you create tasks manually by entering a title and due date.',
        microcopy: 'Use this for quick capture when you are planning your day.',
        whyItMatters: 'Provides a direct path to add tasks before they sync to your connected provider.',
        targetSelector: '[data-onboarding="task-creation-panel"]',
        fallbackMessage: 'Task creation panel is not available. Connect a task provider first.',
      },
      {
        id: 'task-creation-submit',
        action: 'Create your first task',
        instruction: 'After entering a title and due date, click Add Task to save the item.',
        microcopy: 'Press Enter in the title field for a faster add flow.',
        whyItMatters: 'Confirms your task source is working and demonstrates end-to-end creation.',
        targetSelector: '[data-onboarding="task-creation-submit"]',
        fallbackMessage: 'Add Task action is unavailable until a provider is connected.',
      },
    ];

    return [
      ...baseOnboardingSteps,
      {
        id: 'grant-permissions',
        action: `Authorize ${providerName}`,
        instruction:
          onboardingProviderChoice === 'todoist'
            ? `Enter your ${providerName} API token and connect.`
            : `Approve ${providerName} access and complete task connection.`,
        microcopy:
          onboardingProviderChoice === 'todoist'
            ? 'Use your API token from provider settings.'
            : 'Review permission scope before authorizing.',
        whyItMatters: 'Finalizes secure connection and enables syncing tasks.',
        targetSelector: '[data-onboarding="modal-authorize"]',
        requiresModal: true,
        fallbackMessage: 'Authorize/connect action is unavailable. Reopen the provider modal and retry.',
      },
      ...integrationSteps,
      ...taskCreationSteps,
    ];
  }, [onboardingProviderChoice, state.calendars, state.tasks]);

  // If a task provider is already connected, remove provider selection/connection steps
  const onboardingStepsFiltered = useMemo(() => {
    const hasConnectedTask = state.tasks.some((t) => t.connected);
    if (!hasConnectedTask) return onboardingSteps;
    return onboardingSteps.filter((s) => s.id !== 'select-provider' && s.id !== 'grant-permissions');
  }, [onboardingSteps, state.tasks]);

  // Keep current step consistent when the filtered steps list changes (avoid skipping)
  const lastOnboardingStepIdRef = useRef<string | null>(null);
  const pendingPostConnectStepRef = useRef<string | null>(null);

  useEffect(() => {
    lastOnboardingStepIdRef.current = onboardingStepsFiltered[onboardingStepIndex]?.id ?? null;
  }, [onboardingStepIndex]);

  useEffect(() => {
    const pending = pendingPostConnectStepRef.current;
    if (pending) {
      const targetIndex = onboardingStepsFiltered.findIndex((s) => s.id === pending);
      if (targetIndex !== -1) {
        setOnboardingStepIndex(targetIndex);
        pendingPostConnectStepRef.current = null;
        return;
      }
    }

    const prevId = lastOnboardingStepIdRef.current;
    if (!prevId) {
      setOnboardingStepIndex((prev) => Math.min(prev, Math.max(0, onboardingStepsFiltered.length - 1)));
      return;
    }
    const newIndex = onboardingStepsFiltered.findIndex((s) => s.id === prevId);
    if (newIndex === -1) {
      setOnboardingStepIndex((prev) => Math.min(prev, Math.max(0, onboardingStepsFiltered.length - 1)));
    } else if (newIndex !== onboardingStepIndex) {
      setOnboardingStepIndex(newIndex);
    }
  }, [onboardingStepsFiltered]);

  const connectedCount = state.tasks.filter(t => t.connected).length;
  const totalTasks = state.tasks.reduce((sum, t) => sum + (t.taskCount || 0), 0);
  const activeProviderId = getActiveProvider('task');
  const activeCalendarId = getActiveProvider('calendar');
  const calendarTaskSync = state.calendarTaskSync;
  const currentOnboardingStep = onboardingStepsFiltered[onboardingStepIndex];
  const isProviderSelectionStep = currentOnboardingStep?.id === 'select-provider';

  const getStepIndexById = (stepId: OnboardingStepId) => onboardingStepsFiltered.findIndex((step) => step.id === stepId);

  const isOnboardingStepComplete = (stepId: OnboardingStepId) => {
    switch (stepId) {
      case 'select-provider':
        return onboardingProviderChoice !== null;
      case 'grant-permissions':
        return connectionStepState.permissionsGranted || activeProviderId !== null;
      default:
        return true;
    }
  };

  const canAdvanceOnboardingStep = currentOnboardingStep
    ? isProviderSelectionStep
      ? false
      : currentOnboardingStep.requiresModal
        ? isOnboardingStepComplete(currentOnboardingStep.id)
        : isOnboardingStepComplete(currentOnboardingStep.id) || spotlightTargetMissing
    : false;

  const providerLabel = onboardingProviderChoice
    ? taskProviderInfo.find((provider) => provider.id === onboardingProviderChoice)?.name || 'selected provider'
    : 'selected provider';

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

      if (canScroll) ancestors.push(parent);
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
    if (spaces.bottom >= tooltipHeight + gap) placement = 'bottom';
    else if (spaces.top >= tooltipHeight + gap) placement = 'top';
    else if (spaces.right >= tooltipWidth + gap) placement = 'right';
    else placement = 'left';

    let top = rect.top + rect.height + gap;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (placement === 'top') top = rect.top - tooltipHeight - gap;
    if (placement === 'right') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width + gap;
    }
    if (placement === 'left') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - gap;
    }

    return {
      placement,
      top: Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding)),
      left: Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding)),
    };
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
        ? state.tasks.find((provider) => provider.id === onboardingProviderChoice)
        : null;
      const connectableProvider = routedProvider && canConnect('task', routedProvider.id).allowed
        ? routedProvider
        : state.tasks.find((provider) => canConnect('task', provider.id).allowed);
      if (connectableProvider) {
        void handleConnect(connectableProvider.id);
      }
    }

    if (!currentOnboardingStep.targetSelector) {
      setSpotlightTargetMissing(true);
      setSpotlightFallbackMessage(currentOnboardingStep.fallbackMessage || 'No target is associated with this step.');
      setSpotlightRect(null);
      setSpotlightRects([]);
      setSpotlightGroupRect(null);
      return;
    }

    const targets = Array.from(document.querySelectorAll(currentOnboardingStep.targetSelector)) as HTMLElement[];
    if (targets.length === 0) {
      setSpotlightTargetMissing(true);
      if (currentOnboardingStep.requiresModal && selectedProvider) {
        setSpotlightFallbackMessage('Preparing provider modal... please wait while we locate this step.');
      } else {
        setSpotlightFallbackMessage(currentOnboardingStep.fallbackMessage || 'This UI element is not available right now.');
      }
      setSpotlightRect(null);
      setSpotlightRects([]);
      setSpotlightGroupRect(null);
      return;
    }

    setSpotlightTargetMissing(false);
    setSpotlightFallbackMessage(null);

    ensureElementVisibility(targets[0]);
    if (targets.length > 1) ensureElementVisibility(targets[targets.length - 1]);

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

      const aggregateRect = paddedRects.length > 1
        ? {
            top: Math.min(...paddedRects.map((rect) => rect.top)) - 6,
            left: Math.min(...paddedRects.map((rect) => rect.left)) - 6,
            width: Math.max(...paddedRects.map((rect) => rect.left + rect.width)) - Math.min(...paddedRects.map((rect) => rect.left)) + 12,
            height: Math.max(...paddedRects.map((rect) => rect.top + rect.height)) - Math.min(...paddedRects.map((rect) => rect.top)) + 12,
          }
        : null;

      setSpotlightGroupRect(aggregateRect);
      const primaryRect = aggregateRect || paddedRects[0];
      setSpotlightRect(primaryRect);

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const placement = computeTooltipPlacement(primaryRect, tooltipRect.width, tooltipRect.height);
        setTooltipPosition(placement);
      }
    };

    remeasure();
    window.setTimeout(remeasure, 280);
  };

  const handleConnect = async (providerId: string) => {
    const check = canConnect('task', providerId);
    if (!check.allowed) {
      const activeProviderName = taskProviderInfo.find((provider) => provider.id === check.activeProvider)?.name;
      toast.error('Only One Task Provider Allowed', {
        description: `Please disconnect ${activeProviderName} before connecting to a new provider.`,
        duration: 4000,
      });
      return;
    }

    setTaskConnectionError(null);
    setConnectionStepState({ permissionsGranted: false });
    setOnboardingProviderChoice(providerId);
    setSelectedProvider(providerId);

    if (showOnboarding && currentOnboardingStep?.id === 'select-provider') {
      const finalStepIndex = getStepIndexById('grant-permissions');
      if (finalStepIndex !== -1) setOnboardingStepIndex(finalStepIndex);

      const target = await waitForElement('[data-onboarding="modal-authorize"]', 2600);
      if (target) updateSpotlightForStep();
    }
  };

  const handleConnectFromModal = (providerId: string, credentials: any) => {
    setTaskConnectionError(null);
    setIsConnectingTask(true);
    setSelectedConnectionMethod(credentials.method === 'apikey' ? 'apikey' : 'oauth');

    const loadingToastId = toast.loading('Connecting task provider...', {
      description: 'Authorizing and validating task sync access.',
    });

    window.setTimeout(() => {
      try {
        if (credentials.method === 'apikey' && !credentials.apiKey) {
          throw new Error('API key is required for API key connection.');
        }

        connectTask(providerId, credentials);
        setConnectionStepState({ permissionsGranted: true });
        setSelectedProvider(null);
        toast.dismiss(loadingToastId);
        toast.success('Task Provider Connected', {
          description: `${taskProviderInfo.find((provider) => provider.id === providerId)?.name} is now linked to SyncFlow.`,
          duration: 3500,
        });

        if (showOnboarding && currentOnboardingStep?.id === 'grant-permissions') {
          // Defer selecting the next onboarding step until filtered steps update
          pendingPostConnectStepRef.current = 'integration-overview';
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed. Please try again.';
        setTaskConnectionError(errorMessage);
        toast.dismiss(loadingToastId);
        toast.error('Connection Failed', {
          description: errorMessage,
          duration: 4500,
        });
      } finally {
        setIsConnectingTask(false);
      }
    }, 900);
  };

  const goToNextOnboardingStep = () => {
    if (!currentOnboardingStep || !canAdvanceOnboardingStep) return;
    const nextIndex = onboardingStepIndex + 1;
    if (nextIndex >= onboardingStepsFiltered.length) {
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
    setConnectionStepState({ permissionsGranted: false });
    setSelectedProvider(null);
    setTaskConnectionError(null);
  };

  const handleDisconnect = (providerId: string) => {
    if (confirm(`Disconnect ${taskProviderInfo.find(p => p.id === providerId)?.name}? Tasks will remain in the source app.`)) {
      disconnectTask(providerId);
      setDemoTasks([]);
      setTaskOverrides({});
      clearManualTasks(user);
      toast.success('Task Provider Disconnected', {
        description: 'Manual tasks were cleared. You can now connect a different task provider.',
        duration: 3000,
      });
    }
  };

  useEffect(() => {
    const hasConnectedTask = state.tasks.some((task) => task.connected);
    if (hasConnectedTask && !hasUserRequestedTutorial && onboardingProviderChoice === null) {
      setShowOnboarding(false);
    }
  }, [state.tasks, hasUserRequestedTutorial, onboardingProviderChoice]);

  useEffect(() => {
    if (onboardingStepIndex <= onboardingStepsFiltered.length - 1) return;
    setOnboardingStepIndex(Math.max(0, onboardingStepsFiltered.length - 1));
  }, [onboardingStepIndex, onboardingStepsFiltered.length]);

  useEffect(() => {
    updateSpotlightForStep();
  }, [
    showOnboarding,
    onboardingStepIndex,
    onboardingProviderChoice,
    selectedProvider,
    activeProviderId,
    state.tasks,
    connectionStepState.permissionsGranted,
  ]);

  useEffect(() => {
    if (!showOnboarding || !currentOnboardingStep?.requiresModal || !currentOnboardingStep.targetSelector) return;
    let cancelled = false;

    waitForElement(currentOnboardingStep.targetSelector, 2600).then((target) => {
      if (cancelled || !target) return;
      updateSpotlightForStep();
    });

    return () => {
      cancelled = true;
    };
  }, [showOnboarding, onboardingStepIndex, selectedProvider, onboardingProviderChoice, currentOnboardingStep?.targetSelector]);

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

  const handleCalendarSyncToggle = (key: keyof typeof calendarTaskSync) => {
    updateCalendarTaskSync({
      ...calendarTaskSync,
      [key]: !calendarTaskSync[key],
    });
    toast.success('Calendar-Task Sync Updated', {
      description: 'Your integration settings have been updated.',
      duration: 2000,
    });
  };

  // Mock task list generator for the right-hand panel
  const generateProviderMockTasks = (providerId?: string | null) => {
    if (!providerId) return [] as Array<{ id: string; title: string; due: string }>;
    // Sample tasks and due dates
    return [
      { id: 'm1', title: 'HCI Figma - Wireframe (refer Motion APP)', due: '25/02/2026' },
      { id: 'm2', title: 'Complete task 1.15, 1.16 and Task 3 for Neural Network Basics', due: '26/02/2026' },
      { id: 'm3', title: 'Neural Network Basic - Assignment 1', due: '27/02/2026' },
      { id: 'm4', title: 'Post-week retrospective', due: '02/03/2026' },
    ];
  };

  const formatDueDate = (value: string) => {
    if (!value) return '';
    const segments = value.split('-');
    if (segments.length !== 3) return value;

    const [year, month, day] = segments;
    if (!year || !month || !day) return value;
    return `${day}/${month}/${year}`;
  };

  const handleAddDemoTask = () => {
    if (!activeProviderId) {
      toast.error('Connect a task provider first.');
      return;
    }

    const trimmedTitle = demoTaskTitle.trim();
    if (!trimmedTitle) {
      toast.error('Please enter a task title.');
      return;
    }

    if (!demoTaskDueDate) {
      toast.error('Please select a due date.');
      return;
    }

    setDemoTasks(previous => [
      {
        id: `demo-${Date.now()}-${previous.length + 1}`,
        title: trimmedTitle,
        due: formatDueDate(demoTaskDueDate),
        providerId: activeProviderId,
      },
      ...previous,
    ]);

    setDemoTaskTitle('');
    setDemoTaskDueDate('');
    toast.success('Task added for demo.');
  };

  const parseDisplayDueDateToTimestamp = (displayDueDate: string) => {
    const segments = displayDueDate.split('/');
    if (segments.length !== 3) return Number.MAX_SAFE_INTEGER;

    const [day, month, year] = segments.map(value => Number(value));
    if (!day || !month || !year) return Number.MAX_SAFE_INTEGER;

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? Number.MAX_SAFE_INTEGER : parsed.getTime();
  };

  const parseDisplayDueDateToISO = (displayDueDate: string) => {
    const segments = displayDueDate.split('/');
    if (segments.length !== 3) return '';

    const [day, month, year] = segments.map(value => Number(value));
    if (!day || !month || !year) return '';

    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return '';

    const normalizedDay = String(day).padStart(2, '0');
    const normalizedMonth = String(month).padStart(2, '0');
    return `${year}-${normalizedMonth}-${normalizedDay}`;
  };

  const visibleTasks = [
    ...demoTasks.filter(task => task.providerId === activeProviderId),
    ...chatCreatedTasks
      .filter(task => task.providerId === activeProviderId)
      .map(task => ({ id: task.id, title: task.title, due: task.due, providerId: task.providerId })),
    ...generateProviderMockTasks(activeProviderId),
  ]
    .map(task => {
      const override = taskOverrides[task.id];
      if (!override) return task;
      return {
        ...task,
        title: override.title,
        due: override.due,
      };
    })
    .filter(task => {
      const keyword = taskSearchKeyword.trim().toLowerCase();
      if (!keyword) return true;
      return (
        task.title.toLowerCase().includes(keyword) ||
        task.due.toLowerCase().includes(keyword)
      );
    })
    .sort((a, b) => {
      const timeA = parseDisplayDueDateToTimestamp(a.due);
      const timeB = parseDisplayDueDateToTimestamp(b.due);
      return dueDateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

  const handleOpenTask = (task: { id: string; title: string; due: string }) => {
    setOpenedTaskId(task.id);
    setOpenedTaskTitle(task.title);
    setOpenedTaskDueDate(parseDisplayDueDateToISO(task.due));
  };

  const handleSaveOpenedTask = () => {
    if (!openedTaskId) return;

    const trimmedTitle = openedTaskTitle.trim();
    if (!trimmedTitle) {
      toast.error('Task title cannot be empty.');
      return;
    }

    if (!openedTaskDueDate) {
      toast.error('Please select a due date.');
      return;
    }

    const formattedDueDate = formatDueDate(openedTaskDueDate);

    setTaskOverrides(previous => ({
      ...previous,
      [openedTaskId]: { title: trimmedTitle, due: formattedDueDate },
    }));

    setDemoTasks(previous => previous.map(task => (
      task.id === openedTaskId
        ? { ...task, title: trimmedTitle, due: formattedDueDate }
        : task
    )));

    toast.success('Task updated.');
    setOpenedTaskId(null);
  };

  return (
    <div className="p-8" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Task Integration</h1>
          <p className="mt-2" style={{ color: '#9CA3AF' }}>
            One Source of Truth • {connectedCount > 0 ? `${taskProviderInfo.find(p => p.id === activeProviderId)?.name} Active • ${totalTasks} total tasks` : 'No Active Provider'}
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
              <span className="text-sm font-medium" style={{ color: '#22D3EE' }}>Two-Way Sync Active</span>
            </div>
          )}
        </div>
      </div>

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
              key={`task-spotlight-${index}`}
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
              Guided Setup • Step {onboardingStepIndex + 1} of {onboardingStepsFiltered.length}
            </div>
            <p className="mt-2 font-semibold" style={{ color: '#E5E7EB' }}>{currentOnboardingStep.action}</p>
            <p className="text-sm mt-2" style={{ color: '#CBD5E1' }}>
              {currentOnboardingStep.id === 'grant-permissions'
                ? `Complete authorization for ${providerLabel}.`
                : currentOnboardingStep.id === 'select-provider'
                  ? 'Choose one provider below. All options are grouped as equivalent choices.'
                  : currentOnboardingStep.instruction}
            </p>
            <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>Tip: {currentOnboardingStep.microcopy}</p>

            {spotlightTargetMissing && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}>
                <p className="text-xs" style={{ color: '#FCD34D' }}>
                  {spotlightFallbackMessage || 'This element is currently unavailable.'}
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
                  onClick={() => {
                    setShowOnboarding(false);
                    setHasUserRequestedTutorial(false);
                  }}
                  style={{ borderColor: '#374151', color: '#000000' }}
                >
                  Skip
                </Button>
                {!isProviderSelectionStep && (
                  <Button
                    onClick={goToNextOnboardingStep}
                    disabled={!canAdvanceOnboardingStep}
                    style={{ backgroundColor: '#6366F1', color: '#fff' }}
                  >
                    {onboardingStepIndex === onboardingStepsFiltered.length - 1 ? 'Finish' : 'Next'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="space-y-6">
        {/* Task panel — full width and shown first */}
        <div>
          {activeProviderId ? (
            <Card data-onboarding="task-creation-panel" style={{ backgroundColor: '#0B1220', borderColor: '#111827' }}>
              <CardHeader>
                <CardTitle style={{ color: '#E5E7EB' }}>Add a task</CardTitle>
              </CardHeader>
              <CardContent>
                <div style={{ backgroundColor: '#0F172A', padding: 12, borderRadius: 8 }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      placeholder="Task title"
                      value={demoTaskTitle}
                      onChange={(event) => setDemoTaskTitle(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleAddDemoTask();
                        }
                      }}
                      className="md:col-span-2 w-full p-3 rounded"
                      style={{ backgroundColor: '#0B1220', border: '1px solid #1F2937', color: '#E5E7EB' }}
                    />
                    <input
                      type="date"
                      value={demoTaskDueDate}
                      onChange={(event) => setDemoTaskDueDate(event.target.value)}
                      className="w-full p-3 rounded"
                      style={{ backgroundColor: '#0B1220', border: '1px solid #1F2937', color: '#E5E7EB' }}
                    />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button data-onboarding="task-creation-submit" onClick={handleAddDemoTask} style={{ backgroundColor: '#6366F1', color: '#fff' }}>
                      Add Task
                    </Button>
                  </div>
                </div>

                {/* Mocked task list */}
                <div style={{ marginTop: 12, maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
                    <input
                      placeholder="Search tasks by keyword"
                      value={taskSearchKeyword}
                      onChange={(event) => setTaskSearchKeyword(event.target.value)}
                      className="w-full p-2 rounded"
                      style={{ backgroundColor: '#0B1220', border: '1px solid #1F2937', color: '#E5E7EB' }}
                    />
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm" style={{ color: '#9CA3AF' }}>Sort by date</span>
                      <select
                        value={dueDateSortOrder}
                        onChange={(event) => setDueDateSortOrder(event.target.value as 'asc' | 'desc')}
                        className="px-2 py-1 rounded"
                        style={{ backgroundColor: '#0B1220', border: '1px solid #1F2937', color: '#E5E7EB' }}
                      >
                        <option value="asc">Ascending</option>
                        <option value="desc">Descending</option>
                      </select>
                    </div>
                  </div>

                  {visibleTasks.map(task => (
                    <div key={task.id} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#091121', padding: 12, borderRadius: 8 }}>
                        <div>
                          <div style={{ color: '#E5E7EB' }}>{task.title}</div>
                          <div style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>{task.due}</div>
                        </div>
                        <div>
                          <Button size="sm" onClick={() => handleOpenTask(task)} style={{ backgroundColor: '#fff', color: '#0F172A' }}>
                            {openedTaskId === task.id ? 'Opened' : 'Open'}
                          </Button>
                        </div>
                      </div>

                      {openedTaskId === task.id && (
                        <div className="mt-2 p-3 rounded-lg" style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}>
                          <div className="text-sm font-medium mb-2" style={{ color: '#E5E7EB' }}>Edit Opened Task</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              value={openedTaskTitle}
                              onChange={(event) => setOpenedTaskTitle(event.target.value)}
                              placeholder="Task title"
                              className="w-full p-2 rounded"
                              style={{ backgroundColor: '#0B1220', border: '1px solid #1F2937', color: '#E5E7EB' }}
                            />
                            <input
                              type="date"
                              value={openedTaskDueDate}
                              onChange={(event) => setOpenedTaskDueDate(event.target.value)}
                              className="w-full p-2 rounded"
                              style={{ backgroundColor: '#0B1220', border: '1px solid #1F2937', color: '#E5E7EB' }}
                            />
                          </div>
                          <div className="mt-3 flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setOpenedTaskId(null)}
                              style={{ borderColor: '#374151', color: '#000000', backgroundColor: '#FFFFFF' }}
                            >
                              Close
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveOpenedTask}
                              style={{ backgroundColor: '#6366F1', color: '#fff' }}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card style={{ backgroundColor: '#0B1220', borderColor: '#111827', display: 'none' }}>
              <CardContent>
                <p style={{ color: '#9CA3AF', paddingTop: '20px', display: 'none' }}>Connect a task provider to see tasks here.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">

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
                    Only one task provider can be active at a time. Disconnect the current provider to switch.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider Cards (single-row responsive grid) */}
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
            {taskProviderInfo.map((providerInfo) => {
              const provider = state.tasks.find(t => t.id === providerInfo.id);
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
                    borderColor: isActive ? '#22D3EE' : '#374151',
                    border: isActive ? '2px solid' : '1px solid',
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
                            <span className="text-sm" style={{ color: '#9CA3AF' }}>Total Tasks</span>
                            <span className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{provider.taskCount || 0}</span>
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

                        <div className="flex gap-2 pt-2">
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => syncProvider('task', provider.id)}
                            style={{ borderColor: '#6366F1', color: '#6366F1' }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
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

          {/* Unified Task Schema Info */}
          {connectedCount > 0 && (
            <Card style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}>
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" style={{ color: '#6366F1' }} />
                  <div className="flex-1">
                    <p className="font-medium" style={{ color: '#E5E7EB' }}>
                      Unified Task Schema Active
                    </p>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      All connected task providers use a standardized internal schema. Tasks from {connectedCount} source{connectedCount > 1 ? 's' : ''} are displayed consistently on your Dashboard.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Task Mapping Settings */}
          <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
            <CardHeader>
              <CardTitle style={{ color: '#E5E7EB' }}>Task Mapping & Sync</CardTitle>
              <CardDescription style={{ color: '#9CA3AF' }}>
                Configure how task attributes are synchronized across providers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div data-onboarding="sync-direction" className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: '#E5E7EB' }}>Two-Way Sync</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                  </div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Deleting in SyncFlow also deletes in source app
                  </p>
                </div>

                <div data-onboarding="sync-subtasks" className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: '#E5E7EB' }}>Sync Subtasks</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                  </div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Include subtasks and dependencies
                  </p>
                </div>

                <div data-onboarding="ai-task-creation" className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span style={{ color: '#E5E7EB' }}>AI Task Creation</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                  </div>
                  <p className="text-sm" style={{ color: '#9CA3AF' }}>
                    Allow AI to create tasks from chat
                  </p>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Calendar-Task Integration */}
          <Card data-onboarding="integration-overview" style={{ backgroundColor: '#1E293B', borderColor: activeCalendarId && activeProviderId ? '#22D3EE' : '#374151' }}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Link className="w-6 h-6" style={{ color: '#22D3EE' }} />
                <div className="flex-1">
                  <CardTitle style={{ color: '#E5E7EB' }}>Calendar-Task Integration</CardTitle>
                  <CardDescription style={{ color: '#9CA3AF' }}>
                    {activeCalendarId && activeProviderId
                      ? 'Link your calendar and tasks for unified workflow management'
                      : 'Connect both a calendar and task provider to enable integration'}
                  </CardDescription>
                </div>
                {activeCalendarId && activeProviderId && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: '#22D3EE20', border: '1px solid #22D3EE' }}>
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22D3EE' }}></div>
                    <span className="text-xs font-medium" style={{ color: '#22D3EE' }}>Linked</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!activeCalendarId || !activeProviderId ? (
                <div className="p-6 text-center rounded-lg" style={{ backgroundColor: '#0F172A', borderColor: '#374151', border: '1px dashed' }}>
                  <CalendarIcon className="w-12 h-12 mx-auto mb-3" style={{ color: '#6B7280' }} />
                  <p className="font-medium mb-2" style={{ color: '#9CA3AF' }}>
                    Integration Unavailable
                  </p>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {!activeCalendarId && !activeProviderId
                      ? 'Please connect a calendar provider and a task provider to enable integration'
                      : !activeCalendarId
                      ? 'Please connect a calendar provider to enable integration'
                      : 'Please connect a task provider to enable integration'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    data-onboarding="integration-sync-tasks"
                    className="p-4 rounded-lg cursor-pointer transition-all hover:bg-opacity-80" 
                    style={{ backgroundColor: calendarTaskSync.syncTaskDueDatesToCalendar ? '#0F172A' : '#1F2937' }}
                    onClick={() => handleCalendarSyncToggle('syncTaskDueDatesToCalendar')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: '#E5E7EB' }}>Sync Tasks to Calendar</span>
                      <input 
                        type="checkbox" 
                        checked={calendarTaskSync.syncTaskDueDatesToCalendar} 
                        onChange={() => {}}
                        className="w-5 h-5 rounded" 
                        style={{ accentColor: '#22D3EE' }} 
                      />
                    </div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Show task due dates on calendar
                    </p>
                  </div>

                  <div 
                    data-onboarding="integration-auto-block"
                    className="p-4 rounded-lg cursor-pointer transition-all hover:bg-opacity-80" 
                    style={{ backgroundColor: calendarTaskSync.autoBlockTimeForTasks ? '#0F172A' : '#1F2937' }}
                    onClick={() => handleCalendarSyncToggle('autoBlockTimeForTasks')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: '#E5E7EB' }}>Auto-Block Time</span>
                      <input 
                        type="checkbox" 
                        checked={calendarTaskSync.autoBlockTimeForTasks} 
                        onChange={() => {}}
                        className="w-5 h-5 rounded" 
                        style={{ accentColor: '#22D3EE' }} 
                      />
                    </div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Automatically block calendar time for tasks
                    </p>
                  </div>

                  <div 
                    data-onboarding="integration-calendar-view"
                    className="p-4 rounded-lg cursor-pointer transition-all hover:bg-opacity-80" 
                    style={{ backgroundColor: calendarTaskSync.showTasksInCalendarView ? '#0F172A' : '#1F2937' }}
                    onClick={() => handleCalendarSyncToggle('showTasksInCalendarView')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: '#E5E7EB' }}>Show in Calendar View</span>
                      <input 
                        type="checkbox" 
                        checked={calendarTaskSync.showTasksInCalendarView} 
                        onChange={() => {}}
                        className="w-5 h-5 rounded" 
                        style={{ accentColor: '#22D3EE' }} 
                      />
                    </div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Display tasks in calendar interface
                    </p>
                  </div>

                  <div 
                    data-onboarding="integration-events-to-tasks"
                    className="p-4 rounded-lg cursor-pointer transition-all hover:bg-opacity-80" 
                    style={{ backgroundColor: calendarTaskSync.convertCalendarEventsToTasks ? '#0F172A' : '#1F2937' }}
                    onClick={() => handleCalendarSyncToggle('convertCalendarEventsToTasks')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: '#E5E7EB' }}>Events → Tasks</span>
                      <input 
                        type="checkbox" 
                        checked={calendarTaskSync.convertCalendarEventsToTasks} 
                        onChange={() => {}}
                        className="w-5 h-5 rounded" 
                        style={{ accentColor: '#22D3EE' }} 
                      />
                    </div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Convert calendar events to actionable tasks
                    </p>
                  </div>

                  <div 
                    data-onboarding="integration-sync-completed"
                    className="p-4 rounded-lg cursor-pointer transition-all hover:bg-opacity-80" 
                    style={{ backgroundColor: calendarTaskSync.syncCompletedStatus ? '#0F172A' : '#1F2937' }}
                    onClick={() => handleCalendarSyncToggle('syncCompletedStatus')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: '#E5E7EB' }}>Sync Completion Status</span>
                      <input 
                        type="checkbox" 
                        checked={calendarTaskSync.syncCompletedStatus} 
                        onChange={() => {}}
                        className="w-5 h-5 rounded" 
                        style={{ accentColor: '#22D3EE' }} 
                      />
                    </div>
                    <p className="text-sm" style={{ color: '#9CA3AF' }}>
                      Update calendar when tasks are completed
                    </p>
                  </div>

                  <div data-onboarding="integration-block-duration" className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span style={{ color: '#E5E7EB' }}>Task Block Duration</span>
                      <span className="text-sm font-medium" style={{ color: '#22D3EE' }}>{calendarTaskSync.taskBlockDuration} min</span>
                    </div>
                    <input 
                      type="range" 
                      min="15" 
                      max="240" 
                      step="15" 
                      value={calendarTaskSync.taskBlockDuration}
                      onChange={(e) => updateCalendarTaskSync({ ...calendarTaskSync, taskBlockDuration: parseInt(e.target.value) })}
                      className="w-full mt-2" 
                      style={{ accentColor: '#22D3EE' }}
                    />
                    <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>
                      Default time to block for task completion
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Connection Modal */}
      {selectedProvider && (
        <TaskConnectionModal
          open={!!selectedProvider}
          onClose={() => {
            setSelectedProvider(null);
            setIsConnectingTask(false);
          }}
          providerId={selectedProvider}
          providerName={taskProviderInfo.find(p => p.id === selectedProvider)?.name || ''}
          onConnect={(credentials) => handleConnectFromModal(selectedProvider, credentials)}
          isConnecting={isConnectingTask}
          connectError={taskConnectionError}
          initialAuthMethod={selectedProvider === 'todoist' ? 'apikey' : 'oauth'}
        />
      )}
    </div>
  );
}