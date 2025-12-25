
import { User } from './types';
import { MOCK_USERS } from './constants';

const SESSION_KEY = 'sems_session';

export const login = (employeeId: string, password: string): { success: boolean; user?: User; error?: string } => {
  const user = MOCK_USERS.find(u => u.id === employeeId);
  
  if (!user) return { success: false, error: 'User not found' };
  
  // Simulation: Password is "password123" for everyone for testing
  if (password !== 'password123') return { success: false, error: 'Invalid password' };

  return { success: true, user };
};

export const startSession = (user: User) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const endSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const getSessionUser = (): User | null => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};
