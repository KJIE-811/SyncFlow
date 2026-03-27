import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Send, MessageSquare, Zap, Trash2, Brain, Sparkles, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useIntegrations } from '../contexts/IntegrationContext';
import { useAI } from '../contexts/AIContext';
import { useAuth } from '../contexts/AuthContext';
import { ChatConnectionModal } from '../components/ChatConnectionModal';
import {
  addChatCreatedTask,
  clearChatSummaryKeyPoints,
  clearCreatedKeyPointIds,
  clearChatCreatedTasks,
  clearChatSimulatorState,
  loadChatCreatedTasks,
  loadManualTasks,
  loadChatSimulatorState,
  saveChatSimulatorState,
} from '../services/chatSimulatorStorage';
import { toast } from 'sonner';

const chatProviderInfo = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    description: 'WhatsApp Business Cloud API',
    icon: '💬',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    description: 'Telegram Bot API',
    icon: '✈️',
  },
  {
    id: 'messenger',
    name: 'Messenger',
    description: 'Facebook Messenger Platform',
    icon: '💬',
  },
];

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  taskCreated?: boolean;
  source?: string;
  taskPageLink?: string;
}

interface SimulatedTask {
  id: number;
  title: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
}

interface SimulatedCalendarEvent {
  id: number;
  title: string;
  date: string;
  time: string;
}

const defaultSimulatedTasks: SimulatedTask[] = [
  {
    id: 1,
    title: 'HCI Figma - Wireframe (refer Motion APP)',
    priority: 'medium',
    dueDate: '25/02/2026',
  },
  {
    id: 2,
    title: 'Complete task 1.15, 1.16 and Task 3 for Neural Network Basics',
    priority: 'high',
    dueDate: '26/02/2026',
  },
  {
    id: 3,
    title: 'Neural Network Basic - Assignment 1',
    priority: 'high',
    dueDate: '27/02/2026',
  },
  {
    id: 4,
    title: 'Post-week retrospective',
    priority: 'low',
    dueDate: '02/03/2026',
  },
];

const commandOptions = [
  '/task Submit My Report /priority medium /due tomorrow',
  '/task Research SyncFlow /priority high /due 30/03/2026',
  '/calendar',
  '/events',
] as const;

const createInitialChatMessages = (): Message[] => [
  {
    id: 1,
    text: '🤖 AI Engine Active: I can detect tasks, meetings, and schedule changes from natural language. Try: "I need to review the reports by tomorrow" or "Can we meet at 3pm?"',
    sender: 'ai',
    timestamp: new Date().toLocaleTimeString(),
  },
];

const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

const getMalaysiaDateParts = (dayOffset = 0) => {
  const nowParts = new Intl.DateTimeFormat('en-US', {
    timeZone: MALAYSIA_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());

  const readPart = (type: 'year' | 'month' | 'day') =>
    Number(nowParts.find((part) => part.type === type)?.value ?? '0');

  const year = readPart('year');
  const month = readPart('month');
  const day = readPart('day');

  const malaysiaMidnightUtc = Date.UTC(year, month - 1, day);
  const targetUtc = malaysiaMidnightUtc + dayOffset * 24 * 60 * 60 * 1000;
  const targetDate = new Date(targetUtc);

  return {
    day: targetDate.getUTCDate(),
    month: targetDate.getUTCMonth() + 1,
    year: targetDate.getUTCFullYear(),
  };
};

const formatDateDMY = (day: number, month: number, year: number) => `${day}/${month}/${year}`;

const isValidDMYDate = (dateText: string) => {
  const match = dateText.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (day < 1 || day > 31 || month < 1 || month > 12) return false;

  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
};

const parseTaskCommand = (text: string) => {
  const titleMatch = text.match(/^\/task\s+([\s\S]*?)(?=\s\/(?:priority|due)\b|$)/i);
  const priorityMatch = text.match(/\/priority\s+(high|medium|low)\b/i);
  const dueMatch = text.match(/\/due\s+([\s\S]*?)(?=\s\/(?:priority|task)\b|$)/i);

  const rawTitle = titleMatch?.[1]?.trim() ?? '';
  const rawPriority = priorityMatch?.[1]?.toLowerCase() as 'high' | 'medium' | 'low' | undefined;
  const rawDue = dueMatch?.[1]?.trim() ?? '';

  return {
    title: rawTitle,
    priority: rawPriority || 'medium',
    due: rawDue,
  };
};

const resolveDueDateInput = (rawDue: string) => {
  const normalizedDue = rawDue.trim().toLowerCase();

  if (!normalizedDue || normalizedDue === 'today') {
    const today = getMalaysiaDateParts(0);
    return {
      dueDate: formatDateDMY(today.day, today.month, today.year),
      valid: true,
      error: '',
    };
  }

  if (normalizedDue === 'tomorrow') {
    const tomorrow = getMalaysiaDateParts(1);
    return {
      dueDate: formatDateDMY(tomorrow.day, tomorrow.month, tomorrow.year),
      valid: true,
      error: '',
    };
  }

  if (isValidDMYDate(rawDue)) {
    return {
      dueDate: rawDue,
      valid: true,
      error: '',
    };
  }

  return {
    dueDate: '',
    valid: false,
    error: 'Invalid due date format. Use `tomorrow`, `today`, or a specific date like 29/3/2026.',
  };
};

const buildAppHashRouteUrl = (route: string) => {
  const viteBase = (import.meta as any).env?.BASE_URL ?? '/SyncFlow/';
  const baseNoSlash = viteBase.endsWith('/') ? viteBase.slice(0, -1) : viteBase;
  return `${window.location.origin}${baseNoSlash}${route}`;
};

export function ChatIntegration() {
  type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';
  type OnboardingStepId =
    | 'select-provider'
    | 'scan-qr-connect'
    | 'review-required-variables'
    | 'choose-connection-method'
    | 'grant-permissions'
    | 'test-chat-to-task'
    | 'select-provider-to-test-area'
    | 'ai-engine-overview'
    | 'ai-auto-parse'
    | 'ai-smart-due-dates'
    | 'ai-priority-detection'
    | 'ai-active-channel-listen'
    | 'ai-conversation-context'
    | 'ai-target-provider'
    | 'ai-quick-commands';
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

  const { state, connectChat, disconnectChat, canConnect, getActiveProvider } = useIntegrations();
  const { addChatMessage, autoCreateTasks, toggleAutoCreateTasks, syncCommunicationFromHistory } = useAI();
  const { user } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<string | null>(null);
  const [simulatedTasks, setSimulatedTasks] = useState<SimulatedTask[]>(defaultSimulatedTasks);
  const [simulatedCalendarEvents] = useState<SimulatedCalendarEvent[]>([
    { id: 1, title: 'Daily Standup', date: '26/3/2026', time: '09:00 AM' },
    { id: 2, title: 'Client Call - Acme Corp', date: '26/3/2026', time: '11:00 AM' },
    { id: 3, title: 'Design Review', date: '26/3/2026', time: '02:00 PM' },
  ]);
  const [messages, setMessages] = useState<Message[]>(createInitialChatMessages);
  const [selectedCommand, setSelectedCommand] = useState<string>(commandOptions[0]);
  const [hasLoadedPersistedChatState, setHasLoadedPersistedChatState] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !state.chats.some((chat) => chat.connected));
  const [hasUserRequestedTutorial, setHasUserRequestedTutorial] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [onboardingProviderChoice, setOnboardingProviderChoice] = useState<string | null>(null);
  const [isConnectingChat, setIsConnectingChat] = useState(false);
  const [chatConnectionError, setChatConnectionError] = useState<string | null>(null);
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
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);

  const baseOnboardingSteps: OnboardingStep[] = [
    {
      id: 'select-provider',
      action: 'Select chat provider',
      instruction: 'Choose one provider and click Connect to continue.',
      microcopy: 'Pick the channel your team already uses most.',
      whyItMatters: 'This determines where SyncFlow receives chat messages from.',
      targetSelector: '[data-onboarding="select-provider"]',
      fallbackMessage: 'Provider actions are unavailable right now. Disconnect active provider or retry.',
    },
  ];

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    const providerName = onboardingProviderChoice
      ? chatProviderInfo.find((provider) => provider.id === onboardingProviderChoice)?.name || 'selected provider'
      : 'selected provider';

    const requiredVariableGuidance = onboardingProviderChoice === 'whatsapp'
      ? 'Manual fields (optional): Access Token and Phone Number ID.'
      : onboardingProviderChoice === 'telegram'
        ? 'Manual field (optional): Bot Token.'
        : onboardingProviderChoice === 'messenger'
          ? 'Required value: Page Access Token.'
          : 'Choose a provider to view its required fields.';

    const requiredFieldSelector = onboardingProviderChoice === 'whatsapp'
      ? '[data-onboarding="required-field-whatsapp"]'
      : onboardingProviderChoice === 'telegram'
        ? '[data-onboarding="required-field-telegram"]'
        : onboardingProviderChoice === 'messenger'
          ? '[data-onboarding="required-field-messenger"]'
          : '[data-onboarding="modal-credentials"]';

    const supportsQrConnect = onboardingProviderChoice === 'whatsapp' || onboardingProviderChoice === 'telegram';

    const postConnectionSteps: OnboardingStep[] = [
      {
        id: 'test-chat-to-task',
        action: 'Use Test to mock chat-to-task',
        instruction: `Click the Test button on ${providerName} to open a mock chat session and simulate chat-to-task conversion.`,
        microcopy: 'Use this to validate parsing and task extraction without real live messages.',
        whyItMatters: 'Confirms your connected channel can be used for end-to-end chat-to-task testing.',
        targetSelector: '[data-onboarding="chat-test-button"]',
        fallbackMessage: 'Test button appears after provider connection. Connect first, then continue.',
      },
      {
        id: 'select-provider-to-test-area',
        action: 'Connected Channel Chat Area',
        instruction: 'This chat simulator area will let you experience the chat to add, manage or delete your schedule and task.',
        microcopy: 'If no provider is active, click Test on a connected provider card to activate this panel.',
        whyItMatters: 'Clarifies where mock chat interactions happen before AI parsing settings are adjusted.',
        targetSelector: '[data-onboarding="chat-simulator"]',
        fallbackMessage: 'Chat simulator appears after at least one provider is connected.',
      },
      {
        id: 'ai-engine-overview',
        action: 'Review AI Engine',
        instruction: 'After connecting chat, configure AI Engine behavior for parsing and routing.',
        microcopy: 'This is where chat-to-task automation is controlled.',
        whyItMatters: 'Defines how messages become actionable tasks.',
        targetSelector: '[data-onboarding="ai-engine-panel"]',
      },
      {
        id: 'ai-auto-parse',
        action: 'Configure AI parsing',
        instruction: 'Auto-parse scans incoming chat for tasks, meetings, and schedule changes.',
        microcopy: 'Keep enabled for automated extraction from conversations.',
        whyItMatters: 'Controls how much work is automated from chat input.',
        targetSelector: '[data-onboarding="ai-auto-parse"]',
      },
      {
        id: 'ai-smart-due-dates',
        action: 'Set Smart Due Dates',
        instruction: 'Smart Due Dates extracts date language like "tomorrow" or "next Friday" from messages.',
        microcopy: 'Leave this enabled if teammates often mention deadlines casually.',
        whyItMatters: 'Improves due-date accuracy for AI-created tasks.',
        targetSelector: '[data-onboarding="ai-smart-due-dates"]',
      },
      {
        id: 'ai-priority-detection',
        action: 'Tune Priority Detection',
        instruction: 'Priority Detection maps urgency terms to task priority levels automatically.',
        microcopy: 'Helpful for preserving urgency from customer or team chats.',
        whyItMatters: 'Ensures high-impact items are not buried in your task list.',
        targetSelector: '[data-onboarding="ai-priority-detection"]',
      },
      {
        id: 'ai-active-channel-listen',
        action: 'Confirm Active Channel Listen',
        instruction: 'Active Channel Listen keeps AI monitoring your connected chat channel in real time.',
        microcopy: 'Disable only when you want manual-only parsing.',
        whyItMatters: 'Controls whether incoming messages are continuously analyzed.',
        targetSelector: '[data-onboarding="ai-active-channel-listen"]',
      },
      {
        id: 'ai-conversation-context',
        action: 'Adjust Conversation Context',
        instruction: 'Conversation Context lets AI use recent message history for better interpretation.',
        microcopy: 'Use this to reduce false positives from short, ambiguous messages.',
        whyItMatters: 'Produces better intent detection and cleaner task extraction.',
        targetSelector: '[data-onboarding="ai-conversation-context"]',
      },
      {
        id: 'ai-target-provider',
        action: 'Choose target task provider',
        instruction: 'Set which task provider receives AI-created tasks from chat.',
        microcopy: 'Ensure the target matches your active task workspace.',
        whyItMatters: 'Prevents tasks landing in the wrong destination.',
        targetSelector: '[data-onboarding="ai-target-provider"]',
      },
      {
        id: 'ai-quick-commands',
        action: 'Learn quick commands',
        instruction: 'Use slash commands to create and enrich tasks directly from chat messages.',
        microcopy: 'Great fallback when a message is too short for automatic intent parsing.',
        whyItMatters: 'Gives users a predictable manual path alongside automation.',
        targetSelector: '[data-onboarding="ai-quick-commands"]',
      },
    ];

    return [
      ...baseOnboardingSteps,
      ...(supportsQrConnect
        ? [
            {
              id: 'scan-qr-connect' as const,
              action: `Scan ${providerName} QR code`,
              instruction: `Use the QR section to connect ${providerName} by scan, or click the mock scanned button to simulate completion.`,
              microcopy: 'Use this quick path for demo flows without filling every credential field manually.',
              whyItMatters: 'Covers QR-based connection behavior during onboarding.',
              targetSelector: '[data-onboarding="qr-connect-panel"]',
              requiresModal: true,
              fallbackMessage: 'QR connect panel is not visible. Reopen the provider modal and retry.',
            },
          ]
        : []),
      {
        id: 'review-required-variables',
        action: `Review ${providerName} manual credentials`,
        instruction: `Manual credential connection is available for ${providerName}. ${requiredVariableGuidance}`,
        microcopy: supportsQrConnect
          ? 'You can still proceed with QR-only connection if preferred.'
          : 'Only required fields are needed to enable Connect.',
        whyItMatters: 'Explains the manual fallback path if QR scan is unavailable.',
        targetSelector: requiredFieldSelector,
        requiresModal: true,
        fallbackMessage: 'Required fields are not visible yet. Reopen the provider modal and retry.',
      },
      ...(supportsQrConnect
        ? [
            {
              id: 'choose-connection-method' as const,
              action: `Choose ${providerName} connection method`,
              instruction: 'Choose either QR scan or manual credentials. Manual entry is optional.',
              microcopy: 'Use the option that matches your setup preference.',
              whyItMatters: 'Ensures users understand both supported connection paths.',
              targetSelector: '[data-onboarding="connect-choice"]',
              requiresModal: true,
              fallbackMessage: 'Connection method choices are not visible. Reopen the provider modal and retry.',
            },
          ]
        : []),
      {
        id: 'grant-permissions',
        action: `Connect ${providerName}`,
        instruction: supportsQrConnect
          ? `Connect ${providerName} using your selected method (QR scan or manual credentials).`
          : `Complete ${providerName} credential setup and connect the channel.`,
        microcopy: supportsQrConnect
          ? 'Either method continues the tutorial after successful connection.'
          : 'Verify required tokens before connecting.',
        whyItMatters: 'Finalizes secure message ingestion for the selected channel.',
        targetSelector: supportsQrConnect ? '[data-onboarding="connect-choice"]' : '[data-onboarding="modal-authorize"]',
        requiresModal: true,
        fallbackMessage: 'Connect action is unavailable. Reopen the provider modal and retry.',
      },
      ...postConnectionSteps,
    ];
  }, [onboardingProviderChoice, state.chats]);

  // If a chat provider is already connected, remove provider selection/connection steps
  const onboardingStepsFiltered = useMemo(() => {
    const hasConnectedChat = state.chats.some((c) => c.connected);
    if (!hasConnectedChat) return onboardingSteps;
    return onboardingSteps.filter((s) => s.id !== 'select-provider' && s.id !== 'review-required-variables' && s.id !== 'grant-permissions');
  }, [onboardingSteps, state.chats]);

  // Keep current step consistent when the filtered steps list changes (avoid skipping)
  const lastOnboardingStepIdRef = useRef<string | null>(null);
  const pendingPostConnectStepRef = useRef<string | null>(null);

  // remember the current step id whenever the index changes
  useEffect(() => {
    lastOnboardingStepIdRef.current = onboardingStepsFiltered[onboardingStepIndex]?.id ?? null;
  }, [onboardingStepIndex]);

  // when the filtered steps list changes, remap to the previous step id if possible
  useEffect(() => {
    // If a pending post-connect target exists, prefer that (it was set by the connect handler)
    const pending = pendingPostConnectStepRef.current;
    if (pending) {
      const targetIndex = onboardingStepsFiltered.findIndex((s) => s.id === pending);
      if (targetIndex !== -1) {
        setOnboardingStepIndex(targetIndex);
        pendingPostConnectStepRef.current = null;
        return;
      }
      // otherwise fallthrough to remapping logic
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

  const connectedProviders = state.chats.filter(c => c.connected);
  const connectedCount = connectedProviders.length;
  const activeProviderId = getActiveProvider('chat');
  const currentOnboardingStep = onboardingStepsFiltered[onboardingStepIndex];
  const isProviderSelectionStep = currentOnboardingStep?.id === 'select-provider';

  const getStepIndexById = (stepId: OnboardingStepId) => onboardingStepsFiltered.findIndex((step) => step.id === stepId);

  const isOnboardingStepComplete = (stepId: OnboardingStepId) => {
    switch (stepId) {
      case 'select-provider':
        return onboardingProviderChoice !== null;
      case 'review-required-variables':
        return onboardingProviderChoice !== null;
      case 'scan-qr-connect':
        return onboardingProviderChoice === 'whatsapp' || onboardingProviderChoice === 'telegram';
      case 'choose-connection-method':
        return onboardingProviderChoice === 'whatsapp' || onboardingProviderChoice === 'telegram';
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
    ? chatProviderInfo.find((provider) => provider.id === onboardingProviderChoice)?.name || 'selected provider'
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
        ? state.chats.find((provider) => provider.id === onboardingProviderChoice)
        : null;
      const connectableProvider = routedProvider && canConnect('chat', routedProvider.id).allowed
        ? routedProvider
        : state.chats.find((provider) => canConnect('chat', provider.id).allowed);
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
    const check = canConnect('chat', providerId);
    if (!check.allowed) {
      const activeProviderName = chatProviderInfo.find((provider) => provider.id === check.activeProvider)?.name;
      toast.error('Only One Chat Provider Allowed', {
        description: `Please disconnect ${activeProviderName} before connecting to a new provider.`,
        duration: 4000,
      });
      return;
    }

    setChatConnectionError(null);
    setConnectionStepState({ permissionsGranted: false });
    setOnboardingProviderChoice(providerId);
    setSelectedProvider(providerId);

    if (showOnboarding && currentOnboardingStep?.id === 'select-provider') {
      const finalStepIndex = getStepIndexById('review-required-variables');
      if (finalStepIndex !== -1) setOnboardingStepIndex(finalStepIndex);

      const target = await waitForElement('[data-onboarding="modal-credentials"]', 2600);
      if (target) updateSpotlightForStep();
    }
  };

  const handleConnectFromModal = (providerId: string, credentials: any) => {
    setChatConnectionError(null);
    setIsConnectingChat(true);

    const loadingToastId = toast.loading('Connecting chat provider...', {
      description: 'Validating credentials and channel webhook settings.',
    });

    window.setTimeout(() => {
      try {
        if (providerId === 'whatsapp' && (!credentials.apiToken || !credentials.phoneNumberId)) {
          throw new Error('WhatsApp requires Access Token and Phone Number ID.');
        }
        if (providerId === 'telegram' && !credentials.botToken) {
          throw new Error('Telegram requires a Bot Token.');
        }
        if (providerId === 'messenger' && !credentials.apiToken) {
          throw new Error('Messenger requires a Page Access Token.');
        }

        connectChat(providerId, credentials);
        setConnectionStepState({ permissionsGranted: true });
        setSelectedProvider(null);
        toast.dismiss(loadingToastId);
        toast.success('Chat Provider Connected', {
          description: `${chatProviderInfo.find((provider) => provider.id === providerId)?.name} is now linked to SyncFlow.`,
          duration: 3500,
        });

        if (showOnboarding) {
          // Defer selecting the next onboarding step until the filtered steps update
          pendingPostConnectStepRef.current = 'test-chat-to-task';
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed. Please try again.';
        setChatConnectionError(errorMessage);
        toast.dismiss(loadingToastId);
        toast.error('Connection Failed', {
          description: errorMessage,
          duration: 4500,
        });
      } finally {
        setIsConnectingChat(false);
      }
    }, 900);
  };

  const goToNextOnboardingStep = () => {
    if (!currentOnboardingStep || !canAdvanceOnboardingStep) return;
    const nextIndex = onboardingStepIndex + 1;
      if (nextIndex >= onboardingStepsFiltered.length) {
      setShowOnboarding(false);
      setHasUserRequestedTutorial(false);
      setOnboardingProviderChoice(null);
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
    setChatConnectionError(null);
  };

  const handleActivateProviderTest = (providerId: string) => {
    setActiveChat(providerId);

    if (showOnboarding && currentOnboardingStep?.id === 'test-chat-to-task') {
      const nextIndex = onboardingStepIndex + 1;
        if (nextIndex < onboardingStepsFiltered.length) {
        setOnboardingStepIndex(nextIndex);
      }
    }
  };

  const handleDisconnect = (providerId: string) => {
    if (confirm(`Disconnect ${chatProviderInfo.find(p => p.id === providerId)?.name}?`)) {
      disconnectChat(providerId);
      clearChatSimulatorState(user);
      clearChatCreatedTasks(user);
      clearCreatedKeyPointIds(user);
      clearChatSummaryKeyPoints(user);
      setMessages(createInitialChatMessages());
      syncCommunicationFromHistory([]);
      setSimulatedTasks(defaultSimulatedTasks);
      toast.success('Chat Provider Disconnected', {
        description: 'You can now connect a different chat provider.',
        duration: 3000,
      });
      if (activeChat === providerId) {
        setActiveChat(null);
      }
    }
  };

  useEffect(() => {
    setHasLoadedPersistedChatState(false);
    const persisted = loadChatSimulatorState(user);

    if (!persisted) {
      setActiveChat(null);
      setMessages(createInitialChatMessages());
      setSimulatedTasks(defaultSimulatedTasks);
      setHasLoadedPersistedChatState(true);
      return;
    }

    setActiveChat(persisted.activeChat);
    setMessages(persisted.messages.length > 0 ? persisted.messages : createInitialChatMessages());
    setSimulatedTasks(persisted.simulatedTasks.length > 0 ? persisted.simulatedTasks : defaultSimulatedTasks);
    setHasLoadedPersistedChatState(true);
  }, [user?.id, user?.email]);

  useEffect(() => {
    if (!hasLoadedPersistedChatState) return;

    saveChatSimulatorState(user, {
      activeChat,
      messages,
      simulatedTasks,
    });

    syncCommunicationFromHistory(messages);
  }, [activeChat, messages, simulatedTasks, hasLoadedPersistedChatState, user?.id, user?.email]);

  useEffect(() => {
    const hasConnectedChat = state.chats.some((chat) => chat.connected);
    if (hasConnectedChat && !hasUserRequestedTutorial && onboardingProviderChoice === null) {
      setShowOnboarding(false);
    }
  }, [state.chats, hasUserRequestedTutorial, onboardingProviderChoice]);

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
    state.chats,
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

  useEffect(() => {
    if (!activeChat || !chatMessagesContainerRef.current) return;
    const container = chatMessagesContainerRef.current;
    window.requestAnimationFrame(() => {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    });
  }, [messages, activeChat]);

  const handleSendMessage = () => {
    if (!selectedCommand.trim() || !activeChat) return;

    const currentInput = selectedCommand.trim();

    const newMessage: Message = {
      id: messages.length + 1,
      text: currentInput,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString(),
      source: activeChat,
    };

    setMessages([...messages, newMessage]);

    if (currentInput.toLowerCase().startsWith('/task')) {
      const parsed = parseTaskCommand(currentInput);
      if (!parsed.title) {
        const aiResponse: Message = {
          id: messages.length + 2,
          text:
            'Please provide a task title.\n\n' +
            'Example:\n' +
            '/task Testing task /priority medium /due tomorrow',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      const resolvedDue = resolveDueDateInput(parsed.due);
      if (!resolvedDue.valid) {
        const aiResponse: Message = {
          id: messages.length + 2,
          text: resolvedDue.error,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      const activeTaskProvider = state.tasks.find((task) => task.connected);
      if (!activeTaskProvider) {
        const aiResponse: Message = {
          id: messages.length + 2,
          text:
            '❌ Unable to create task from quick command.\n\n' +
            'No task provider is connected. Please connect one in Task Integration first.',
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
        };
        setMessages((prev) => [...prev, aiResponse]);
        return;
      }

      const createdTask: SimulatedTask = {
        id: Date.now(),
        title: parsed.title,
        priority: parsed.priority,
        dueDate: resolvedDue.dueDate,
      };

      const classifiedTaskTitle = `${createdTask.title} (Created From Chat)`;

      addChatCreatedTask(user, {
        id: `chat-task-${createdTask.id}`,
        title: classifiedTaskTitle,
        due: createdTask.dueDate,
        providerId: activeTaskProvider.id,
        sourceChatProviderId: activeChat,
        createdAt: new Date().toISOString(),
      });

      setSimulatedTasks((prev) => [createdTask, ...prev]);

      const aiResponse: Message = {
        id: messages.length + 2,
        text:
          '✅ Task created from quick command\n\n' +
          `📝 Title: ${createdTask.title}\n` +
          `📌 Priority: ${createdTask.priority}\n` +
          `📅 Due: ${createdTask.dueDate} (MYT parsing)`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
        taskCreated: true,
        taskPageLink: buildAppHashRouteUrl('/integration/tasks'),
      };
      setMessages((prev) => [...prev, aiResponse]);
      return;
    }

    if (currentInput.toLowerCase().startsWith('/events')) {
      const manualTasks = loadManualTasks(user);
      const chatCreatedTasks = loadChatCreatedTasks(user);
      const mergedTasks = [
        ...simulatedTasks.map((task) => ({ title: task.title, dueDate: task.dueDate })),
        ...manualTasks.map((task) => ({ title: task.title, dueDate: task.due })),
        ...chatCreatedTasks.map((task) => ({ title: task.title, dueDate: task.due })),
      ];

      const dedupedTasks = mergedTasks.filter((task, index, arr) => {
        const key = `${task.title}::${task.dueDate}`;
        return arr.findIndex((candidate) => `${candidate.title}::${candidate.dueDate}` === key) === index;
      });

      const aiResponse: Message = {
        id: messages.length + 2,
        text:
          dedupedTasks.length > 0
            ? `🗂 Retrieved ${dedupedTasks.length} task(s) from task list:\n\n${dedupedTasks
                .slice(0, 8)
              .map((task, index) => `${index + 1}. ${task.title} • ${task.dueDate}`)
                .join('\n')}`
            : '🗂 Task list is empty.\n\nTry:\n/task Testing task /priority medium /due tomorrow',
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      return;
    }

    if (currentInput.toLowerCase().startsWith('/calendar')) {
      const aiResponse: Message = {
        id: messages.length + 2,
        text:
          `📅 Retrieved ${simulatedCalendarEvents.length} calendar event(s):\n\n${simulatedCalendarEvents
            .map((event, index) => `${index + 1}. ${event.title} • ${event.date} ${event.time}`)
            .join('\n')}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      return;
    }

    // Use AI Engine for intent detection
    const intent = addChatMessage({
      text: currentInput,
      sender: 'You',
      timestamp: new Date().toISOString(),
      source: activeChat,
    });

    // Generate AI Response based on detected intent
    setTimeout(() => {
      let aiResponse: Message;
      const activeTaskProvider = state.tasks.find(t => t.connected);
      
      if (intent.type === 'task') {
        const taskTitle = intent.extractedData.title || currentInput;
        const detectedPriority =
          (intent.extractedData.priority as 'high' | 'medium' | 'low' | undefined) || 'medium';
        const detectedDue = resolveDueDateInput(intent.extractedData.dueDate || 'today');
        const createdFromDetection: SimulatedTask = {
          id: Date.now() + 1,
          title: taskTitle,
          priority: detectedPriority,
          dueDate: detectedDue.valid ? detectedDue.dueDate : resolveDueDateInput('today').dueDate,
        };
        setSimulatedTasks((prev) => [createdFromDetection, ...prev]);

        aiResponse = {
          id: messages.length + 2,
          text: `✅ **Task Detected** (${Math.round(intent.confidence * 100)}% confidence)\n\n` +
                `📝 Title: "${taskTitle}"\n` +
                `📅 Due: ${createdFromDetection.dueDate}\n` +
                `🗂 Added to task events for /events\n` +
                `\n${autoCreateTasks && activeTaskProvider 
                  ? `✓ Auto-created in ${activeTaskProvider.name}`
                  : '💡 Enable auto-create in AI settings'
                }`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
          taskCreated: autoCreateTasks && !!activeTaskProvider,
        };
      } else if (intent.type === 'meeting') {
        aiResponse = {
          id: messages.length + 2,
          text: `📅 **Meeting Request Detected**\n\n` +
                `Time: ${intent.extractedData.time}\n` +
                `\n💡 Would you like to add this to your calendar?`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
        };
      } else if (intent.type === 'delay' || intent.type === 'reschedule' || intent.type === 'cancel') {
        aiResponse = {
          id: messages.length + 2,
          text: `⚠️ **Schedule Change Detected**\n\n` +
                `Type: ${intent.type}\n` +
                `${intent.extractedData.time ? `New time: ${intent.extractedData.time}\n` : ''}` +
                `\n🔄 Triggering Ripple Effect to rebalance your schedule...`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
        };
      } else {
        aiResponse = {
          id: messages.length + 2,
          text: `💬 Message received. I'm monitoring for:\n` +
                `• Task commitments ("I'll do...", "I need to...")\n` +
                `• Meeting requests ("Can we meet...")\n` +
                `• Schedule changes ("Delayed", "Rescheduled")\n\n` +
                `Or use /task for explicit task creation.`,
          sender: 'ai',
          timestamp: new Date().toLocaleTimeString(),
        };
      }

      setMessages((prev) => [...prev, aiResponse]);
    }, 800);

  };

  return (
    <div className="p-8 space-y-6" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Chat Integration</h1>
          <p className="mt-2" style={{ color: '#9CA3AF' }}>
            Connect messaging platforms for AI-powered task creation • {connectedCount} connected
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
              <span className="text-sm font-medium" style={{ color: '#22D3EE' }}>Multi-Channel Active</span>
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
              key={`chat-spotlight-${index}`}
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

      {/* Provider Cards */}
      <div
        data-onboarding="chat-provider-grid"
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
        {chatProviderInfo.map((providerInfo) => {
          const provider = state.chats.find(c => c.id === providerInfo.id);
          if (!provider) return null;

          return (
            <Card
              key={provider.id}
              data-onboarding="select-provider"
              data-onboarding-provider={provider.id}
              className={`relative transition-all ${
                provider.connected ? 'ring-2 shadow-xl' : ''
              }`}
              style={{
                backgroundColor: '#1E293B',
                borderColor: provider.connected ? '#22D3EE' : '#374151',
                boxShadow: provider.connected ? '0 0 30px rgba(34, 211, 238, 0.3)' : 'none',
              }}
            >
              {provider.connected && (
                <div className="absolute top-4 right-4">
                  <CheckCircle2 className="w-6 h-6" style={{ color: '#22D3EE' }} />
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
                {provider.connected ? (
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
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>
                          {provider.id === 'whatsapp' ? 'Phone Number ID' : provider.id === 'telegram' ? 'Bot Token' : 'Page Token'}
                        </span>
                        <span className="text-sm font-mono" style={{ color: '#E5E7EB' }}>
                          {provider.id === 'whatsapp' 
                            ? provider.phoneNumberId?.substring(0, 8) + '...' 
                            : provider.botToken?.substring(0, 8) + '...' || provider.apiToken?.substring(0, 8) + '...'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: '#9CA3AF' }}>Tasks Created</span>
                        <span className="text-sm font-medium" style={{ color: '#E5E7EB' }}>{provider.messagesProcessed || 0}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        data-onboarding="chat-test-button"
                        className="flex-1"
                        variant="outline"
                        onClick={() => handleActivateProviderTest(provider.id)}
                        style={{ 
                          borderColor: activeChat === provider.id ? '#22D3EE' : '#6366F1', 
                          color: activeChat === provider.id ? '#22D3EE' : '#6366F1',
                          backgroundColor: activeChat === provider.id ? '#22D3EE10' : 'transparent'
                        }}
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {activeChat === provider.id ? 'Active' : 'Test'}
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
                    className="w-full"
                    onClick={() => handleConnect(provider.id)}
                    style={{ backgroundColor: '#6366F1', color: '#fff' }}
                  >
                    Configure {providerInfo.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Provider-Agnostic Chat Test Interface */}
      {connectedCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card data-onboarding="chat-simulator" className="lg:col-span-2" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" style={{ color: '#6366F1' }} />
                  <CardTitle style={{ color: '#E5E7EB' }}>
                    {activeChat 
                      ? `${chatProviderInfo.find(p => p.id === activeChat)?.name} Chat Simulator`
                      : 'Select a Provider to Test'}
                  </CardTitle>
                </div>
                <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#22D3EE20', color: '#22D3EE' }}>
                  Provider-Agnostic AI
                </span>
              </div>
              <CardDescription style={{ color: '#9CA3AF' }}>
                Chat-to-task conversion works across all connected platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeChat ? (
                <>
                  {/* Messages Area */}
                  <div ref={chatMessagesContainerRef} className="h-96 overflow-y-auto p-4 rounded-lg mb-4 space-y-3" style={{ backgroundColor: '#0F172A' }}>
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-md px-4 py-2 rounded-lg ${
                            message.taskCreated ? 'border-2' : ''
                          }`}
                          style={{
                            backgroundColor: message.sender === 'user' ? '#6366F1' : '#1E293B',
                            color: '#E5E7EB',
                            borderColor: message.taskCreated ? '#22D3EE' : 'transparent',
                          }}
                        >
                          <p className="whitespace-pre-line">{message.text}</p>
                          {message.taskPageLink && (
                            <a
                              href={message.taskPageLink}
                              className="inline-block mt-2 text-xs underline"
                              style={{ color: '#22D3EE' }}
                            >
                              View Task Details
                            </a>
                          )}
                          <p className="text-xs mt-1 opacity-70">{message.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input Area */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <select
                        value={selectedCommand}
                        onChange={(event) => setSelectedCommand(event.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB', border: '1px solid' }}
                      >
                        {commandOptions.map((command) => (
                          <option key={command} value={command}>
                            {command}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button onClick={handleSendMessage} style={{ backgroundColor: '#6366F1', color: '#fff' }}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="h-96 flex items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
                  <p style={{ color: '#9CA3AF' }}>Click "Test" on any connected provider to simulate chat</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Settings Panel */}
          <Card data-onboarding="ai-engine-panel" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
            <CardHeader>
              <CardTitle style={{ color: '#E5E7EB' }}>AI Engine</CardTitle>
              <CardDescription style={{ color: '#9CA3AF' }}>
                Connected channel chat-to-task conversion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-onboarding="ai-auto-parse" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Auto-Parse Tasks</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                </div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Detect task commands from connected channel
                </p>
              </div>

              <div data-onboarding="ai-smart-due-dates" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Smart Due Dates</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                </div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Extract dates from message text
                </p>
              </div>

              <div data-onboarding="ai-priority-detection" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Priority Detection</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                </div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Analyze urgency keywords
                </p>
              </div>

              <div data-onboarding="ai-active-channel-listen" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Active Channel Listen</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                </div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Monitor your connected channel
                </p>
              </div>

              <div data-onboarding="ai-conversation-context" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Conversation Context</span>
                  <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
                </div>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Track message history for better understanding
                </p>
              </div>

              <div data-onboarding="ai-target-provider" className="pt-4 space-y-2">
                <h4 className="text-sm font-medium" style={{ color: '#E5E7EB' }}>Target Task Provider</h4>
                <select 
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB', border: '1px solid' }}
                >
                  {state.tasks.filter(t => t.connected).length > 0 ? (
                    state.tasks.filter(t => t.connected).map(task => (
                      <option key={task.id} value={task.id}>{task.name}</option>
                    ))
                  ) : (
                    <option>No task providers connected</option>
                  )}
                </select>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Where AI-created tasks will be sent
                </p>
              </div>

              <div data-onboarding="ai-quick-commands" className="pt-4 space-y-2">
                <h4 className="text-sm font-medium" style={{ color: '#E5E7EB' }}>Quick Commands</h4>
                <div className="space-y-1 text-xs" style={{ color: '#9CA3AF' }}>
                  <p><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#0F172A' }}>/task [title] /priority [high|medium|low] /due [tomorrow|dd/mm/yyyy]</code></p>
                  <p><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#0F172A' }}>/calendar</code> - Retrieve calendar events</p>
                  <p><code className="px-1 py-0.5 rounded" style={{ backgroundColor: '#0F172A' }}>/events</code> - Retrieve tasks from task list</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Connection Modal */}
      {selectedProvider && (
        <ChatConnectionModal
          open={!!selectedProvider}
          onClose={() => {
            setSelectedProvider(null);
            setIsConnectingChat(false);
          }}
          providerId={selectedProvider}
          providerName={chatProviderInfo.find(p => p.id === selectedProvider)?.name || ''}
          onConnect={(credentials) => handleConnectFromModal(selectedProvider, credentials)}
          isConnecting={isConnectingChat}
          connectError={chatConnectionError}
        />
      )}
    </div>
  );
}