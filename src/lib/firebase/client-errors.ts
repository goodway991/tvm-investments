import { FirebaseError } from "firebase/app";

export function friendlyFirestoreError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
