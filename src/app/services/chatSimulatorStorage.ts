export interface StorageUserRef {
  id: string;
  email: string;
}

export interface PersistedChatMessage {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
  taskCreated?: boolean;
  source?: string;
}

export interface PersistedSimulatedTask {
  id: number;
  title: string;
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
}

export interface PersistedChatSimulatorState {
  activeChat: string | null;
  messages: PersistedChatMessage[];
  simulatedTasks: PersistedSimulatedTask[];
}

export interface ChatCreatedTask {
  id: string;
  title: string;
  due: string;
  providerId: string;
  sourceChatProviderId: string;
  createdAt: string;
}

const CHAT_SIM_STATE_PREFIX = 'syncflow_chat_sim_state';
const CHAT_CREATED_TASKS_PREFIX = 'syncflow_chat_created_tasks';
const CHAT_KEYPOINT_CREATED_PREFIX = 'syncflow_chat_keypoint_created';
const CHAT_SUMMARY_KEYPOINTS_PREFIX = 'syncflow_chat_summary_keypoints';
const MANUAL_TASKS_PREFIX = 'syncflow_manual_tasks';

const getScope = (user: StorageUserRef | null | undefined) => {
  if (!user) return 'guest';
  return `${user.id}:${encodeURIComponent(user.email.toLowerCase())}`;
};

const getChatStateKey = (user: StorageUserRef | null | undefined) =>
  `${CHAT_SIM_STATE_PREFIX}:${getScope(user)}`;

const getChatCreatedTasksKey = (user: StorageUserRef | null | undefined) =>
  `${CHAT_CREATED_TASKS_PREFIX}:${getScope(user)}`;

const getChatKeypointCreatedKey = (user: StorageUserRef | null | undefined) =>
  `${CHAT_KEYPOINT_CREATED_PREFIX}:${getScope(user)}`;

const getChatSummaryKeyPointsKey = (user: StorageUserRef | null | undefined) =>
  `${CHAT_SUMMARY_KEYPOINTS_PREFIX}:${getScope(user)}`;

const getManualTasksKey = (user: StorageUserRef | null | undefined) =>
  `${MANUAL_TASKS_PREFIX}:${getScope(user)}`;

export const loadChatSimulatorState = (user: StorageUserRef | null | undefined): PersistedChatSimulatorState | null => {
  try {
    const raw = localStorage.getItem(getChatStateKey(user));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedChatSimulatorState;
    if (!parsed || !Array.isArray(parsed.messages) || !Array.isArray(parsed.simulatedTasks)) return null;

    return {
      activeChat: parsed.activeChat || null,
      messages: parsed.messages,
      simulatedTasks: parsed.simulatedTasks,
    };
  } catch {
    return null;
  }
};

export const saveChatSimulatorState = (
  user: StorageUserRef | null | undefined,
  state: PersistedChatSimulatorState,
) => {
  localStorage.setItem(getChatStateKey(user), JSON.stringify(state));
};

export const clearChatSimulatorState = (user: StorageUserRef | null | undefined) => {
  localStorage.removeItem(getChatStateKey(user));
};

export const loadChatCreatedTasks = (user: StorageUserRef | null | undefined): ChatCreatedTask[] => {
  try {
    const raw = localStorage.getItem(getChatCreatedTasksKey(user));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ChatCreatedTask[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
};

export const addChatCreatedTask = (user: StorageUserRef | null | undefined, task: ChatCreatedTask) => {
  const existing = loadChatCreatedTasks(user);
  localStorage.setItem(getChatCreatedTasksKey(user), JSON.stringify([task, ...existing]));
};

export const clearChatCreatedTasks = (user: StorageUserRef | null | undefined) => {
  localStorage.removeItem(getChatCreatedTasksKey(user));
};

export const loadCreatedKeyPointIds = (user: StorageUserRef | null | undefined): number[] => {
  try {
    const raw = localStorage.getItem(getChatKeypointCreatedKey(user));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value) => typeof value === 'number');
  } catch {
    return [];
  }
};

export const addCreatedKeyPointId = (user: StorageUserRef | null | undefined, keyPointId: number) => {
  const existing = loadCreatedKeyPointIds(user);
  if (existing.includes(keyPointId)) return;
  localStorage.setItem(getChatKeypointCreatedKey(user), JSON.stringify([keyPointId, ...existing]));
};

export const clearCreatedKeyPointIds = (user: StorageUserRef | null | undefined) => {
  localStorage.removeItem(getChatKeypointCreatedKey(user));
};

export interface PersistedSummaryKeyPoint {
  id: number;
  text: string;
  priority: 'high' | 'medium' | 'low';
  source: string;
  timestamp: string;
  isTask: boolean;
}

export const loadChatSummaryKeyPoints = (user: StorageUserRef | null | undefined): PersistedSummaryKeyPoint[] => {
  try {
    const raw = localStorage.getItem(getChatSummaryKeyPointsKey(user));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PersistedSummaryKeyPoint[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((point) =>
      typeof point?.id === 'number' &&
      typeof point?.text === 'string' &&
      typeof point?.priority === 'string' &&
      typeof point?.source === 'string' &&
      typeof point?.timestamp === 'string' &&
      typeof point?.isTask === 'boolean'
    );
  } catch {
    return [];
  }
};

export const saveChatSummaryKeyPoints = (
  user: StorageUserRef | null | undefined,
  keyPoints: PersistedSummaryKeyPoint[],
) => {
  localStorage.setItem(getChatSummaryKeyPointsKey(user), JSON.stringify(keyPoints));
};

export const clearChatSummaryKeyPoints = (user: StorageUserRef | null | undefined) => {
  localStorage.removeItem(getChatSummaryKeyPointsKey(user));
};

export interface PersistedManualTask {
  id: string;
  title: string;
  due: string;
  providerId: string;
}

export const loadManualTasks = (user: StorageUserRef | null | undefined): PersistedManualTask[] => {
  try {
    const raw = localStorage.getItem(getManualTasksKey(user));
    if (!raw) return [];

    const parsed = JSON.parse(raw) as PersistedManualTask[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((task) =>
      typeof task?.id === 'string' &&
      typeof task?.title === 'string' &&
      typeof task?.due === 'string' &&
      typeof task?.providerId === 'string'
    );
  } catch {
    return [];
  }
};

export const saveManualTasks = (
  user: StorageUserRef | null | undefined,
  tasks: PersistedManualTask[],
) => {
  localStorage.setItem(getManualTasksKey(user), JSON.stringify(tasks));
};
