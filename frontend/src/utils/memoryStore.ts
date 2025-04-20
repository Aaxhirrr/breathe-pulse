import { create } from 'zustand';
import { firebaseApp } from 'app'; // Import firebaseApp
import {
  getFirestore, // Import getFirestore
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  DocumentData,
  Unsubscribe,
} from 'firebase/firestore';

// Interface for a single memory item
export interface MemoryItem {
  id: string;
  memory_content: string;
  timestamp: Date | null; // Store as JS Date object for easier handling
}

// Interface for the store's state and actions
interface MemoryStore {
  memories: MemoryItem[];
  isLoading: boolean;
  error: Error | null;
  unsubscribe: Unsubscribe | null; // To hold the Firestore listener detach function
  subscribeToMemories: (userId: string) => void;
  unsubscribeFromMemories: () => void;
}

// Helper function to convert Firestore Timestamp to JS Date
const convertTimestamp = (timestamp: Timestamp | DocumentData | undefined): Date | null => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  // Add more checks if timestamps might be stored differently, otherwise return null
  return null;
};

// Get Firestore instance
const db = getFirestore(firebaseApp);

export const useMemoryStore = create<MemoryStore>((set, get) => ({
  memories: [],
  isLoading: false,
  error: null,
  unsubscribe: null,

  subscribeToMemories: (userId) => {
    // Unsubscribe from any previous listener
    get().unsubscribeFromMemories();
    set({ isLoading: true, error: null });

    if (!userId) {
      console.error('[MemoryStore] No user ID provided for subscription.');
      set({ isLoading: false, error: new Error('User ID is required.') });
      return;
    }

    console.log(`[MemoryStore] Subscribing to memories for user: ${userId}`);
    // Use the db instance here
    const memoryCollectionRef = collection(db, `users/${userId}/companionMemory`);
    const q = query(memoryCollectionRef, orderBy('timestamp', 'desc')); // Order by newest first

    try {
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log(`[MemoryStore] Received snapshot with ${querySnapshot.docs.length} memories.`);
          const memoriesData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            memory_content: doc.data().memory_content || '', // Ensure content exists
            timestamp: convertTimestamp(doc.data().timestamp), // Convert Firestore timestamp
          }));
          set({ memories: memoriesData, isLoading: false, error: null });
        },
        (err) => {
          console.error('[MemoryStore] Error fetching memories:', err);
          set({ isLoading: false, error: err });
        }
      );
      // Store the unsubscribe function to be called later
      set({ unsubscribe });
    } catch (err) {
        console.error("[MemoryStore] Failed to initiate subscription:", err);
        // Ensure error is an instance of Error
        const error = err instanceof Error ? err : new Error('Failed to subscribe to memories');
        set({ isLoading: false, error: error });
    }
  },

  unsubscribeFromMemories: () => {
    const unsubscribe = get().unsubscribe;
    if (unsubscribe) {
      console.log('[MemoryStore] Unsubscribing from memories.');
      unsubscribe();
      set({ unsubscribe: null }); // Clear the stored unsubscribe function
    }
  },
}));
