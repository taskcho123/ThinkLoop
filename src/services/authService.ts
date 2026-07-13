import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "./firebase";

async function ensureLocalPersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

export async function signInWithEmail(email: string, password: string) {
  await ensureLocalPersistence();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
) {
  await ensureLocalPersistence();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });
  return credential.user;
}

export async function signInWithGoogle() {
  await ensureLocalPersistence();
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function logOut() {
  await signOut(auth);
}

export function subscribeToAuthSession(onChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, onChange);
}
