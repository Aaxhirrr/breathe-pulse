import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // We might not use Trigger directly if opened programmatically
  DialogClose, // For closing manually
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion"; // For animations later
import { useAppActions } from "../utils/useAppStore"; // Import actions

// Define animation variants outside the component for clarity
const variants = {
  circle: {
    inhale: {
        scale: 1.1,
        backgroundImage: "radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(56, 189, 248, 0) 70%)", 
        borderColor: "rgba(2, 132, 199, 0.6)",
        boxShadow: "0 0 20px 6px rgba(56, 189, 248, 0.25)",
        transition: { duration: 4, ease: [0.42, 0, 0.58, 1] } 
    },
    hold: {
        scale: 1.1,
        backgroundImage: "radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, rgba(168, 85, 247, 0) 70%)", 
        borderColor: "rgba(126, 34, 206, 0.7)",
        boxShadow: "0 0 25px 8px rgba(168, 85, 247, 0.3)",
        transition: { duration: 4, ease: "linear" }
    },
    exhale: {
        scale: 0.95,
        backgroundImage: "radial-gradient(circle, rgba(52, 211, 153, 0.4) 0%, rgba(52, 211, 153, 0) 70%)",
        borderColor: "rgba(5, 150, 105, 0.5)",
        boxShadow: "0 0 15px 4px rgba(52, 211, 153, 0.2)",
        transition: { duration: 6, ease: [0.42, 0, 0.58, 1] }
    },
  },
  ripple: {
    inhale: {
      scale: [1, 1.3], // Scale up slightly more
      opacity: [0.3, 0], // Fade out completely
      borderColor: "rgba(2, 132, 199, 0.4)", // Lighter ripple border
      transition: { duration: 4, ease: "easeOut", delay: 0.2 } // Slight delay
    },
    hold: {
      scale: 1.3, // Maintain ripple size
      opacity: 0, // Keep faded out
      borderColor: "rgba(126, 34, 206, 0.5)", 
      transition: { duration: 4, ease: "linear" }
    },
    exhale: {
      scale: 1, // Reset scale
      opacity: 0, // Stay faded out
      borderColor: "rgba(5, 150, 105, 0.3)", 
      transition: { duration: 6, ease: "easeIn" }
    }
  }
};

interface BreathingExerciseProps {
  isOpen: boolean; // Control visibility from parent
  onClose: (completed: boolean) => void; // Callback when closed (true if completed, false if skipped)
  durationSeconds?: number; // Default duration
}

export const BreathingExercise: React.FC<BreathingExerciseProps> = ({
  isOpen,
  onClose,
  durationSeconds = 60,
}) => {
  // <<< REMOVED: Log component mount/render >>>
  // console.log(`[BreathingExercise] Rendering. isOpen: ${isOpen}`);
  // State for timer and breathing animation
  const [remainingTime, setRemainingTime] = useState(durationSeconds);
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref for timer interval
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Ref for phase timeout
  const audioRef = useRef<HTMLAudioElement>(null); // Ref for the audio element

  const { openFeedbackChat } = useAppActions(); // Get the action

  useEffect(() => {
    // Clear any existing interval when isOpen or duration changes
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isOpen) {
      // Reset timer state when opened
      setRemainingTime(durationSeconds);
      
      // Start the countdown interval
      intervalRef.current = setInterval(() => {
        setRemainingTime((prevTime) => {
          if (prevTime <= 1) {
            // Timer finished
            if (intervalRef.current) clearInterval(intervalRef.current);
            handleComplete(); // Auto-complete when timer hits 0
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

    } else {
       // Ensure timer stops if component is closed externally
       setRemainingTime(durationSeconds); // Reset for next open
    }

    // Cleanup function to clear interval on unmount or when deps change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, durationSeconds]); // Rerun effect if dialog is opened/closed or duration changes

  // Effect for Breathing Animation Cycle (4s inhale, 4s hold, 6s exhale = 14s cycle)
  useEffect(() => {
    const clearPhaseTimeout = () => {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
        phaseTimeoutRef.current = null;
      }
    };

    const cyclePhase = () => {
      clearPhaseTimeout(); // Clear previous timeout before setting a new one

      setBreathingPhase(currentPhase => {
        let nextPhase: "inhale" | "hold" | "exhale";
        let durationMs: number;

        switch (currentPhase) {
          case "inhale":
            nextPhase = "hold";
            durationMs = 4000; // 4s hold
            break;
          case "hold":
            nextPhase = "exhale";
            durationMs = 6000; // 6s exhale
            break;
          case "exhale":
          default:
            nextPhase = "inhale";
            durationMs = 4000; // 4s inhale
            break;
        }
        
        phaseTimeoutRef.current = setTimeout(() => {
            setBreathingPhase(nextPhase);
            cyclePhase(); // Schedule the next phase change
        }, durationMs);

        return currentPhase; // Return current phase for initial set state call (won't actually change here)
      });
    };

    if (isOpen) {
        // Start the cycle when the dialog opens
        setBreathingPhase("inhale"); // Start with inhale
        // Use a short delay before starting the first cycle to allow rendering
        phaseTimeoutRef.current = setTimeout(cyclePhase, 100); 
    } else {
        // Clear timeout if the dialog is closed
        clearPhaseTimeout();
    }

    // Cleanup function
    return clearPhaseTimeout;

  }, [isOpen]);

  // Effect to control audio playback based on dialog visibility
  useEffect(() => {
    const audioElement = audioRef.current;

    // Ensure we have the audio element before proceeding
    if (!audioElement) {
        console.log("[Audio] Audio element ref not ready yet.");
        return;
    }

    if (isOpen) {
        console.log("[Audio] Component is open. Attempting to play...");
        // Reset time and set volume
        audioElement.currentTime = 0;
        audioElement.volume = 0.6;

        // Attempt to play
        const playPromise = audioElement.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("[Audio] Playback started successfully.");
            }).catch(error => {
                console.warn(`[Audio] Autoplay failed: ${error.name} - ${error.message}. Browser might require interaction first.`);
            });
        } else {
           console.warn("[Audio] audioElement.play() did not return a promise.");
        }

    } else {
        // If the component is not open, ensure audio is paused
        if (!audioElement.paused) {
            console.log("[Audio] Component closed or closing. Pausing playback.");
            audioElement.pause();
        }
    }

    // Cleanup function: Pause audio if it's playing when the effect re-runs or component unmounts
    return () => {
        // Check the ref again inside cleanup as it might have changed
        const currentAudioElement = audioRef.current; 
        if (currentAudioElement && !currentAudioElement.paused) {
            console.log("[Audio] Cleanup: Pausing playback.");
            currentAudioElement.pause();
        }
    };
    // Dependencies: Run when isOpen changes OR when the audioRef itself changes (becomes available)
  }, [isOpen, audioRef.current]);

  const handleSkip = () => {
    console.log("[BreathingExercise] Skipped");
    audioRef.current?.pause(); // Stop audio on skip
    onClose(false); // Pass false for skipped
    // Trigger feedback chat
    openFeedbackChat({ 
      role: 'assistant', 
      content: 'Breathing exercise skipped. Any feedback on why?' 
    });
  };

  const handleComplete = () => {
    console.log("[BreathingExercise] Completed");
    audioRef.current?.pause(); // Stop audio on complete
    onClose(true); // Pass true for completed
    // Trigger feedback chat
    openFeedbackChat({ 
      role: 'assistant', 
      content: 'Nice work completing the breathing exercise! How did it feel?' 
    });
    // TODO: Handle completion logic (e.g., if timer finishes)
  };

  // Note: We use controlled dialog via `open` prop, so Trigger isn't needed here
  // The parent component will control the `isOpen` state.
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}> {/* If closed via overlay click etc., consider it skipped */}
      <DialogContent 
        className="sm:max-w-[90vw] sm:max-h-[90vh] w-[90vw] h-[90vh] flex flex-col items-center justify-between p-8 bg-background/95 backdrop-blur-sm border-none shadow-2xl rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()} // Prevent closing on outside click initially
        hideCloseButton={true} // Hide default 'X' button
      >
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl font-light">Take a Moment to Breathe</DialogTitle>
          {/* Placeholder for timer */}
          <div className="text-lg text-muted-foreground mt-2">
            {Math.floor(remainingTime / 60)}:{String(remainingTime % 60).padStart(2, '0')}
          </div>
        </DialogHeader>
        
        {/* Hidden Audio Player */}
        <audio ref={audioRef} src="https://static.databutton.com/public/a50808a5-1909-4ef0-aaf3-d4b23ec5b49d/music3.mp3" loop preload="auto" />

        {/* Breathing Animation */}
        <div className="flex-grow flex flex-col items-center justify-center w-full">
           {/* Enhanced Animated Circle - Dimmer Gradients & Ripple */}
           <motion.div
                className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-full flex items-center justify-center border-2 shadow-lg overflow-hidden" // Ensure overflow is hidden for ripples
                variants={variants.circle} // Use defined variants
                initial="exhale"
                animate={breathingPhase}
                style={{ backgroundColor: 'transparent' }} // Ensure no solid background interferes
            >
                 {/* Ripple Effect Background Circle */}
                <motion.div 
                    className="absolute inset-0 rounded-full border" // Positioned behind, same size initially
                    variants={variants.ripple} // Use ripple variants
                    initial="exhale"
                    animate={breathingPhase}
                    style={{ backgroundColor: 'transparent' }}
                />
                
                {/* Instruction Text (ensure it's above the ripple) */}
                <motion.span
                    key={breathingPhase}
                    className="relative z-10 text-xl sm:text-2xl text-foreground/80 font-light" // Added relative z-10
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {breathingPhase === 'inhale' && "Breathe In"}
                    {breathingPhase === 'hold' && "Hold"}
                    {breathingPhase === 'exhale' && "Breathe Out"}
                </motion.span>
           </motion.div>
        </div>

        <DialogFooter className="sm:justify-center w-full">
            {/* We use DialogClose potentially for programmatic closing, but buttons trigger onClose callback */}
             <Button type="button" variant="ghost" onClick={handleSkip}>
               Skip
            </Button>
            {/* Complete button might be shown only at the end, or act as 'End Early' */}
             <Button type="button" variant="default" onClick={handleComplete}>
               Complete
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
