import { create } from 'zustand';
import { loginWithGoogle, loginGuests, logoutUser, initUserProfile, auth, updateUserProfile, updateUsername, markPuzzleCompleted } from './firebase';

export type ViewState = 'landing' | 'dashboard' | 'play-bot' | 'play-friend' | 'learn' | 'leaderboard';

export interface User {
  id: string;
  name: string;
  elo: number;
  rankTitle: string;
  isGuest: boolean;
  progressToNextRank: number; // 0-100
  completedPuzzles: string[];
}

interface AppState {
  currentView: ViewState;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  setCurrentView: (view: ViewState) => void;
  login: (asGuest: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateElo: (points: number) => Promise<void>;
  updateName: (newName: string) => Promise<void>;
  completePuzzle: (puzzleId: string) => Promise<boolean>;
}

const getRankTitle = (elo: number) => {
  if (elo < 800) return 'Bronze I';
  if (elo < 1000) return 'Bronze II';
  if (elo < 1200) return 'Silver I';
  if (elo < 1400) return 'Silver II';
  if (elo < 1600) return 'Gold I';
  if (elo < 1800) return 'Gold II';
  if (elo < 2000) return 'Platinum';
  return 'Diamond';
};

const getProgress = (elo: number) => {
  const modulo = elo % 200;
  return Math.floor((modulo / 200) * 100);
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  user: null,
  isLoading: true, // initial state before checking auth
  error: null,
  setCurrentView: (view) => set({ currentView: view }),
  login: async (asGuest) => {
    try {
      set({ isLoading: true, error: null });
      let cred;
      if (asGuest) {
        cred = await loginGuests();
      } else {
        cred = await loginWithGoogle();
      }
      
      if (cred && cred.user) {
        const profile = await initUserProfile(cred.user, asGuest);
        if (profile) {
             set({ user: profile as User, currentView: 'dashboard', isLoading: false });
        } else {
             set({ error: 'Failed to init profile', isLoading: false });
        }
      }
    } catch (e: any) {
      console.error(e);
      set({ error: e.message, isLoading: false });
    }
  },
  logout: async () => {
    try {
      await logoutUser();
      set({ user: null, currentView: 'landing' });
    } catch (error) {
      console.error(error);
    }
  },
  updateElo: async (points: number) => {
    const state = useAppStore.getState();
    if (!state.user) return;
    const newElo = Math.max(100, state.user.elo + points);
    const newRankTitle = getRankTitle(newElo);
    const updatedUser: User = {
      ...state.user,
      elo: newElo,
      rankTitle: newRankTitle,
      progressToNextRank: getProgress(newElo)
    };
    
    set({ user: updatedUser });
    try {
      await updateUserProfile(state.user.id, newElo, newRankTitle);
    } catch (e) {
      console.error('Failed to sync Elo update to Firestore: ', e);
    }
  },
  updateName: async (newName: string) => {
    const state = useAppStore.getState();
    if (!state.user) return;
    const updatedUser: User = {
      ...state.user,
      name: newName
    };
    
    set({ user: updatedUser });
    try {
      await updateUsername(state.user.id, newName);
    } catch (e) {
      console.error('Failed to sync name update to Firestore: ', e);
    }
  },
  completePuzzle: async (puzzleId: string) => {
    const state = useAppStore.getState();
    if (!state.user) return false;
    if (state.user.completedPuzzles.includes(puzzleId)) return false; // Already completed
    
    // We update local state optimistically, but we need the new array
    const newPuzzles = await markPuzzleCompleted(state.user.id, puzzleId, state.user.completedPuzzles);
    
    const updatedUser: User = {
      ...state.user,
      completedPuzzles: newPuzzles
    };
    
    set({ user: updatedUser });
    return true; // Successfully marked as completed
  }
}));

