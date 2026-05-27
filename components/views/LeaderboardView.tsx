import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';
import { ArrowLeft, Trophy, Medal, Hexagon, Loader2 } from 'lucide-react';
import { getLeaderboard } from '@/lib/firebase';

export default function LeaderboardView() {
  const { setCurrentView, user } = useAppStore();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const data = await getLeaderboard();
        const fallbackGMs = [
          { id: 'gm-magnus', name: 'Magnus C.', elo: 2882, rankTitle: 'Diamond', isGuest: false },
          { id: 'gm-hikaru', name: 'Hikaru N.', elo: 2789, rankTitle: 'Diamond', isGuest: false },
          { id: 'gm-fabi', name: 'Fabi C.', elo: 2780, rankTitle: 'Diamond', isGuest: false },
          { id: 'gm-ding', name: 'Ding L.', elo: 2775, rankTitle: 'Diamond', isGuest: false },
          { id: 'gm-ian', name: 'Ian N.', elo: 2760, rankTitle: 'Diamond', isGuest: false },
          { id: 'gm-alireza', name: 'Alireza F.', elo: 2755, rankTitle: 'Diamond', isGuest: false },
          { id: 'gm-wesley', name: 'Wesley S.', elo: 2750, rankTitle: 'Diamond', isGuest: false },
        ];

        // Combine and group
        const combined = [...data];
        fallbackGMs.forEach((gm) => {
          if (!combined.some((user) => user.name.toLowerCase() === gm.name.toLowerCase())) {
            combined.push(gm);
          }
        });

        // Ensure current user is present and positioned
        if (user && !combined.some((p) => p.id === user.id)) {
          combined.push({
            id: user.id,
            name: user.name,
            elo: user.elo,
            rankTitle: user.rankTitle,
            isGuest: user.isGuest,
          });
        }

        // Sort descending
        combined.sort((a, b) => b.elo - a.elo);
        setLeaderboard(combined);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeaderboard();
  }, [user]);

  // Find user's actual rank index
  const userRankIndex = leaderboard.findIndex((p) => p.id === user?.id);
  const userRankString = userRankIndex !== -1 ? `#${userRankIndex + 1}` : '#?';

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col">
      {/* Header */}
      <div className="w-full bg-[#1E293B] border-b border-slate-700/50 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm hidden sm:inline">Kembali</span>
        </button>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-bold text-lg text-white">Global Leaderboard</span>
        </div>
        <div className="w-10" /> {/* Balancer */}
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4 overflow-y-auto">
        
        {/* User Rank Highlight */}
        {user && (
          <div className="bg-[#1E293B] border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between mb-4 shadow-lg shadow-indigo-500/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-lg border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-lg">
                {userRankString}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-0.5">Peringkat Anda</p>
                <h3 className="font-bold text-white text-lg">{user.name}</h3>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-indigo-400">{user.elo}</p>
              <p className="text-[10px] uppercase font-bold text-slate-500">{user.rankTitle}</p>
            </div>
          </div>
        )}

        {/* Global List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
            {leaderboard.map((player, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.4) }}
                key={player.id || index}
                className={`flex items-center justify-between p-4 sm:p-5 border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors cursor-pointer ${player.id === user?.id ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : index < 3 ? 'bg-slate-800/25' : ''}`}
              >
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Ranking Icon */}
                  <div className="w-6 flex justify-center text-center">
                    {index === 0 ? <span className="font-black text-yellow-400 text-lg">1</span> :
                     index === 1 ? <span className="font-bold text-slate-300 text-lg">2</span> :
                     index === 2 ? <span className="font-bold text-amber-600 text-lg">3</span> :
                     <span className="font-bold text-slate-500">{index + 1}</span>}
                  </div>
                  
                  <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center border ${player.id === user?.id ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-slate-800 border-slate-700'}`}>
                     <Trophy className={`w-5 h-5 ${index === 0 ? 'text-yellow-400 font-bold' : index === 1 ? 'text-slate-300 font-bold' : index === 2 ? 'text-amber-600 font-bold' : 'text-slate-500'}`} />
                  </div>
                  
                  <div>
                    <h3 className={`font-bold text-base sm:text-lg ${player.id === user?.id ? 'text-indigo-300' : index < 3 ? 'text-white' : 'text-slate-300'}`}>
                      {player.name} {player.id === user?.id && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded ml-1 font-normal">Anda</span>}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-mono uppercase font-bold">
                      {player.rankTitle || 'Player'}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-1.5 align-middle text-right">
                  <span className="font-mono font-bold text-indigo-400 sm:text-lg text-base">{player.elo}</span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
