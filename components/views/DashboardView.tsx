import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';
import { Target, Swords, GraduationCap, LayoutList, LogOut, ChevronRight, Pencil, Check, X, History } from 'lucide-react';
import { getUserMatches, MatchData } from '@/lib/firebase';

export default function DashboardView() {
  const { user, setCurrentView, logout, updateName } = useAppStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [matches, setMatches] = useState<MatchData[]>([]);

  useEffect(() => {
    if (user?.id) {
      getUserMatches(user.id).then(data => {
        setMatches(data);
      });
    }
  }, [user?.id]);

  if (!user) return null;

  const handleSaveName = async () => {
    if (editedName.trim() && editedName.trim() !== user.name) {
      await updateName(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setEditedName(user.name);
    setIsEditingName(false);
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-4 sm:p-8 flex flex-col md:flex-row gap-6">
      {/* Sidebar / Top area for user profile */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full md:w-80 flex-shrink-0"
      >
        <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Target className="w-32 h-32" />
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-indigo-500 rounded-lg flex items-center justify-center text-xl font-bold shadow-lg shadow-indigo-500/20 text-white">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <button onClick={logout} className="text-slate-500 hover:text-white transition-colors p-2 bg-slate-800/50 rounded-full" id="logout-btn">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            
            {isEditingName ? (
              <div className="flex items-center gap-1.5 mb-2 mt-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  maxLength={30}
                  className="bg-[#0F172A] text-white border border-indigo-500/50 rounded-lg px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-indigo-500 w-full font-bold"
                  id="username-edit-input"
                />
                <button onClick={handleSaveName} className="p-1 px-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded border border-emerald-500/30 transition-all flex items-center justify-center font-bold" id="username-save-btn">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={handleCancelName} className="p-1 px-1.5 text-rose-400 hover:bg-rose-500/10 rounded border border-rose-500/30 transition-all flex items-center justify-center font-bold" id="username-cancel-btn">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group mb-2 min-w-0">
                <h2 className="text-2xl font-bold truncate max-w-[170px] text-white">{user.name}</h2>
                <button onClick={() => { setIsEditingName(true); setEditedName(user.name); }} className="text-slate-500 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800 flex-shrink-0" id="username-edit-trigger" title="Ubah Nama">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-slate-400 text-sm mb-6 flex items-center gap-1">
              <Target className="w-3 h-3 text-indigo-400" /> Elo: <strong className="text-white">{user.elo}</strong>
            </p>

            {/* Rank Progress */}
            <div className="bg-[#0F172A] p-4 rounded-lg border border-slate-700/50 mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-blue-400">{user.rankTitle}</span>
                <span className="text-slate-500">{user.progressToNextRank}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                <div className="bg-indigo-500 h-2.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${user.progressToNextRank}%` }}></div>
              </div>
              <p className="text-xs text-center text-slate-500 mt-3">Mainkan match untuk naik rank!</p>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-700/50 text-center">
              <p className="text-xs text-slate-500 font-medium">
                <span className="text-slate-400 uppercase tracking-widest text-[10px]">Owner</span>
                <br />
                <span className="font-bold text-indigo-400">Muhammad Rafi</span>
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => setCurrentView('play-bot')}
            className="w-full text-left bg-indigo-600 hover:bg-indigo-500 text-white p-6 rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all group overflow-hidden relative h-full flex flex-col"
            id="arena-bot-btn"
          >
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-indigo-400/20 to-transparent pointer-events-none" />
            <div className="bg-indigo-500 p-4 rounded-lg text-white shadow-inner self-start mb-4">
              <Swords className="w-8 h-8" />
            </div>
            <div className="mt-auto">
              <h3 className="text-xl font-bold mb-1">Lawan Bot</h3>
              <p className="text-indigo-200 text-sm font-medium">Uji taktik Anda</p>
            </div>
          </motion.button>
          
          <motion.button 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => setCurrentView('play-friend')}
            className="w-full text-left bg-sky-600 hover:bg-sky-500 text-white p-6 rounded-xl font-bold shadow-lg shadow-sky-600/20 transition-all group overflow-hidden relative h-full flex flex-col"
            id="arena-friend-btn"
          >
            <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-sky-400/20 to-transparent pointer-events-none" />
            <div className="bg-sky-500 p-4 rounded-lg text-white shadow-inner self-start mb-4">
              <Target className="w-8 h-8" />
            </div>
            <div className="mt-auto">
              <h3 className="text-xl font-bold mb-1">Lawan Teman</h3>
              <p className="text-sky-200 text-sm font-medium">PvP Realtime Match</p>
            </div>
          </motion.button>
        </div>

        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setCurrentView('learn')}
          className="w-full text-left bg-[#1E293B] p-6 rounded-xl border border-slate-700/50 hover:bg-slate-800/80 transition-all group"
          id="pusat-belajar-btn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 p-4 rounded-lg text-emerald-400 border border-emerald-500/20">
                <GraduationCap className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Pusat Belajar</h3>
                <p className="text-slate-400 text-sm font-medium">Pecahkan puzzle & taktik catur</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.button>

        <motion.button 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => setCurrentView('leaderboard')}
          className="w-full text-left bg-[#1E293B] p-6 rounded-xl border border-slate-700/50 hover:bg-slate-800/80 transition-all group"
          id="leaderboard-btn"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500/10 p-4 rounded-lg text-yellow-500 border border-yellow-500/20">
                <LayoutList className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Papan Peringkat</h3>
                <p className="text-slate-400 text-sm font-medium">Lihat pemain terbaik global</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-yellow-500 group-hover:translate-x-2 transition-transform" />
          </div>
        </motion.button>
        
        {/* Match History */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full bg-[#1E293B] p-6 rounded-xl border border-slate-700/50"
        >
          <div className="flex items-center gap-2 mb-4">
             <History className="w-5 h-5 text-slate-400" />
             <h3 className="font-bold text-white uppercase tracking-wider text-sm">Riwayat Pertandingan PvP</h3>
          </div>
          
          {matches.length === 0 ? (
             <p className="text-sm text-slate-500 text-center py-4">Belum ada riwayat pertandingan.</p>
          ) : (
             <div className="flex flex-col gap-3">
                {matches.map((match, i) => {
                   const isWhite = match.whitePlayerId === user.id;
                   const result = match.winner === 'draw' ? 'Seri' : 
                                  (match.winner === 'white' && isWhite) || (match.winner === 'black' && !isWhite) 
                                  ? 'Menang' : 'Kalah';
                   const resultColor = result === 'Menang' ? 'text-emerald-400' : result === 'Kalah' ? 'text-rose-400' : 'text-slate-400';
                   return (
                      <div key={match.id || i} className="flex items-center justify-between p-3 rounded-lg bg-[#0F172A] border border-slate-700/50">
                         <div className="flex flex-col">
                            <span className={`font-bold text-sm ${resultColor}`}>{result}</span>
                            <span className="text-xs text-slate-500 mt-1 uppercase">{match.terminationReason}</span>
                         </div>
                         <div className="text-right flex flex-col">
                            <span className="text-sm font-medium text-slate-300">Bermain sbg: {isWhite ? 'Putih' : 'Hitam'}</span>
                            <span className="text-xs text-slate-500 mt-0.5">{match.status === 'ongoing' ? 'Belum Selesai' : 'Selesai'}</span>
                         </div>
                      </div>
                   );
                })}
             </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
