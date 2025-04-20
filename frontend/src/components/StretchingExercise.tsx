import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppActions } from "../utils/useAppStore"; // Import actions

// Define the structure for a single stretch
interface Stretch {
  id: number;
  name: string;
  description: string;
  duration: number; // seconds
  imageUrl: string; // Placeholder image URL
}

// Define the list of stretches
const stretches: Stretch[] = [
  {
    id: 1,
    name: "Neck Tilt (Right)",
    description: "Gently tilt your head towards your right shoulder, feeling the stretch on the left side of your neck. Hold.",
    duration: 20,
    imageUrl: "https://via.placeholder.com/300x200.png?text=Neck+Tilt+Right", // Placeholder
  },
  {
    id: 2,
    name: "Neck Tilt (Left)",
    description: "Gently tilt your head towards your left shoulder, feeling the stretch on the right side of your neck. Hold.",
    duration: 20,
    imageUrl: "https://via.placeholder.com/300x200.png?text=Neck+Tilt+Left", // Placeholder
  },
  {
    id: 3,
    name: "Shoulder Rolls",
    description: "Roll your shoulders forwards in a circular motion for half the time, then backwards for the remaining time.",
    duration: 30,
    imageUrl: "https://via.placeholder.com/300x200.png?text=Shoulder+Rolls", // Placeholder
  },
];

interface Props {
  isOpen: boolean;
  onClose: (completed: boolean) => void;
}

export const StretchingExercise: React.FC<Props> = ({ isOpen, onClose }) => {
  const [currentStretchIndex, setCurrentStretchIndex] = useState(0);
  const [currentStretchDuration, setCurrentStretchDuration] = useState(stretches[0].duration);
  const [timeLeft, setTimeLeft] = useState(stretches[0].duration);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { openFeedbackChat } = useAppActions(); // Get action

  const currentStretch = stretches[currentStretchIndex];
  const totalStretches = stretches.length;

  // Function to clear the timer interval
  const clearTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  // Function to start the timer for the current stretch
  const startTimer = (index: number) => {
    clearTimer();
    const duration = stretches[index].duration;
    setCurrentStretchDuration(duration);
    setTimeLeft(duration);
    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);
  };

  // --- Timer and State Management Effect ---
  useEffect(() => {
    if (isOpen) {
      // Start timer for the initial stretch when opened
      startTimer(currentStretchIndex);
    } else {
      // Reset state when closed
      clearTimer();
      setCurrentStretchIndex(0);
      setTimeLeft(stretches[0].duration);
      setCurrentStretchDuration(stretches[0].duration);
    }

    // Cleanup on unmount or when closing
    return () => {
      clearTimer();
    };
  }, [isOpen]); // Rerun only when isOpen changes

  // --- Effect to handle timer reaching zero ---
  useEffect(() => {
    if (timeLeft <= 0 && timerIntervalRef.current) {
      clearTimer(); // Stop the current timer
      if (currentStretchIndex < totalStretches - 1) {
        // Move to next stretch
        handleNext();
      } else {
        // Last stretch finished
        handleFinish();
      }
    }
  }, [timeLeft]); // Rerun when timeLeft changes

  // --- Handlers ---
  const handleNext = () => {
    if (currentStretchIndex < totalStretches - 1) {
      const nextIndex = currentStretchIndex + 1;
      setCurrentStretchIndex(nextIndex);
      startTimer(nextIndex); // Start timer for the new stretch
    } else {
      handleFinish(); // If already on last, finish
    }
  };

  const handlePrevious = () => {
    if (currentStretchIndex > 0) {
      const prevIndex = currentStretchIndex - 1;
      setCurrentStretchIndex(prevIndex);
      startTimer(prevIndex); // Start timer for the new stretch
    }
  };

  const handleFinish = () => {
    clearTimer();
    onClose(true); // Indicate completion
    // Trigger feedback chat
    openFeedbackChat({ 
      role: 'assistant', 
      content: 'Great job completing the stretches! Feeling looser?' 
    });
  };

  const handleSkip = () => {
    clearTimer();
    onClose(false); // Indicate skipped
    // Trigger feedback chat
    openFeedbackChat({ 
      role: 'assistant', 
      content: 'Stretching break skipped. Any specific reason or preference?' 
    });
  };

  // Calculate progress within the current stretch
  const progressValue = currentStretchDuration > 0
      ? ((currentStretchDuration - timeLeft) / currentStretchDuration) * 100
      : 0;

  // Prevent rendering if not open (or handle initial state better)
  if (!isOpen) {
      return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleSkip()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Stretch Break ({currentStretchIndex + 1}/{totalStretches})</DialogTitle>
          <DialogDescription>{currentStretch.name}</DialogDescription>
        </DialogHeader>
        
        <div className="my-4 flex flex-col items-center space-y-4">
          <img 
            src={currentStretch.imageUrl}
            alt={currentStretch.name}
            className="rounded-md object-cover w-full h-48 bg-gray-200"
          />
          <p className="text-sm text-center px-4">{currentStretch.description}</p>
          
          {/* Timer Display Placeholder */}
          <div className="text-4xl font-bold">
            {timeLeft}s
          </div>

          {/* Progress Bar for current stretch */}
          <Progress value={progressValue} className="w-[80%]" />
        </div>

        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
            {currentStretchIndex > 0 ? (
                <Button variant="outline" onClick={handlePrevious}>Previous</Button>
            ) : (
                <Button variant="outline" onClick={handleSkip}>Skip Break</Button> // Show skip on first stretch
            )}

            {currentStretchIndex < totalStretches - 1 ? (
                <Button onClick={handleNext}>Next</Button>
            ) : (
                <Button onClick={handleFinish}>Finish</Button> // Show finish on last stretch
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
