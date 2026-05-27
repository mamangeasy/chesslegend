import { useState, useEffect } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Lightbulb,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Trophy,
  BookOpen,
} from "lucide-react";

interface Puzzle {
  id: string;
  fen: string;
  title: string;
  description: string;
  correctMoves: { from: string; to: string }[]; // sequence of moves for player
  opponentMoves?: { from: string; to: string }[]; // sequence of moves for opponent (if any)
  orientation: "white" | "black";
}

const MODULES = [
  {
    id: "taktik-dasar",
    title: "Taktik Dasar",
    puzzles: [
      {
        id: "back-rank-1",
        title: "Skakmat Baris Belakang",
        description:
          "Temukan langkah skakmat (Mate in 1) untuk Putih. Perhatikan kelemahan pertahanan Raja Hitam yang terhalang pionnya sendiri.",
        fen: "6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1",
        correctMoves: [{ from: "b1", to: "b8" }],
        orientation: "white" as const,
      },
      {
        id: "fork-1",
        title: "Garpu Kuda (Knight Fork)",
        description:
          "Gunakan Kuda Anda untuk menyerang Raja dan Menteri Hitam secara bersamaan (Royal Fork).",
        fen: "3q3k/8/8/4N3/8/8/8/6K1 w - - 0 1",
        correctMoves: [{ from: "e5", to: "f7" }],
        orientation: "white" as const,
      },
      {
        id: "skewer-1",
        title: "Tusukan (Skewer)",
        description:
          "Gunakan Gajah Anda untuk meradiasi Raja Hitam. Saat Raja menghindar, Menteri di belakangnya akan tertangkap.",
        fen: "8/1q6/2k5/8/8/8/8/7B w - - 0 1",
        correctMoves: [{ from: "h1", to: "g2" }],
        orientation: "white" as const,
      },
    ],
  },
];

export default function LearnView() {
  const { setCurrentView, updateElo, user, completePuzzle } = useAppStore();
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);

  const currentModule = MODULES[currentModuleIndex];
  const currentPuzzle = currentModule.puzzles[currentPuzzleIndex];

  const [game, setGame] = useState(new Chess(currentPuzzle.fen));
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [isSolved, setIsSolved] = useState(false);
  const [mistake, setMistake] = useState(false);

  const isAlreadyCompleted =
    user?.completedPuzzles?.includes(currentPuzzle.id) || false;

  const [prevPuzzleId, setPrevPuzzleId] = useState(currentPuzzle.id);
  if (currentPuzzle.id !== prevPuzzleId) {
    setPrevPuzzleId(currentPuzzle.id);
    setGame(new Chess(currentPuzzle.fen));
    setFen(currentPuzzle.fen);
    setIsSolved(false);
    setMistake(false);
  }

  function onDrop(sourceSquare: string, targetSquare: string, piece: any) {
    if (isSolved) return false;

    // Check against current puzzle's correct move
    const currentCorrectMove = currentPuzzle.correctMoves[0];

    if (
      sourceSquare === currentCorrectMove.from &&
      targetSquare === currentCorrectMove.to
    ) {
      try {
        game.move({ from: sourceSquare, to: targetSquare });
        setFen(game.fen());
        setIsSolved(true);
        setMistake(false);

        if (!isAlreadyCompleted) {
          completePuzzle(currentPuzzle.id).then((success) => {
            if (success) {
              updateElo(10); // Reward for solving
            }
          });
        }

        return true;
      } catch (e) {
        return false;
      }
    } else {
      setMistake(true);
      setTimeout(() => setMistake(false), 2000);
      return false;
    }
  }

  const handleNext = () => {
    if (currentPuzzleIndex < currentModule.puzzles.length - 1) {
      setCurrentPuzzleIndex((prev) => prev + 1);
    } else {
      setCurrentView("dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col items-center">
      {/* Header */}
      <div className="w-full bg-[#1E293B] border-b border-slate-700/50 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentView("dashboard")}
            className="flex items-center justify-center text-slate-400 hover:text-white transition-colors p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />{" "}
              {currentModule.title}
            </h2>
            <p className="text-xs text-slate-400">
              Modul {currentModuleIndex + 1} - Soal {currentPuzzleIndex + 1}/
              {currentModule.puzzles.length}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setGame(new Chess(currentPuzzle.fen));
            setFen(currentPuzzle.fen);
            setIsSolved(false);
            setMistake(false);
          }}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
          title="Ulangi Puzzle"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 w-full max-w-lg p-6 flex flex-col items-center gap-6 mt-4">
        {/* Instruction Card */}
        <div className="w-full bg-[#1E293B] border border-slate-700/50 p-5 rounded-xl flex gap-4 items-start shadow-lg">
          <div className="bg-emerald-500/20 p-3 rounded-lg flex-shrink-0 text-emerald-400 mt-1 border border-emerald-500/30">
            <Lightbulb className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg mb-1 text-white">
              {currentPuzzle.title}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {currentPuzzle.description}
            </p>
          </div>
        </div>

        {/* Board */}
        <div
          className={`w-full aspect-square bg-[#1E293B] p-2 border border-slate-700/50 rounded-xl relative shadow-2xl transition-all duration-300 ${mistake ? "scale-[0.98] ring-2 ring-rose-500/50" : ""}`}
        >
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: (args) =>
                onDrop(
                  args.sourceSquare ?? "",
                  args.targetSquare ?? "",
                  args.piece as any,
                ),
              boardOrientation: currentPuzzle.orientation,
              darkSquareStyle: { backgroundColor: "#2dd4bf", opacity: 0.8 },
              lightSquareStyle: { backgroundColor: "#f0fdfa" },
              animationDurationInMs: 300,
            }}
          />

          {isSolved && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[#0F172A]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 rounded-xl"
            >
              <div className="bg-emerald-500 text-slate-950 p-4 rounded-full mb-4 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h2 className="text-2xl font-black text-white mb-2">
                Taktik Sempurna!
              </h2>
              {isAlreadyCompleted ? (
                <p className="text-slate-400 font-bold mb-6">
                  Sudah diselesaikan sebelumnya.
                </p>
              ) : (
                <p className="text-emerald-400 font-bold mb-6">+10 Point Elo</p>
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
              >
                {currentPuzzleIndex < currentModule.puzzles.length - 1
                  ? "Lanjut ke Soal Berikutnya"
                  : "Selesai Modul"}{" "}
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>

        {mistake && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-rose-400 text-sm font-medium bg-rose-950/50 px-4 py-2 rounded-full border border-rose-900/50"
          >
            Langkah salah, coba lagi!
          </motion.div>
        )}
      </div>
    </div>
  );
}
