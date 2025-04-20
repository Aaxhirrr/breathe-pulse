import {
  type AuthCredential,
  GoogleAuthProvider,
  type User,
  type UserCredential,
  type UserInfo,
  sendEmailVerification as firebaseSendEmailVerification,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signOut as firebaseSignOut,
  reauthenticateWithCredential,
  signInWithPopup,
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { firebaseAuth } from "./firebase";

const validateConfig = () => {
  console.log("Firebase auth extension enabled");
};

/**
 * Sign in with Google popup.
 *
 * TODO: Set providers based on config
 */
const signInWithGoogle = async (): Promise<UserCredential | null> => {
  const provider = new GoogleAuthProvider();
  provider.addScope("https://www.googleapis.com/auth/userinfo.profile");

  return signInWithPopup(firebaseAuth, provider);
};

/**
 * Sign out the user.
 */
const signOut = async (): Promise<void> => {
  return firebaseSignOut(firebaseAuth);
};

/**
 * Returns the logged in user if logged in, otherwise null.
 */
const getCurrentUser = (): User | null => {
  return firebaseAuth.currentUser;
};

/**
 * Updates the display name or photo URL of the current user.
 *
 * https://firebase.google.com/docs/auth/web/manage-users#update_a_users_profile
 */
const updateCurrentUser = async (
  user: User,
  payload: Partial<Pick<UserInfo, "displayName" | "photoURL">>,
) => {
  return updateProfile(user, payload);
};

/**
 * Updates the email of the current user.
 */
const updateCurrentUserEmail = async (user: User, email: string) => {
  return updateEmail(user, email);
};

/**
 * Sends an email verification to the current user.
 */
const sendEmailVerification = async (user: User) => {
  return firebaseSendEmailVerification(user);
};

/**
 * Updates the password of the current user.
 */
const updateCurrentUserPassword = async (user: User, newPassword: string) => {
  return updatePassword(user, newPassword);
};

/**
 * Sends a password reset email to the current user.
 */
const sendPasswordResetEmail = async (email: string) => {
  return firebaseSendPasswordResetEmail(firebaseAuth, email);
};

/**
 * Reauthenticates the current user with credentials for
 * security sensitive operations.
 */
const reauthenticateUser = async (user: User, credential: AuthCredential) => {
  return reauthenticateWithCredential(user, credential);
};

const getAuthToken = async (): Promise<string | null> => {
  return firebaseAuth.currentUser?.getIdToken() ?? null;
};

const getAuthHeaderValue = async (): Promise<string> => {
  const idToken = await getAuthToken();
  return `Bearer ${idToken ?? ""}`;
};

export const auth = {
  getAuthHeaderValue,
  getAuthToken,
  getCurrentUser,
  reauthenticateUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithGoogle,
  signOut,
  updateCurrentUser,
  updateCurrentUserEmail,
  updateCurrentUserPassword,
  validateConfig,
};
