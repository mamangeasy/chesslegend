import React, { useState, useEffect, useCallback, useRef } from "react";
import { Chess, Move } from "chess.js";
import { Chessboard } from "react-chessboard";
import { useAppStore } from "@/lib/store";
import { motion } from "motion/react";
import {
  ArrowLeft,
  RefreshCw,
  Trophy,
  AlertTriangle,
  ShieldCheck,
  Share2,
  Clipboard,
  Users,
  Target,
  Check,
} from "lucide-react";
import {
  playMoveSound,
  playCaptureSound,
  playGameOverSound,
} from "@/lib/audio";
import {
  createMatch,
  joinMatch,
  updateMatchState,
  findMatch,
  updateMatchRematchStatus,
  subscribeToMatch,
  MatchData,
  getUserProfile,
} from "@/lib/firebase";

export default function PlayFriendView() {
  const { setCurrentView, updateElo, user } = useAppStore();

  // Local chess state mostly matches firebase state
  const [game, setGame] = useState(new Chess());
  const [matchId, setMatchId] = useState<string>("");
  const [joinInput, setJoinInput] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("matchId") || "";
    }
    return "";
  });

  const hasAttemptedUrlJoin = React.useRef(false);

  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [opponentProfile, setOpponentProfile] = useState<{
    name: string;
    elo: number;
    rankTitle: string;
  } | null>(null);

  const [viewState, setViewState] = useState<"setup" | "playing" | "gameover">(
    "setup",
  );
  const [errorText, setErrorText] = useState("");
  const [copied, setCopied] = useState(false);
  const [localFen, setLocalFen] = useState(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  );
  const [chatInput, setChatInput] = useState("");

  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);

  const handleTimeoutMultiplayer = useCallback(
    (timeoutColor: "w" | "b") => {
      if (!matchData || !user || matchData.status !== "ongoing") return;
      const myColor = matchData.whitePlayerId === user.id ? "w" : "b";
      if (myColor !== timeoutColor) {
        updateMatchState(
          matchId,
          matchData.fen,
          matchData.pgn,
          matchData.turn,
          "finished",
          myColor === "w" ? "white" : "black",
          "timeout",
          whiteTime,
          blackTime,
        ).catch(() => {});
      }
    },
    [matchData, user, matchId, whiteTime, blackTime],
  );

  useEffect(() => {
    if (
      !matchData ||
      matchData.status !== "ongoing" ||
      matchData.blackPlayerId === "waiting"
    )
      return;

    const interval = setInterval(() => {
      if (matchData.turn === "w") {
        setWhiteTime((prev) => {
          if (prev <= 1) {
            handleTimeoutMultiplayer("w");
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime((prev) => {
          if (prev <= 1) {
            handleTimeoutMultiplayer("b");
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [
    matchData?.status,
    matchData?.turn,
    matchData?.blackPlayerId,
    handleTimeoutMultiplayer,
  ]);

  const handleJoinMatch = useCallback(
    async (idToJoin: string = joinInput) => {
      if (!user || !idToJoin.trim()) return;
      setErrorText("Menyambungkan...");
      const success = await joinMatch(idToJoin.trim(), user.id);
      if (success) {
        setMatchId(idToJoin.trim());
        window.history.pushState({}, "", `/?matchId=${idToJoin.trim()}`);
        setErrorText("");
      } else {
        setErrorText("Gagal masuk. Ruang mungkin penuh atau tidak ada.");
      }
    },
    [joinInput, user],
  );

  useEffect(() => {
    if (!hasAttemptedUrlJoin.current && joinInput) {
      hasAttemptedUrlJoin.current = true;
      handleJoinMatch(joinInput);
    }
  }, [joinInput, handleJoinMatch]);

  // Listen to match changes
  useEffect(() => {
    if (!matchId || !user) return;
    const unsubscribe = subscribeToMatch(matchId, (data) => {
      setMatchData(data);
      if (data.status === "finished") {
        setViewState("gameover");
      } else {
        setViewState("playing");
      }

      const now = Date.now();
      const serverTimeMillis = data.lastMoveTimestamp?.toMillis
        ? data.lastMoveTimestamp.toMillis()
        : now;
      const elapsed = Math.floor((now - serverTimeMillis) / 1000);

      let wt = data.whiteTime ?? 600;
      let bt = data.blackTime ?? 600;

      if (data.status === "ongoing" && data.blackPlayerId !== "waiting") {
        if (data.turn === "w") {
          wt = Math.max(0, wt - elapsed);
        } else {
          bt = Math.max(0, bt - elapsed);
        }
      }
      setWhiteTime(wt);
      setBlackTime(bt);

      setLocalFen((currentFen) => {
        if (data.pgn !== undefined && data.fen !== currentFen) {
          const newGame = new Chess();
          try {
            if (data.pgn) {
              newGame.loadPgn(data.pgn);
            } else {
              newGame.load(data.fen);
            }
            setGame(newGame);
            return newGame.fen();
          } catch (e) {
            console.error("Invalid synced FEN/PGN:", data.fen);
          }
        }
        return currentFen;
      });
    });
    return () => unsubscribe();
  }, [matchId, user]);

  useEffect(() => {
    if (matchData && user && matchData.blackPlayerId !== "waiting") {
      const opponentId =
        matchData.whitePlayerId === user.id
          ? matchData.blackPlayerId
          : matchData.whitePlayerId;
      getUserProfile(opponentId).then((data) => {
        if (data) setOpponentProfile(data);
      });
    }
  }, [matchData?.whitePlayerId, matchData?.blackPlayerId, user]);

  const handleCreateMatch = async () => {
    if (!user) return;
    setErrorText("Membuat ruangan...");
    const newMatchId = await createMatch(user.id, true);
    if (newMatchId) {
      setMatchId(newMatchId);
      window.history.pushState({}, "", `/?matchId=${newMatchId}`);
      setErrorText("");
    } else {
      setErrorText("Gagal membuat pertarungan.");
    }
  };

  const [isFinding, setIsFinding] = useState(false);
  const handleFindMatch = async () => {
    if (!user) return;
    setErrorText("Mencari lawan...");
    setIsFinding(true);
    let matchIdFound = await findMatch(user.id);
    if (!matchIdFound) {
      matchIdFound = await createMatch(user.id, false);
    }
    setIsFinding(false);
    if (matchIdFound) {
      setMatchId(matchIdFound);
      window.history.pushState({}, "", `/?matchId=${matchIdFound}`);
      setErrorText("");
    } else {
      setErrorText("Gagal mencari permainan.");
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/?matchId=${matchId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const onDrop = (sourceSquare: string, targetSquare: string, piece: any) => {
    if (!user || !matchData || matchData.status !== "ongoing") return false;

    // Check if both players are present
    if (matchData.blackPlayerId === "waiting") return false;

    // Determine user color
    const myColor = matchData.whitePlayerId === user.id ? "w" : "b";

    // It must be user's turn
    if (matchData.turn !== myColor) return false;

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

      if (move.captured) playCaptureSound();
      else playMoveSound();

      setLocalFen(game.fen());

      // Check endgame status
      let newStatus: "ongoing" | "finished" = matchData.status as
        | "ongoing"
        | "finished";
      let newWinner: "white" | "black" | "draw" | "none" = matchData.winner as
        | "white"
        | "black"
        | "draw"
        | "none";
      let newReason: "checkmate" | "timeout" | "resignation" | "draw" | "none" =
        matchData.terminationReason as
          | "checkmate"
          | "timeout"
          | "resignation"
          | "draw"
          | "none";

      if (game.isCheckmate()) {
        newStatus = "finished";
        newWinner = myColor === "w" ? "white" : "black";
        newReason = "checkmate";
        playGameOverSound(true);
      } else if (
        game.isDraw() ||
        game.isStalemate() ||
        game.isThreefoldRepetition() ||
        game.isInsufficientMaterial()
      ) {
        newStatus = "finished";
        newWinner = "draw";
        newReason = "draw";
        playGameOverSound(false);
      }

      // Calculate Elo changes if just won
      if (newStatus === "finished") {
        const reward = newWinner === "draw" ? 0 : 25; // 25 points for PvP win, 0 for draw
        updateElo(reward);
      }

      // Sync to firebase
      updateMatchState(
        matchId,
        game.fen(),
        game.pgn(),
        game.turn() as "w" | "b",
        newStatus as "ongoing" | "finished",
        newWinner as any,
        newReason as any,
        whiteTime,
        blackTime,
      );

      return true;
    } catch (e) {
      return false;
    }
  };

  const handleResign = () => {
    if (!matchData || !user || matchData.status !== "ongoing") return;
    const myColor = matchData.whitePlayerId === user.id ? "w" : "b";
    const loser = myColor;
    const winner = loser === "w" ? "black" : "white";
    updateElo(-15); // lose 15 points
    playGameOverSound(false);
    updateMatchState(
      matchId,
      matchData.fen,
      matchData.pgn,
      matchData.turn,
      "finished",
      winner,
      "resignation",
      whiteTime,
      blackTime,
    );
  };

  const handleExit = () => {
    window.history.pushState({}, "", "/");
    setCurrentView("dashboard");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !matchData || !user) return;
    const { addChatMessage } = await import("@/lib/firebase");
    await addChatMessage(
      matchId,
      user.id,
      user.name,
      chatInput.trim(),
      matchData.chatMessages || [],
    );
    setChatInput("");
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 flex flex-col items-center">
      {/* Header */}
      <div className="w-full bg-[#1E293B] border-b border-slate-700/50 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <button
          onClick={handleExit}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm hidden sm:inline">Keluar</span>
        </button>
        <span className="font-bold text-lg text-white flex items-center gap-1.5 uppercase tracking-wide">
          <Target className="w-5 h-5 text-sky-400" /> PvP
        </span>
        <div className="w-24"></div> {/* spacer */}
      </div>

      <div className="flex-1 w-full max-w-lg p-4 flex flex-col justify-center items-center gap-5">
        {viewState === "setup" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[#1E293B] border border-slate-700/50 rounded-xl p-6 shadow-xl text-center"
          >
            <Users className="w-16 h-16 text-sky-400 mx-auto mb-4" />
            <h2 className="text-2xl font-black text-white mb-2">
              Bermain Catur
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Mulai cepat untuk dicarikan lawan secara acak, atau buat ruang
              pribadi bersama teman.
            </p>

            <button
              onClick={handleFindMatch}
              disabled={isFinding}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-lg py-4 px-4 rounded-xl shadow-lg shadow-amber-500/20 mb-6 transition-all flex items-center justify-center gap-2"
            >
              {isFinding ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <Target className="w-6 h-6" />
              )}
              {isFinding ? "Mencari Lawan..." : "Mulai Cepat"}
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-px bg-slate-700/50 flex-1"></div>
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                Ruang Pribadi
              </span>
              <div className="h-px bg-slate-700/50 flex-1"></div>
            </div>

            <button
              onClick={handleCreateMatch}
              disabled={isFinding}
              className="w-full bg-[#334155] hover:bg-[#475569] text-white font-bold py-3 px-4 rounded-lg mb-4 transition-all"
            >
              Buat Ruangan Baru
            </button>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Kode 6 Digit..."
                maxLength={6}
                value={joinInput}
                onChange={(e) =>
                  setJoinInput(e.target.value.replace(/\D/g, ""))
                }
                className="bg-[#0F172A] border border-slate-700 text-white px-4 py-3 rounded-lg text-center font-mono focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none w-full text-2xl tracking-[0.25em] font-black"
              />
              <button
                onClick={() => handleJoinMatch()}
                className="w-full bg-[#334155] hover:bg-[#475569] text-white font-bold py-3 px-4 rounded-lg transition-all"
              >
                Masuk Ruangan
              </button>
            </div>

            {errorText && (
              <p className="mt-4 text-xs font-bold text-amber-400">
                {errorText}
              </p>
            )}
          </motion.div>
        )}

        {(viewState === "playing" || viewState === "gameover") && matchData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center gap-4"
          >
            {/* Status indicators */}
            <div
              className={`w-full p-4 rounded-xl border flex flex-col gap-2 ${matchData.status === "finished" ? "bg-indigo-500/10 border-indigo-500/50" : "bg-[#1E293B] border-slate-700/50"}`}
            >
              <div className="flex justify-between items-center text-sm font-bold">
                {matchData.blackPlayerId === "waiting" ? (
                  <div className="text-amber-400 animate-pulse">
                    Menunggu Lawan...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="font-black text-white">
                      {opponentProfile
                        ? opponentProfile.name
                        : "Lawan Terhubung"}
                    </div>
                    {opponentProfile && (
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                        <Target className="w-3 h-3 text-sky-400" />{" "}
                        {opponentProfile.elo}
                        <span className="text-sky-500/50">•</span>
                        <span className="text-sky-200">
                          {opponentProfile.rankTitle}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                {matchData.status === "finished" && (
                  <div className="text-indigo-400">Permainan Selesai</div>
                )}
              </div>

              {/* Turn indicator */}
              {matchData.blackPlayerId !== "waiting" &&
                matchData.status === "ongoing" && (
                  <div className="flex justify-between items-center w-full">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Giliran:{" "}
                      <span
                        className={
                          matchData.turn === "w"
                            ? "text-white"
                            : "text-slate-500"
                        }
                      >
                        Putih
                      </span>{" "}
                      /{" "}
                      <span
                        className={
                          matchData.turn === "b"
                            ? "text-white"
                            : "text-slate-500"
                        }
                      >
                        Hitam
                      </span>
                    </div>
                    <div className="flex gap-4">
                      <div
                        className={`px-2 py-1 rounded text-xs font-mono font-bold ${matchData.turn === "w" ? "bg-amber-500 text-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-slate-800 text-slate-400"}`}
                      >
                        W: {formatTime(whiteTime)}
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-mono font-bold ${matchData.turn === "b" ? "bg-amber-500 text-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-slate-800 text-slate-400"}`}
                      >
                        B: {formatTime(blackTime)}
                      </div>
                    </div>
                  </div>
                )}

              {/* Share Link if waiting */}
              {matchData.blackPlayerId === "waiting" && (
                <div className="flex flex-col items-center justify-center p-4">
                  {matchData.isPrivate ? (
                    <>
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                        Kode Ruangan
                      </span>
                      <div className="flex items-center gap-4 bg-[#0F172A] px-6 py-4 rounded-xl border border-slate-700 w-full justify-between">
                        <span className="text-3xl font-black font-mono text-white tracking-[0.25em]">
                          {matchId}
                        </span>
                        <button
                          onClick={copyLink}
                          className="p-3 bg-sky-600 text-white rounded-lg hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20 flex flex-col items-center justify-center"
                          title="Salin Tautan"
                        >
                          {copied ? (
                            <Check className="w-6 h-6" />
                          ) : (
                            <Clipboard className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-sky-400/80 mt-3 text-center">
                        Bagikan kode ini atau salin tautan untuk mengajak temanmu
                        bermain.
                      </p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-4 my-8">
                      <RefreshCw className="w-12 h-12 text-amber-500 animate-spin" />
                      <span className="text-lg font-bold text-slate-300">
                        Mencari Lawan...
                      </span>
                      <p className="text-sm text-slate-500 text-center max-w-[250px]">
                        Sedang menunggu pemain lain untuk bergabung dalam antrean.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Chessboard */}
            <div className="w-full aspect-square max-w-[500px] bg-[#1E293B] p-2 border border-slate-700/50 rounded-xl relative overflow-hidden shadow-2xl">
              <Chessboard
                options={{
                  position: localFen,
                  onPieceDrop: (args) =>
                    onDrop(
                      args.sourceSquare ?? "",
                      args.targetSquare ?? "",
                      args.piece as any,
                    ),
                  boardOrientation:
                    matchData.whitePlayerId === user.id ? "white" : "black",
                  darkSquareStyle: { backgroundColor: "#0284c7", opacity: 0.8 },
                  lightSquareStyle: { backgroundColor: "#e0f2fe" },
                }}
              />

              {/* Game Over Overlay */}
              {viewState === "gameover" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-[#0F172A]/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 p-6 text-center"
                >
                  <Trophy
                    className={`w-16 h-16 mb-4 ${matchData.winner === "draw" ? "text-slate-400" : "text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]"}`}
                  />
                  <h2 className="text-3xl font-black mb-2 text-white">
                    {matchData.winner === "draw"
                      ? "Seri/Remis!"
                      : (matchData.winner === "white" &&
                            matchData.whitePlayerId === user.id) ||
                          (matchData.winner === "black" &&
                            matchData.blackPlayerId === user.id)
                        ? "Kemenangan!"
                        : "Kekalahan"}
                  </h2>
                  <p className="text-slate-400 font-bold mb-6">
                    {matchData.terminationReason.toUpperCase()}
                  </p>

                  <div className="flex flex-col gap-3 w-full max-w-xs">
                    {!matchData.nextMatchId && (
                      <button
                        onClick={async () => {
                          const myColor =
                            matchData.whitePlayerId === user.id
                              ? "white"
                              : "black";
                          const oppRequested =
                            myColor === "white"
                              ? matchData.rematchBlack
                              : matchData.rematchWhite;
                          if (oppRequested) {
                            // Opponent already requested, create new match and set nextMatchId
                            const nextMatchId = await createMatch(
                              user.id,
                              true,
                            );
                            if (nextMatchId) {
                              await joinMatch(
                                nextMatchId,
                                myColor === "white"
                                  ? matchData.blackPlayerId
                                  : matchData.whitePlayerId,
                              ); // Join them too or let them join? Opponent can join via nextMatchId
                              await updateMatchRematchStatus(
                                matchId,
                                myColor,
                                true,
                                nextMatchId,
                              );
                            }
                          } else {
                            // Request rematch
                            await updateMatchRematchStatus(
                              matchId,
                              myColor,
                              true,
                            );
                          }
                        }}
                        disabled={
                          matchData.whitePlayerId === user.id
                            ? matchData.rematchWhite
                            : matchData.rematchBlack
                        }
                        className="bg-amber-500 text-slate-900 font-bold px-8 py-3 rounded-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                      >
                        {matchData.whitePlayerId === user.id
                          ? matchData.rematchWhite
                            ? "Menunggu Lawan..."
                            : matchData.rematchBlack
                              ? "Terima Rematch"
                              : "Ajak Rematch"
                          : matchData.rematchBlack
                            ? "Menunggu Lawan..."
                            : matchData.rematchWhite
                              ? "Terima Rematch"
                              : "Ajak Rematch"}
                      </button>
                    )}

                    {matchData.nextMatchId && (
                      <button
                        onClick={() => {
                          setJoinInput(matchData.nextMatchId!);
                          handleJoinMatch(matchData.nextMatchId!);
                        }}
                        className="bg-green-500 text-white font-bold px-8 py-3 rounded-lg hover:bg-green-400 transition-colors shadow-lg shadow-green-500/20"
                      >
                        Gabung Rematch
                      </button>
                    )}

                    <button
                      onClick={handleExit}
                      className="bg-sky-600 text-white font-bold px-8 py-3 rounded-lg hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20"
                    >
                      Kembali ke Menu
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Resign / Controls */}
            {matchData.status === "ongoing" &&
              matchData.blackPlayerId !== "waiting" && (
                <button
                  onClick={handleResign}
                  className="text-rose-400 text-xs font-bold uppercase tracking-wider hover:bg-rose-500/10 px-4 py-2 rounded-lg transition-colors border border-transparent hover:border-rose-500/30"
                >
                  Nyerah (Resign)
                </button>
              )}

            {/* Chat & Move History */}
            {matchData.blackPlayerId !== "waiting" && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                {/* Move History */}
                <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-4 flex flex-col h-64">
                  <h3 className="font-bold text-sm text-white mb-2 uppercase tracking-wider text-slate-400">
                    Notasi Langkah
                  </h3>
                  <div className="overflow-y-auto flex-1 bg-[#0F172A] p-3 rounded-lg flex flex-wrap content-start gap-2">
                    {game.history().length === 0 ? (
                      <div className="text-xs text-slate-500 w-full text-center mt-4">
                        Belum ada langkah
                      </div>
                    ) : (
                      game.history().map((move, idx) => (
                        <div
                          key={idx}
                          className={`text-xs font-mono px-2 py-1 rounded ${idx % 2 === 0 ? "bg-slate-800 text-white" : "bg-slate-700/50 text-slate-300"}`}
                        >
                          {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}
                          {move}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Chat Room */}
                <div className="bg-[#1E293B] border border-slate-700/50 rounded-xl p-4 flex flex-col h-64">
                  <h3 className="font-bold text-sm text-white mb-2 uppercase tracking-wider text-slate-400">
                    Obrolan
                  </h3>
                  <div className="overflow-y-auto flex-1 bg-[#0F172A] p-3 rounded-lg mb-2 flex flex-col gap-2">
                    {!matchData.chatMessages ||
                    matchData.chatMessages.length === 0 ? (
                      <div className="text-xs text-slate-500 w-full text-center mt-4">
                        Pesan kosong.
                      </div>
                    ) : (
                      matchData.chatMessages.map((msg, i) => {
                        const isMe = msg.senderId === user.id;
                        return (
                          <div
                            key={i}
                            className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                          >
                            <span className="text-[10px] text-slate-500 mb-0.5">
                              {msg.senderName}
                            </span>
                            <div
                              className={`px-2.5 py-1.5 rounded-lg text-xs max-w-[85%] ${isMe ? "bg-sky-600 text-white" : "bg-slate-700 text-slate-200"}`}
                            >
                              {msg.text}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Kirim pesan..."
                      className="flex-1 bg-[#0F172A] border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      className="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors"
                    >
                      Kirim
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
