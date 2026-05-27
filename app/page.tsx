'use client';

import { useEffect, useState } from 'react';
import { useAppStore, User } from '@/lib/store';
import { auth, initUserProfile } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LandingView from '@/components/views/LandingView';
import DashboardView from '@/components/views/DashboardView';
import PlayBotView from '@/components/views/PlayBotView';
import PlayFriendView from '@/components/views/PlayFriendView';
import LearnView from '@/components/views/LearnView';
import LeaderboardView from '@/components/views/LeaderboardView';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const currentView = useAppStore((state) => state.currentView);
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const isLoading = useAppStore((state) => state.isLoading);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        useAppStore.setState({ isLoading: true });
        const profile = await initUserProfile(user, user.isAnonymous);
        if (profile) {
          const params = new URLSearchParams(window.location.search);
          const roomToJoin = params.get('matchId');
          useAppStore.setState({ 
            user: profile as User, 
            currentView: roomToJoin ? 'play-friend' : 'dashboard', 
            isLoading: false 
          });
        } else {
          useAppStore.setState({ user: null, currentView: 'landing', isLoading: false });
        }
      } else {
        useAppStore.setState({ user: null, currentView: 'landing', isLoading: false });
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  // View Router
  switch (currentView) {
    case 'landing':
      return <LandingView />;
    case 'dashboard':
      return <DashboardView />;
    case 'play-bot':
      return <PlayBotView />;
    case 'play-friend':
      return <PlayFriendView />;
    case 'learn':
      return <LearnView />;
    case 'leaderboard':
      return <LeaderboardView />;
    default:
      return <LandingView />;
  }
}
