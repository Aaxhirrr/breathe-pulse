import { type FirebaseApp, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { config } from "./config";

// Export the firebase app instance in case it's needed by other modules.
export const firebaseApp: FirebaseApp = initializeApp(config.firebaseConfig);

// Export the firebase auth instance
export const firebaseAuth = getAuth(firebaseApp);
