import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useAppStore } from "@/lib/store";
import { motion } from "motion/react";
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  AlertTriangle,
  ShieldCheck,
  Dumbbell,
  Zap,
} from "lucide-react";
import {
  playMoveSound,
  playCaptureSound,
  playGameOverSound,
} from "@/lib/audio";

type Difficulty = "easy" | "medium" | "hard";

const PIECE_VALUES: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 900,
};

// Simple position static evaluation
const evaluateBoard = (chess: Chess): number => {
  let score = 0;
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = PIECE_VALUES[piece.type] || 0;
        // Bot is black, so black material is positive for score, white is negative
        if (piece.color === "b") {
          score += val;
        } else {
          score -= val;
        }
      }
    }
  }
  return score;
};

export default function PlayBotView() {
  const { setCurrentView, updateElo } = useAppStore();
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState<string>("Bermain...");
  const [isGameOver, setIsGameOver] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [matchResult, setMatchResult] = useState<{
    winner: "white" | "black" | "draw" | null;
    points: number;
  } | null>(null);

  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  const getEloReward = useCallback(
    (winner: "white" | "black" | "draw"): number => {
      if (winner === "draw") return 0;
      if (winner === "white") {
        if (difficulty === "easy") return 10;
        if (difficulty === "medium") return 20;
        return 35; // hard
      } else {
        if (difficulty === "easy") return -5;
        if (difficulty === "medium") return -10;
        return -15; // hard
      }
    },
    [difficulty],
  );

  const handleTimeoutLocal = useCallback(
    (winner: "white" | "black") => {
      setIsGameOver(true);
      setStatus(
        `Waktu Habis! ${winner === "white" ? "Putih" : "Hitam"} Menang`,
      );
      const points = getEloReward(winner);
      setMatchResult({ winner, points });
      updateElo(points);
      playGameOverSound(winner === "white");
    },
    [getEloReward, updateElo],
  );

  useEffect(() => {
    if (isGameOver || game.history().length === 0) return;

    const interval = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeoutLocal("black");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeoutLocal("white");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [game, isGameOver, handleTimeoutLocal]);

  const checkGameOver = useCallback(() => {
    if (game.isCheckmate()) {
      const winner = game.turn() === "w" ? "black" : "white";
      setIsGameOver(true);
      setStatus(
        `Skakmat! ${winner === "white" ? "Anda Menang!" : "Bot Menang."}`,
      );
      const points = getEloReward(winner);
      setMatchResult({ winner, points });
      updateElo(points);
      playGameOverSound(winner === "white");
    } else if (
      game.isDraw() ||
      game.isStalemate() ||
      game.isThreefoldRepetition() ||
      game.isInsufficientMaterial()
    ) {
      setIsGameOver(true);
      setStatus("Seri / Remis!");
      setMatchResult({ winner: "draw", points: 0 });
      playGameOverSound(false);
    }
  }, [game, getEloReward, updateElo]);

  const makeBotMove = useCallback(() => {
    const possibleMoves = game.moves({ verbose: true }) as any[];
    if (game.isGameOver() || possibleMoves.length === 0) {
      checkGameOver();
      return;
    }

    let chosenMove = possibleMoves[0];

    if (difficulty === "easy") {
      // Random moves
      const randomIndex = Math.floor(Math.random() * possibleMoves.length);
      chosenMove = possibleMoves[randomIndex];
    } else if (difficulty === "medium") {
      // Captures high value pieces, else evaluates static evaluation or random
      const captures = possibleMoves.filter((m: any) => m.captured);
      if (captures.length > 0 && Math.random() < 0.75) {
        captures.sort((a: any, b: any) => {
          const valA = PIECE_VALUES[a.captured] || 0;
          const valB = PIECE_VALUES[b.captured] || 0;
          return valB - valA;
        });
        chosenMove = captures[0];
      } else {
        const randomIndex = Math.floor(Math.random() * possibleMoves.length);
        chosenMove = possibleMoves[randomIndex];
      }
    } else {
      // Hard: 2-ply Minimax simulation
      let bestScore = -Infinity;
      let optimalMoves: any[] = [];

      for (const m of possibleMoves) {
        const temp = new Chess(game.fen());
        temp.move(m);

        if (temp.isCheckmate()) {
          chosenMove = m;
          optimalMoves = [m];
          break;
        }

        let score = evaluateBoard(temp);

        // Opponent's best reply (Minimizes Black's advantage score)
        const whiteMoves = temp.moves({ verbose: true }) as any[];
        let minOpponentScore = Infinity;

        for (const wm of whiteMoves) {
          const temp2 = new Chess(temp.fen());
          temp2.move(wm);
          const oppScore = evaluateBoard(temp2);
          if (oppScore < minOpponentScore) {
            minOpponentScore = oppScore;
          }
        }

        const finalScore = whiteMoves.length > 0 ? minOpponentScore : score;

        if (finalScore > bestScore) {
          bestScore = finalScore;
          optimalMoves = [m];
        } else if (finalScore === bestScore) {
          optimalMoves.push(m);
        }
      }

      if (optimalMoves.length > 0) {
        const randomIndex = Math.floor(Math.random() * optimalMoves.length);
        chosenMove = optimalMoves[randomIndex];
      }
    }

    const move = game.move(chosenMove);
    if (move) {
      if (move.captured) {
        playCaptureSound();
      } else {
        playMoveSound();
      }
    }

    setFen(game.fen());
    checkGameOver();
  }, [game, difficulty, checkGameOver]);

  function onDrop(sourceSquare: string, targetSquare: string, piece: any) {
    if (isGameOver) return false;

    try {
      const p =
        typeof piece === "string" && piece.length >= 2
          ? piece[1].toLowerCase()
          : "q";
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: p,
      });

      if (move === null) return false;

      if (move.captured) {
        playCaptureSound();
      } else {
        playMoveSound();
      }

      setFen(game.fen());
      checkGameOver();

      if (!game.isGameOver()) {
        setStatus("Bot sedang berfikir...");
        setTimeout(() => {
          makeBotMove();
          if (!game.isGameOver()) setStatus("Giliran Anda");
        }, 600);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setIsGameOver(false);
    setStatus("Bermain...");
    setMatchResult(null);
    setWhiteTime(600);
    setBlackTime(600);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col items-center">
      {/* Header */}
      <div className="w-full bg-[#1E293B] border-b border-slate-700/50 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setCurrentView("dashboard")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700"
          id="playbot-back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm hidden sm:inline">Kembali</span>
        </button>
        <span
          className="font-bold text-lg text-white flex items-center gap-1.5"
          id="arena-bot-title"
        >
          Arena vs Catur Bot
        </span>
        <button
          onClick={resetGame}
          className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700/50"
          title="Ulangi Permainan"
          id="playbot-reset-btn"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Main Board Area */}
      <div className="flex-1 w-full max-w-lg p-4 flex flex-col justify-center items-center gap-5">
        {/* Tier difficulty Curve settings */}
        <div className="w-full bg-[#1E293B]/70 border border-slate-700/50 p-2 rounded-xl flex items-center justify-between gap-1 shadow-md">
          <button
            onClick={() => {
              setDifficulty("easy");
              resetGame();
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === "easy" ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black" : "text-slate-400 hover:text-slate-200 border border-transparent"}`}
            id="diff-easy-btn"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Mudah (+10)
          </button>

          <button
            onClick={() => {
              setDifficulty("medium");
              resetGame();
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === "medium" ? "bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black" : "text-slate-400 hover:text-slate-200 border border-transparent"}`}
            id="diff-medium-btn"
          >
            <Dumbbell className="w-3.5 h-3.5" />
            Sedang (+20)
          </button>

          <button
            onClick={() => {
              setDifficulty("hard");
              resetGame();
            }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold transition-all ${difficulty === "hard" ? "bg-rose-500/10 border border-rose-500/30 text-rose-400 font-black relative drop-shadow-[0_0_8px_rgba(239,68,68,0.2)]" : "text-slate-400 hover:text-slate-200 border border-transparent"}`}
            id="diff-hard-btn"
          >
            <Zap className="w-3.5 h-3.5" />
            Sulit (+35)
          </button>
        </div>

        {/* Status indicator */}
        <div
          className={`w-full flex justify-between items-center px-5 py-2 rounded-lg border text-sm font-bold tracking-wide transition-colors ${isGameOver ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400" : "bg-[#1E293B] border-slate-700/50 text-slate-300"}`}
          id="game-status-lbl"
        >
          <span>{status}</span>
          {!isGameOver && (
            <div className="flex gap-4">
              <div
                className={`px-2 py-1 rounded text-xs font-mono font-bold ${game.turn() === "w" ? "bg-amber-500 text-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-slate-800 text-slate-400"}`}
              >
                W: {formatTime(whiteTime)}
              </div>
              <div
                className={`px-2 py-1 rounded text-xs font-mono font-bold ${game.turn() === "b" ? "bg-amber-500 text-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-slate-800 text-slate-400"}`}
              >
                B: {formatTime(blackTime)}
              </div>
            </div>
          )}
        </div>

        {/* Board Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full aspect-square max-w-[500px] bg-[#1E293B] p-2 border border-slate-700/50 rounded-xl relative overflow-hidden shadow-2xl"
          id="chessboard-container"
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
              boardOrientation: "white",
              darkSquareStyle: { backgroundColor: "#475569" },
              lightSquareStyle: { backgroundColor: "#cbd5e1" },
            }}
          />

          {/* Game Over Overlay */}
          {isGameOver && matchResult && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center"
              id="game-over-overlay"
            >
              {matchResult.winner === "white" ? (
                <Trophy className="w-16 h-16 text-yellow-500 mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              ) : (
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
              )}
              <h2 className="text-3xl font-black mb-2 text-white">
                {matchResult.winner === "white"
                  ? "Kemenangan!"
                  : matchResult.winner === "black"
                    ? "Kekalahan"
                    : "Seri"}
              </h2>
              <div className="bg-[#1E293B] px-6 py-4 rounded-xl border border-slate-700/50 mb-6 w-full max-w-xs shadow-lg">
                <span className="text-xs uppercase tracking-wider text-slate-500 font-bold block mb-1">
                  Perubahan Elo
                </span>
                <span
                  className={`text-3xl font-black ${matchResult.points > 0 ? "text-emerald-400" : matchResult.points < 0 ? "text-rose-400" : "text-slate-400"}`}
                >
                  {matchResult.points > 0
                    ? `+${matchResult.points}`
                    : matchResult.points}
                </span>
              </div>
              <button
                onClick={resetGame}
                className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20"
                id="play-again-btn"
              >
                Main Lagi
              </button>
            </motion.div>
          )}
        </motion.div>

        {/* Move History for Bot */}
        <div className="w-full bg-[#1E293B] border border-slate-700/50 rounded-xl p-4 flex flex-col h-40 max-w-lg mb-4 shadow-lg">
          <h3 className="font-bold text-xs text-white mb-2 uppercase tracking-wider text-slate-400">
            Notasi Langkah
          </h3>
          <div className="overflow-y-auto flex-1 bg-[#0F172A] p-3 rounded-lg flex flex-wrap content-start gap-2 border border-slate-800">
            {game.history().length === 0 ? (
              <div className="text-xs text-slate-500 w-full text-center mt-2">
                Belum ada langkah
              </div>
            ) : (
              game.history().map((move, idx) => (
                <div
                  key={idx}
                  className={`text-[11px] font-mono px-2 py-1 rounded ${idx % 2 === 0 ? "bg-slate-800 text-white border border-slate-600" : "bg-slate-800/50 text-slate-400 border border-transparent"}`}
                >
                  {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}
                  {move}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
