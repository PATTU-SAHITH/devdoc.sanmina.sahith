import { createContext } from 'react';
import type { UserProfile } from '../types/auth';

/** The signed-in user and the account actions, for the profile menu on every screen (set in App). */
export interface Account {
  user: UserProfile;
  /** Opens Settings → Profile. */
  openProfile: () => void;
  logout: () => void;
}

export const AccountContext = createContext<Account | null>(null);
