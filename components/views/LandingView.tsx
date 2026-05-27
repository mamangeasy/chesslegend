import { useAppStore } from '@/lib/store';
import { motion } from 'motion/react';
import { Trophy, Swords, BrainCircuit, User } from 'lucide-react';

export default function LandingView() {
  const login = useAppStore((state) => state.login);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0F172A] text-slate-200 p-6 overflow-hidden relative font-sans">
      {/* Abstract Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 flex flex-col items-center max-w-md w-full"
      >
        <div className="mb-8 p-6 bg-[#1E293B] rounded-2xl border border-slate-700/50 shadow-xl w-full max-w-sm flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Grandmaster.io
          </h1>
          <p className="text-slate-400 text-center text-sm font-medium">Bermain & Belajar bersama</p>
          <div className="mt-4 py-1 px-3 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            <p className="text-indigo-400 text-center text-xs font-bold tracking-wider">Owner Muhammad Rafi</p>
          </div>
        </div>

        <div className="w-full space-y-4 max-w-sm">
          <button 
            onClick={() => login(false)}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-6 rounded-lg transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <User className="w-5 h-5" />
            Lanjutkan dengan Akun
          </button>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-700/50"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-500 uppercase tracking-wider">atau</span>
            <div className="flex-grow border-t border-slate-700/50"></div>
          </div>

          <button 
            onClick={() => login(true)}
            className="w-full flex items-center justify-center gap-3 bg-[#1E293B] hover:bg-slate-800 text-slate-300 font-bold py-3.5 px-6 rounded-lg border border-slate-700/50 transition-all active:scale-95 hover:text-white"
          >
            Mulai Bermain Guest
          </button>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-sm">
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-700/50 text-center flex flex-col items-center">
            <div className="bg-slate-800/50 p-2 rounded-lg mb-2">
               <Swords className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">PvP Arena</p>
          </div>
          <div className="bg-[#1E293B] p-4 rounded-xl border border-slate-700/50 text-center flex flex-col items-center">
            <div className="bg-slate-800/50 p-2 rounded-lg mb-2">
              <BrainCircuit className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Belajar Taktik</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
