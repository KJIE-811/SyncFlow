import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, getUserByEmail, createUser, updateUser } from './database';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  isAdmin?: boolean;
}

export interface ResetPasswordData {
  email: string;
  newPassword: string;
}

const MASTER_EMAIL = 'syncflow@gmail.com';
const MASTER_PASSWORD = 'syncflow';
const MASTER_USER: AuthUser = {
  id: 'master-syncflow',
  email: MASTER_EMAIL,
  name: 'SyncFlow Admin',
  isAdmin: true,
};

// Register a new user
export async function register(data: RegisterData): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(data.email);
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const newUser: User = {
      id: uuidv4(),
      email: data.email,
      password: hashedPassword,
      name: data.name,
      createdAt: new Date().toISOString(),
    };

    await createUser(newUser);

    return {
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        isAdmin: false,
      },
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Failed to register user' };
  }
}

// Login user
export async function login(data: LoginData): Promise<{ success: boolean; error?: string; user?: AuthUser }> {
  try {
    // Built-in master credential for admin access.
    if (data.email === MASTER_EMAIL && data.password === MASTER_PASSWORD) {
      return {
        success: true,
        user: MASTER_USER,
      };
    }

    // Find user by email
    const user = await getUserByEmail(data.email);
    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: 'Invalid email or password' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isAdmin: false,
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Failed to login' };
  }
}

// Reset password by email
export async function resetPassword(data: ResetPasswordData): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getUserByEmail(data.email);
    if (!user) {
      return { success: false, error: 'Email not found' };
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    const updated = await updateUser(user.id, { password: hashedPassword });
    if (!updated) {
      return { success: false, error: 'Failed to update password' };
    }

    return { success: true };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}

// Store current session for the active browser tab/session only.
const SESSION_KEY = 'syncflow_session';

export function saveSession(user: AuthUser): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  // Remove any stale persistent session from older builds.
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): AuthUser | null {
  const session = sessionStorage.getItem(SESSION_KEY);
  if (!session) {
    // Ensure persistent sessions are not reused.
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  try {
    return JSON.parse(session);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}
