import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export interface FirestoreEntity {
  id: string;
  [key: string]: unknown;
}

export function userCollection(userId: string, name: string) {
  return collection(db, "users", userId, name);
}

export async function listUserEntities<T extends FirestoreEntity>(userId: string, name: string) {
  const snapshot = await getDocs(query(userCollection(userId, name), orderBy("updatedAt", "desc")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as T);
}

export async function saveUserEntity<T extends FirestoreEntity>(userId: string, name: string, entity: T) {
  const ref = doc(db, "users", userId, name, entity.id);
  await setDoc(ref, { ...entity, updatedAt: new Date().toISOString() }, { merge: true });
}

export async function patchUserEntity(
  userId: string,
  name: string,
  entityId: string,
  patch: Record<string, unknown>,
) {
  await updateDoc(doc(db, "users", userId, name, entityId), {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUserEntity(userId: string, name: string, entityId: string) {
  await deleteDoc(doc(db, "users", userId, name, entityId));
}
