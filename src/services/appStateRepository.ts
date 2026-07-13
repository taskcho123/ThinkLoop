import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface PersistedAppState {
  userProfile: {
    name: string;
    avatarId: string;
    role: string;
  };
  projects: unknown[];
  insights: unknown[];
  customBlogs: unknown[];
  updatedAt?: string;
}

const stateDoc = (userId: string) => doc(db, "users", userId, "app", "state");

export async function loadAppState(userId: string) {
  const snapshot = await getDoc(stateDoc(userId));
  return snapshot.exists() ? (snapshot.data() as PersistedAppState) : null;
}

export async function saveAppState(userId: string, state: PersistedAppState) {
  await setDoc(stateDoc(userId), {
    ...state,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}
