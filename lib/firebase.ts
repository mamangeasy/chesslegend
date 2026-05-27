import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInAnonymously,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  where,
} from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth Helpers
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const loginGuests = async () => {
  return signInAnonymously(auth);
};

export const logoutUser = async () => {
  return signOut(auth);
};

export const initUserProfile = async (userAuth: any, isGuest: boolean) => {
  const userRef = doc(db, "users", userAuth.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const name = isGuest
        ? `Guest_${userAuth.uid.substring(0, 5)}`
        : userAuth.displayName || "Player";
      await setDoc(userRef, {
        name,
        elo: 400,
        rankTitle: "Wood Division",
        isGuest,
        completedPuzzles: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return {
        id: userAuth.uid,
        name,
        elo: 400,
        rankTitle: "Wood Division",
        isGuest,
        progressToNextRank: 15,
        completedPuzzles: [],
      };
    } else {
      const data = snap.data();
      return {
        id: userAuth.uid,
        name: data.name,
        elo: data.elo,
        rankTitle: data.rankTitle,
        isGuest: data.isGuest,
        completedPuzzles: data.completedPuzzles || [],
        progressToNextRank: Math.floor(((data.elo % 200) / 200) * 100),
      };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${userAuth.uid}`);
  }
};

export const updateUserProfile = async (
  uid: string,
  elo: number,
  rankTitle: string,
) => {
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      elo,
      rankTitle,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const updateUsername = async (uid: string, newName: string) => {
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, {
      name: newName,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
};

export const markPuzzleCompleted = async (
  uid: string,
  puzzleId: string,
  currentPuzzles: string[],
) => {
  const userRef = doc(db, "users", uid);
  try {
    const newPuzzles = [...new Set([...currentPuzzles, puzzleId])];
    await updateDoc(userRef, {
      completedPuzzles: newPuzzles,
      updatedAt: serverTimestamp(),
    });
    return newPuzzles;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    return currentPuzzles;
  }
};

export const getUserMatches = async (uid: string) => {
  try {
    const matchesRef = collection(db, "matches");
    // Note: in a real production app we would need an index for OR queries or fetch separately
    // Since Firebase doesn't support logical OR naturally across multiple fields easily without composite index + workaround,
    // we'll just fetch where user is white, and where user is black, then combine.
    const qWhite = query(matchesRef, orderBy("startedAt", "desc"), limit(50));
    const snap = await getDocs(qWhite);
    const list: MatchData[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.whitePlayerId === uid || data.blackPlayerId === uid) {
        list.push({ id: docSnap.id, ...data } as MatchData);
      }
    });
    return list
      .sort((a, b) => {
        const timeA = (a as any).startedAt?.toMillis() || 0;
        const timeB = (b as any).startedAt?.toMillis() || 0;
        return timeB - timeA;
      })
      .slice(0, 10);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "matches");
    return [];
  }
};

export interface LeaderboardEntry {
  id: string;
  name: string;
  elo: number;
  rankTitle: string;
  isGuest: boolean;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export interface MatchData {
  id?: string;
  whitePlayerId: string;
  blackPlayerId: string;
  fen: string;
  pgn: string;
  turn: "w" | "b";
  status: "ongoing" | "finished";
  winner: "white" | "black" | "draw" | "none";
  terminationReason: "checkmate" | "timeout" | "resignation" | "draw" | "none";
  chatMessages: ChatMessage[];
  lastMoveTimestamp?: any;
  whiteTime?: number;
  blackTime?: number;
  startedAt?: any;
  updatedAt?: any;
  isPrivate?: boolean;
  rematchWhite?: boolean;
  rematchBlack?: boolean;
  nextMatchId?: string;
}

const generateShortId = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const createMatch = async (uid: string, isPrivate: boolean = true) => {
  let matchId = generateShortId();
  let matchRef = doc(db, "matches", matchId);

  try {
    let snap = await getDoc(matchRef);
    while (snap.exists()) {
      matchId = generateShortId();
      matchRef = doc(db, "matches", matchId);
      snap = await getDoc(matchRef);
    }

    await setDoc(matchRef, {
      whitePlayerId: uid,
      blackPlayerId: "waiting",
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      pgn: "",
      turn: "w",
      status: "ongoing",
      winner: "none",
      terminationReason: "none",
      chatMessages: [],
      lastMoveTimestamp: serverTimestamp(),
      whiteTime: 600,
      blackTime: 600,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPrivate,
    });
    return matchRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `matches`);
    return null;
  }
};

export const joinMatch = async (matchId: string, uid: string) => {
  const matchRef = doc(db, "matches", matchId);
  try {
    const snap = await getDoc(matchRef);
    if (!snap.exists()) return false;
    const data = snap.data();

    if (data.blackPlayerId === "waiting" && data.whitePlayerId !== uid) {
      await updateDoc(matchRef, {
        blackPlayerId: uid,
        whiteTime: 600,
        blackTime: 600,
        lastMoveTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    }

    // Allow re-joining if user is already one of the players
    if (data.whitePlayerId === uid || data.blackPlayerId === uid) {
      return true;
    }

    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
    return false;
  }
};

export const findMatch = async (uid: string) => {
  const matchesRef = collection(db, "matches");
  const q = query(
    matchesRef,
    where("blackPlayerId", "==", "waiting"),
    where("isPrivate", "==", false),
    where("status", "==", "ongoing"),
    limit(1),
  );
  try {
    const snap = await getDocs(q);
    if (!snap.empty) {
      const matchDoc = snap.docs[0];
      await updateDoc(matchDoc.ref, {
        blackPlayerId: uid,
        whiteTime: 600,
        blackTime: 600,
        lastMoveTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return matchDoc.id;
    }
  } catch (error) {
    // Might fail if someone else took it, we just return null and create one
  }
  return null;
};

export const updateMatchRematchStatus = async (
  matchId: string,
  myColor: "white" | "black",
  wantsRematch: boolean,
  nextMatchId?: string,
) => {
  const matchRef = doc(db, "matches", matchId);
  try {
    const updatePayload: any = { updatedAt: serverTimestamp() };
    if (myColor === "white") {
      updatePayload.rematchWhite = wantsRematch;
    } else {
      updatePayload.rematchBlack = wantsRematch;
    }
    if (nextMatchId) {
      updatePayload.nextMatchId = nextMatchId;
    }
    await updateDoc(matchRef, updatePayload);
  } catch (error) {
    console.error(error);
  }
};

export const updateMatchState = async (
  matchId: string,
  fen: string,
  pgn: string,
  turn: "w" | "b",
  status: "ongoing" | "finished",
  winner: "white" | "black" | "draw" | "none",
  terminationReason: "checkmate" | "timeout" | "resignation" | "draw" | "none",
  whiteTime: number,
  blackTime: number,
) => {
  const matchRef = doc(db, "matches", matchId);
  try {
    await updateDoc(matchRef, {
      fen,
      pgn,
      turn,
      status,
      winner,
      terminationReason,
      whiteTime,
      blackTime,
      lastMoveTimestamp: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `matches/${matchId}`);
  }
};

export const addChatMessage = async (
  matchId: string,
  senderId: string,
  senderName: string,
  text: string,
  currentMessages: ChatMessage[],
) => {
  const matchRef = doc(db, "matches", matchId);
  try {
    const newMessage = {
      senderId,
      senderName,
      text,
      timestamp: new Date(),
    };
    await updateDoc(matchRef, {
      chatMessages: [...currentMessages, newMessage],
    });
  } catch (error) {
    console.error("Failed to send message", error);
  }
};

export const subscribeToMatch = (
  matchId: string,
  callback: (data: MatchData) => void,
) => {
  const matchRef = doc(db, "matches", matchId);
  return onSnapshot(matchRef, (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() } as MatchData);
    }
  });
};

export const getUserProfile = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: uid,
        name: data.name,
        elo: data.elo,
        rankTitle: data.rankTitle,
        isGuest: !!data.isGuest,
      };
    }
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
  }
  return null;
};

export const getLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, orderBy("elo", "desc"), limit(25));
    const snap = await getDocs(q);
    const list: LeaderboardEntry[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        name: data.name || "Anonymous",
        elo: data.elo || 400,
        rankTitle: data.rankTitle || "Wood Division",
        isGuest: !!data.isGuest,
      });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, "users");
    return [];
  }
};
