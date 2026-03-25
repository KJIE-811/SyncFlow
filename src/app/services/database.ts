import localforage from 'localforage';

// Initialize the database
const db = localforage.createInstance({
  name: 'SyncFlowDB',
  storeName: 'users',
  description: 'Local database for user accounts',
});

export interface User {
  id: string;
  email: string;
  password: string; // hashed
  name: string;
  createdAt: string;
}

// Get all users (for checking if email exists)
export async function getAllUsers(): Promise<User[]> {
  const users: User[] = [];
  await db.iterate((value: unknown) => {
    users.push(value as User);
  });
  return users;
}

// Get user by ID
export async function getUserById(id: string): Promise<User | null> {
  const user = await db.getItem<User>(id);
  return user;
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase()) || null;
}

// Create a new user
export async function createUser(user: User): Promise<User> {
  await db.setItem(user.id, user);
  return user;
}

// Update user
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const user = await getUserById(id);
  if (!user) return null;
  
  const updatedUser = { ...user, ...updates };
  await db.setItem(id, updatedUser);
  return updatedUser;
}

// Delete user
export async function deleteUser(id: string): Promise<boolean> {
  await db.removeItem(id);
  return true;
}

export default db;
