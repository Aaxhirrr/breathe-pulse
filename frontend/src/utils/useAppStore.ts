import { create } from 'zustand';
import { breakTypes, BreakType } from "../utils/breakTypes";
import brain from "brain";
import { auth } from "app"; // Import auth module // Import brain client

// Define ChatMessage type locally for store usage
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AppState {
  currentStressLevel: number; // Smoothed
  isUserActive: boolean;
  lastBreakTimestamp: number | null;
  breakSuggestionActive: boolean;
  currentBreakSuggestion: BreakType | null; // Store the selected break details
  dynamicCoachingMessage: string | null; // Store the message from the API
  isFetchingCoachingMessage: boolean; // Track loading state
  isChatOpen: boolean; // State to control chat modal visibility
  isCompanionChatOpen: boolean; // State for the dedicated companion chat sheet

  // --- Feedback Chat State (Dialog) ---
  isFeedbackChatOpen: boolean;
  feedbackChatHistory: ChatMessage[];
  isFeedbackLoading: boolean;

  // ... other state properties

  actions: {
    updateMetricsFromCV: (rawStressLevel: number, isUserActive: boolean) => void;
    showBreakSuggestion: (force?: boolean) => void; // Now async
    dismissBreakSuggestion: (cooldownMinutes?: number) => void;
    recordBreakTaken: () => void;
    openChat: () => void; // Action to open chat
    closeChat: () => void; // Action to close chat

    // Companion Chat Actions (Sheet)
    openCompanionChat: () => void;
    closeCompanionChat: () => void;

    // --- Feedback Chat Actions (Dialog) ---
    openFeedbackChat: (initialMessage?: ChatMessage) => void;
    closeFeedbackChat: () => void;
    addFeedbackMessage: (message: ChatMessage) => void;
    setFeedbackLoading: (isLoading: boolean) => void;

    // ... other actions
  };
}

const SMOOTHING_FACTOR = 0.1; // Adjust alpha (0 to 1). Lower = smoother.

export const useAppStore = create<AppState>((set, get) => ({
  currentStressLevel: 0, // Initialize smoothed value
  isUserActive: false,
  lastBreakTimestamp: null,
  breakSuggestionActive: false,
  currentBreakSuggestion: null, // Initialize
  dynamicCoachingMessage: null, // Initialize
  isFetchingCoachingMessage: false, // Initialize
  isChatOpen: false, // Initialize chat state
  isCompanionChatOpen: false, // Initialize companion chat state

  // --- Feedback Chat Initial State ---
  isFeedbackChatOpen: false,
  feedbackChatHistory: [],
  isFeedbackLoading: false,

  // ... other initial state

  actions: {
    updateMetricsFromCV: (rawStressLevel, isUserActive) => {
      const currentSmoothedLevel = get().currentStressLevel;
      const newSmoothedLevel = 
        SMOOTHING_FACTOR * rawStressLevel + (1 - SMOOTHING_FACTOR) * currentSmoothedLevel;
      
      // console.log(`[AppStore] Updating metrics: Raw=${rawStressLevel}, OldSmooth=${currentSmoothedLevel.toFixed(1)}, NewSmooth=${newSmoothedLevel.toFixed(1)}, Active=${isUserActive}`); // DEBUG

      set({
        currentStressLevel: newSmoothedLevel,
        isUserActive: isUserActive, // Update activity status directly
      });
    },

    // Now async to handle API call
    showBreakSuggestion: async (force = false) => {
      const { currentStressLevel, isUserActive, lastBreakTimestamp, breakSuggestionActive } = get();
      const now = Date.now();
      const timeSinceLastBreak = lastBreakTimestamp
        ? now - lastBreakTimestamp
        : Infinity;
      const MIN_BREAK_INTERVAL_MS = 15 * 60 * 1000;
      const STRESS_THRESHOLD = 21; // New Break Trigger threshold

      const shouldShowNormally = 
        !breakSuggestionActive && 
        isUserActive &&
        currentStressLevel > STRESS_THRESHOLD &&
        timeSinceLastBreak > MIN_BREAK_INTERVAL_MS;

      if (force || shouldShowNormally) {
        set({ isFetchingCoachingMessage: true, dynamicCoachingMessage: null }); // Start loading

        // Select break type (same random logic)
        console.log("[AppStore SELECT] breakTypes array:", breakTypes); // DEBUG
        console.log("[AppStore SELECT] breakTypes length:", breakTypes.length); // DEBUG
        const randomIndex = Math.floor(Math.random() * breakTypes.length);
        console.log("[AppStore SELECT] randomIndex:", randomIndex); // DEBUG
        const selectedBreak = breakTypes[randomIndex];
        console.log("[AppStore SELECT] selectedBreak id:", selectedBreak?.id); // DEBUG
        
        let coachingMessage = selectedBreak.description; // Default to static description

        try {
          console.log(`[AppStore] Fetching coaching message for ${selectedBreak.title} at stress ${currentStressLevel.toFixed(1)}`);
          
          // Fetch auth token
          const token = await auth.getAuthToken();
          if (!token) {
            console.error("[AppStore] Auth token not found for coaching message. User might be logged out.");
            // Use default description but maybe log/notify differently?
            throw new Error("Auth token not found"); // Throw to be caught below
          }
          const response = await brain.generate_coaching_message({
            stress_level: currentStressLevel,
            // break_title: selectedBreak.title, // Removed - API selects break now
          });
          // { headers: { Authorization: `Bearer ${token}` } } // Pass token in headers - Handled by SDK now?
          const data = await response.json(); // Use generated client
          coachingMessage = data.message;
          console.log(`[AppStore] Received coaching message: ${coachingMessage}`);
        } catch (error) {
          console.error("[AppStore] Error fetching coaching message:", error);
          // Keep the default static description on error
        }

        set({
          breakSuggestionActive: true,
          currentBreakSuggestion: selectedBreak,
          dynamicCoachingMessage: coachingMessage, // Store the fetched or default message
          isFetchingCoachingMessage: false, // End loading
        });
        
        if (force) {
            console.log(`[AppStore FORCE] Showing break suggestion: ${selectedBreak.title} with message: ${coachingMessage}`);
        } else {
            console.log(`[AppStore] Conditions met, showing break suggestion: ${selectedBreak.title} with message: ${coachingMessage}`);
        }
        
      } else {
         // Optional: Log why it didn't show if needed for debugging
         // console.log("[AppStore] Conditions not met for break suggestion.");
      }
    },

    dismissBreakSuggestion: (cooldownMinutes = 5) => {
      console.log(`[AppStore] Dismissing break suggestion. Cooldown: ${cooldownMinutes} mins.`);
      set({
        breakSuggestionActive: false,
        currentBreakSuggestion: null, // Clear the suggestion
        dynamicCoachingMessage: null, // Clear dynamic message
        isFetchingCoachingMessage: false,
        // Set last break time to now to enforce a minimum cooldown
        lastBreakTimestamp: Date.now(), // Fixed from the incorrect formula with negative time
      });
    },

    recordBreakTaken: () => {
      console.log('[AppStore] Recording break taken.');
      set({ 
        breakSuggestionActive: false,
        currentBreakSuggestion: null, // Clear the suggestion
        dynamicCoachingMessage: null, // Clear dynamic message
        isFetchingCoachingMessage: false,
        lastBreakTimestamp: Date.now() 
      });
    },

    openChat: () => {
      console.log("[AppStore] Opening ORIGINAL chat (Sheet)"); // Clarified log
      set({ 
        isChatOpen: true,
        breakSuggestionActive: false, // Close break suggestion when chat opens
        currentBreakSuggestion: null,
        dynamicCoachingMessage: null,
        isFetchingCoachingMessage: false,
      });
    },

    closeChat: () => {
      console.log("[AppStore] Closing ORIGINAL chat (Sheet)"); // Clarified log
      set({ isChatOpen: false });
      // Optionally, re-trigger break logic or set a cooldown?
      // For now, just close.
    },

    // --- Companion Chat Actions (Sheet) ---
    openCompanionChat: () => {
      console.log("[AppStore] Opening COMPANION chat (Sheet)"); 
      set({ 
        isCompanionChatOpen: true,
        // Optionally close other modals/sheets if needed
        // isChatOpen: false, 
        // isFeedbackChatOpen: false,
      });
    },

    closeCompanionChat: () => {
      console.log("[AppStore] Closing COMPANION chat (Sheet)");
      set({ isCompanionChatOpen: false });
    },
    
    // --- Feedback Chat Actions (Dialog) ---
    openFeedbackChat: (initialMessage) => {
      console.log("[AppStore] Opening FEEDBACK chat (Dialog)"); // Specific log
      const initialHistory = initialMessage ? [initialMessage] : [];
      set({ 
        isFeedbackChatOpen: true, 
        feedbackChatHistory: initialHistory,
        isFeedbackLoading: false, // Reset loading state
        // Ensure break suggestion is closed if feedback opens
        breakSuggestionActive: false, 
        currentBreakSuggestion: null,
        dynamicCoachingMessage: null,
        isFetchingCoachingMessage: false,
      });
    },

    closeFeedbackChat: () => {
      console.log("[AppStore] Closing FEEDBACK chat (Dialog)"); // Specific log
      set({ 
        isFeedbackChatOpen: false, 
        feedbackChatHistory: [], // Clear history on close
        isFeedbackLoading: false 
      });
    },

    addFeedbackMessage: (message) => {
      set((state) => ({
        feedbackChatHistory: [...state.feedbackChatHistory, message],
      }));
    },

    setFeedbackLoading: (isLoading) => {
      set({ isFeedbackLoading: isLoading });
    }
    
    // ... other actions implementation
  },
}));

// Export actions separately for easier usage in components
export const useAppActions = () => useAppStore((state) => state.actions);
