import { signInAnonymously } from 'firebase/auth';
import app, { auth } from '../firebase';

let cachedLoginPromise: Promise<string> | null = null;

export async function ensureAnonLogin(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  if (!cachedLoginPromise) {
    cachedLoginPromise = signInAnonymously(auth).then((cred) => cred.user.uid);
  }
  return cachedLoginPromise;
}

export { auth };

