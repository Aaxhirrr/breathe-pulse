import { create } from 'zustand';
import { Unsubscribe, User } from 'firebase/auth'; // Import User type
import { Timestamp } from 'firebase/firestore'; // Import Timestamp

// Import interfaces and functions from firestoreUtils
import {
  Habit,
  MoodEntry,
  addHabit as addHabitFirestore,
  toggleHabitCompletion as toggleHabitCompletionFirestore,
  deleteHabit as deleteHabitFirestore,
  onHabitsUpdate,
  addMoodEntry as addMoodEntryFirestore,
  onMoodEntriesUpdate,
} from './firestoreUtils'; // Assuming firestoreUtils is in the same directory

type Personality = 'cheerful' | 'serious' | 'motivating';

interface CompanionState {
  personality: Personality;
  selectedMoodEmoji: string | null;

  // Habit State
  habits: Habit[];
  isHabitLoading: boolean; // Renamed for consistency
  habitError: Error | null;
  habitListenerUnsubscribe: Unsubscribe | null;

  // Mood State
  moodEntries: MoodEntry[];
  isMoodLoading: boolean;
  moodError: Error | null;
  moodListenerUnsubscribe: Unsubscribe | null;


  // Actions
  setPersonality: (personality: Personality) => void;
  setSelectedMoodEmoji: (emoji: string | null) => void;

  // Habit Actions (refactored to use firestoreUtils)
  subscribeToHabits: (userId: string) => void;
  unsubscribeFromHabits: () => void;
  addHabit: (userId: string, habitData: Pick<Habit, "name" | "goalType" | "goalValue">) => Promise<void>;
  toggleHabitCompletion: (userId: string, habitId: string, date?: Date, achievedValue?: number) => Promise<void>;
  deleteHabit: (userId: string, habitId: string) => Promise<void>;

  // Mood Actions
  subscribeToMoodEntries: (userId: string) => void;
  unsubscribeFromMoodEntries: () => void;
  addMoodEntry: (userId: string, moodData: Pick<MoodEntry, "moodEmoji" | "notes" | "linkedHabitIds">) => Promise<void>;


  // ... (other future actions)
}

export const useCompanionStore = create<CompanionState>((set, get) => ({
  // --- Initial State ---
  personality: 'cheerful',
  selectedMoodEmoji: null,

  // Habits
  habits: [],
  isHabitLoading: true, // Start loading
  habitError: null,
  habitListenerUnsubscribe: null,

  // Mood
  moodEntries: [],
  isMoodLoading: true, // Start loading
  moodError: null,
  moodListenerUnsubscribe: null,


  // --- Actions ---
  setPersonality: (personality) => set({ personality }),
  setSelectedMoodEmoji: (emoji) => set({ selectedMoodEmoji: emoji }),

  // --- Habit Actions (Using firestoreUtils) ---

  subscribeToHabits: (userId) => {
    get().unsubscribeFromHabits(); // Unsubscribe previous listener first
    set({ isHabitLoading: true, habitError: null });

    const unsubscribe = onHabitsUpdate(
      userId,
      (updatedHabits) => {
        set({ habits: updatedHabits, isHabitLoading: false });
      },
      (error) => {
        console.error("Error listening to habits:", error);
        set({ habitError: error, isHabitLoading: false });
      }
    );
    set({ habitListenerUnsubscribe: unsubscribe });
  },

  unsubscribeFromHabits: () => {
    const unsubscribe = get().habitListenerUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
      set({ habitListenerUnsubscribe: null, habits: [], isHabitLoading: true }); // Reset state
      console.log("Unsubscribed from habit updates.");
    }
  },

  addHabit: async (userId, habitData) => {
    if (!userId || !habitData.name.trim()) {
      console.error("User ID or habit name is missing.");
      return;
    }
    try {
      await addHabitFirestore(userId, habitData);
      console.log("Habit add request sent to Firestore Utils for:", habitData.name);
      // Listener will update state
    } catch (error) {
      console.error("Error calling addHabitFirestore:", error);
      // Optionally set an error state in the store
      // set({ habitError: error });
    }
  },

  toggleHabitCompletion: async (userId, habitId, date, achievedValue) => {
    if (!userId || !habitId) {
      console.error("User ID or habit ID is missing for toggle.");
      return;
    }
    try {
      // Pass optional date and achievedValue to the utility function
      // Default date to now if not provided
      await toggleHabitCompletionFirestore(userId, habitId, date ?? new Date(), achievedValue);
      console.log("Habit toggle request sent to Firestore Utils for:", habitId);
      // Listener should update state, including lastCompletedDate and streaks if implemented correctly in firestoreUtils.
      // If immediate UI feedback is needed before listener updates, manual state update might be required, but adds complexity.
    } catch (error) {
      console.error("Error calling toggleHabitCompletionFirestore:", error);
      // set({ habitError: error }); // Optional: Propagate error to UI
    }
  },

  deleteHabit: async (userId, habitId) => {
    if (!userId || !habitId) {
      console.error("User ID or habit ID is missing for delete.");
      return;
    }
    try {
      await deleteHabitFirestore(userId, habitId);
      console.log("Habit delete request sent to Firestore Utils for:", habitId);
      // Listener will update state
    } catch (error) {
      console.error("Error calling deleteHabitFirestore:", error);
      // set({ habitError: error });
    }
  },

  // --- Mood Actions ---

 subscribeToMoodEntries: (userId) => {
    get().unsubscribeFromMoodEntries(); // Unsubscribe previous listener first
    set({ isMoodLoading: true, moodError: null });

    const unsubscribe = onMoodEntriesUpdate(
      userId,
      (updatedMoodEntries) => {
        set({ moodEntries: updatedMoodEntries, isMoodLoading: false });
      },
      (error) => {
        console.error("Error listening to mood entries:", error);
        set({ moodError: error, isMoodLoading: false });
      }
    );
    set({ moodListenerUnsubscribe: unsubscribe });
  },

  unsubscribeFromMoodEntries: () => {
    const unsubscribe = get().moodListenerUnsubscribe;
    if (unsubscribe) {
      unsubscribe();
      set({ moodListenerUnsubscribe: null, moodEntries: [], isMoodLoading: true }); // Reset state
      console.log("Unsubscribed from mood entry updates.");
    }
  },

   addMoodEntry: async (userId, moodData) => {
    if (!userId || !moodData.moodEmoji) {
      console.error("User ID or mood emoji is missing.");
      return;
    }
    try {
      await addMoodEntryFirestore(userId, moodData);
      console.log("Mood entry add request sent to Firestore Utils:", moodData.moodEmoji);
      // Listener will update state
    } catch (error) {
      console.error("Error calling addMoodEntryFirestore:", error);
      // set({ moodError: error });
    }
  },

}));

// Keep existing options
export const personalityOptions: { value: Personality; label: string }[] = [
  { value: 'cheerful', label: '😊 Cheerful & Upbeat' },
  { value: 'serious', label: '🧐 Calm & Serious' },
  { value: 'motivating', label: '💪 Motivating & Encouraging' },
];
export const moodOptions: string[] = ['😊', '😄', '😐', '😔', '😠', '🤔', '🤯'];
