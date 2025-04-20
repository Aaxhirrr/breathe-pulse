import { Input } from "@/components/ui/input";

import { SendHorizontal } from 'lucide-react';
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from 'react-router-dom'; // Import useNavigate
import { WebcamDetector } from "components/WebcamDetector";
import { StressWidget } from "components/StressWidget";
import { useAppStore, useAppActions } from "utils/useAppStore"; // Import store

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { AlertCircle } from 'lucide-react'; // Import an icon
import { BreathingExercise } from "components/BreathingExercise";
import { PostureCalibrationDialog } from "components/PostureCalibrationDialog"; // Import calibration dialog
import { StretchingExercise } from "components/StretchingExercise"; // Import stretching dialog
import { PuzzleBreak } from "../components/PuzzleBreak"; // Import the new puzzle component
import { ChatWithCoach } from "../components/ChatWithCoach"; // Import Chat component (placeholder for now)
import { Camera } from "lucide-react"; // Using lucide-react for icons
import { FeedbackChatDialog } from "components/FeedbackChatDialog"; // Import the feedback dialog
import { BreakSelectionDialog, BreakChoice } from "components/BreakSelectionDialog"; // Import the new selection dialog
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"; // Import Dialog components for Puzzle
// Import Sheet components
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { useCurrentUser } from "app"; // Added for auth status

export default function App() {
  const navigate = useNavigate();
  const { user, loading } = useCurrentUser(); // Added: Get user status

  // Handler for the auth button // Added
  const handleAuthClick = () => { // Added
    if (user) { // Added
      navigate("/logout"); // Added
    } else { // Added
      navigate("/login"); // Added
    } // Added
  }; // Added

  // Define actions FIRST
  const actions = useAppActions();

  // Add state for the "Talk To Me" input
  const [breakChatMessage, setBreakChatMessage] = useState("");
  const [isSendingBreakMessage, setIsSendingBreakMessage] = useState(false); // Add loading state

  // Define handlePoseData using actions
  const handlePoseData = useCallback((data: PoseData) => {
    actions.updateMetricsFromCV(data.stressLevel, data.isUserActive);
  }, [actions]);

  // Now get state from the store selector
  const {
    currentStressLevel,
    lastBreakTimestamp,
    breakSuggestionActive,
    currentBreakSuggestion,
    dynamicCoachingMessage,
    isFetchingCoachingMessage,
    isChatOpen,
    isCompanionChatOpen // Destructure the companion state
  } = useAppStore((state) => ({
      currentStressLevel: state.currentStressLevel,
      lastBreakTimestamp: state.lastBreakTimestamp,
      breakSuggestionActive: state.breakSuggestionActive,
      currentBreakSuggestion: state.currentBreakSuggestion,
      dynamicCoachingMessage: state.dynamicCoachingMessage,
      isFetchingCoachingMessage: state.isFetchingCoachingMessage,
      isChatOpen: state.isChatOpen,
    isCompanionChatOpen: state.isCompanionChatOpen // Get companion chat state
  }));

  const { 
    showBreakSuggestion, 
    recordBreakTaken, 
    dismissBreakSuggestion, 
    openChat, 
    closeChat, 
    openFeedbackChat,
    openCompanionChat, // Add companion actions
    closeCompanionChat // Add companion actions
  } = actions;

  // Constants can be defined here or imported
  // const STRESS_THRESHOLD = 70; // Logic moved to store action
  // const MIN_BREAK_INTERVAL_MS = 15 * 60 * 1000; // Logic moved to store action

  // Handler for sending the break chat message
const handleSendBreakMessage = async () => {
  const messageToSend = breakChatMessage.trim();
  if (!messageToSend || isSendingBreakMessage) return;

  setIsSendingBreakMessage(true);
  setBreakChatMessage(""); // Clear input immediately

  console.log("[App.tsx] Sending break chat message:", messageToSend);
  // TODO: Implement API call logic here
  // Likely call brain.chat_with_coach or a similar endpoint,
  // passing messageToSend and maybe context about the current break.
  // Need to handle the response (e.g., update dynamicCoachingMessage or add to a message list)

  // Simulate API call for now
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log("[App.tsx] (Simulated) API call finished.");

  // Example: Update coaching message with a placeholder response
  // actions.updateDynamicCoachingMessage(`You said: \"${messageToSend}\". I'll respond properly soon!`);


  setIsSendingBreakMessage(false);
};

// Handle Enter key press
const handleBreakChatKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (event.key === 'Enter' && !isSendingBreakMessage) {
    handleSendBreakMessage();
  }
};

// Effect to trigger break check when stress changes
  useEffect(() => {
    // The logic to check thresholds/timing is INSIDE the showBreakSuggestion action now.
    // We just need to trigger the check when the relevant state changes.
    // console.log(`[App.tsx] Triggering break suggestion check due to stress change: ${currentStressLevel.toFixed(1)}`);
    actions.showBreakSuggestion();
  }, [currentStressLevel, actions]); // Depend on stress level and the actions object

  // --- Handlers ---
  const handleToggleWebcam = () => {
      // ... (existing webcam logic)
  };

  const handleFaceDetection = (detected: boolean) => {
      // ... (existing face detection logic)
  };

  const handleStartBreak = () => { 
    // console.log("[App.tsx] handleStartBreak triggered."); // Keep commented for now
    recordBreakTaken(); // Record break time, hide notification
    setIsBreathingExerciseOpen(true); // Open the breathing exercise dialog
    // console.log("[App.tsx] setIsBreathingExerciseOpen(true) called."); // Keep commented for now
  };

  const handleBreathingClose = (completed: boolean) => {
    setIsBreathingExerciseOpen(false); // Close the dialog
    // Keep this log for now, it might be useful
    console.log(`[App.tsx] Breathing exercise ${completed ? 'completed' : 'skipped'}.`); 
    // Optionally add further logic based on completion status
  };

  const handleOpenCalibration = () => {
    setIsCalibrationDialogOpen(true);
  };

  const handleCalibrationClose = () => {
    setIsCalibrationDialogOpen(false);
  };

  const handleOpenStretching = () => {
    setIsStretchingExerciseOpen(true);
  };

  const handleStretchingClose = (completed: boolean) => {
    setIsStretchingExerciseOpen(false);
    console.log(`Stretching exercise ${completed ? 'completed' : 'skipped'}.`);
  };
const [permissionStatus, setPermissionStatus] = useState<"idle" | "pending" | "granted" | "denied">("idle");
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [isBreathingExerciseOpen, setIsBreathingExerciseOpen] = useState(false); // State for breathing dialog
  const [isCalibrationDialogOpen, setIsCalibrationDialogOpen] = useState(false); // State for calibration dialog
  const [isStretchingExerciseOpen, setIsStretchingExerciseOpen] = useState(false); // State for stretching dialog
  const [isBreakSelectionOpen, setIsBreakSelectionOpen] = useState(false); // State for break selection UI
  const [isPuzzleBreakOpen, setIsPuzzleBreakOpen] = useState(false); // State for puzzle dialog

  // Handler for closing the break selection dialog
  const handleCloseBreakSelection = () => {
    setIsBreakSelectionOpen(false);
  };

  // Handler for when a break type is selected
  const handleSelectBreak = (choice: BreakChoice) => {
    console.log(`[App.tsx] Break selected: ${choice}`);
    // TODO: Trigger the actual break component based on the choice
    // For now, just close the selection dialog
    handleCloseBreakSelection(); 
    if (choice === 'breathing') {
      setIsBreathingExerciseOpen(true);
    } else if (choice === 'stretching') {
      setIsStretchingExerciseOpen(true);
    } else if (choice === 'puzzle') {
      // Need a way to show the puzzle break - maybe another dialog/modal?
      // For now, just log it.
      console.log("Puzzle break selected - showing puzzle directly is TBD");
      // Let's temporarily reuse the breathing dialog state to show *something*
      // This needs refinement.
      // setIsBreathingExerciseOpen(true); // Placeholder - REMOVE LATER
      setIsPuzzleBreakOpen(true); // Open the puzzle dialog
    } 
  };

  // Handler for closing the puzzle break dialog
  const handlePuzzleClose = () => {
    setIsPuzzleBreakOpen(false);
    // We might want to record completion/skip status here later
    console.log("[App.tsx] Puzzle dialog closed."); 
  };

  // <<< REMOVED: Log state changes >>>
  // useEffect(() => {
  //   console.log(`[App.tsx] isBreathingExerciseOpen state changed to: ${isBreathingExerciseOpen}`);
  // }, [isBreathingExerciseOpen]);

  const requestCameraPermission = useCallback(async () => {
    setPermissionStatus("pending");
    try {
      // Request permission
      await navigator.mediaDevices.getUserMedia({ video: true });
      console.log("Camera permission granted");
      setPermissionStatus("granted");
      // TODO: Navigate to next step or activate camera view in a later task
    } catch (error) {
      console.error("Camera permission denied:", error);
      setPermissionStatus("denied");
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-100 via-indigo-50 to-teal-50 dark:from-indigo-900 dark:via-purple-950 dark:to-teal-950 p-4 relative">
      {/* Login/Logout Button - Added */} 
      {!loading && user && ( // Show Logout and Profile when logged in
        <div className="absolute bottom-4 left-4 z-10 flex gap-2"> {/* Container for buttons */}
          <Button
            variant="outline"
            onClick={handleAuthClick} // Assumes handleAuthClick handles logout when user exists
          >
            Logout
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/Profile')} // Navigate to Profile page
          >
            Profile
          </Button>
        </div>
      )}
      {!loading && !user && ( // Show Login when logged out
         <Button
          onClick={handleAuthClick} // Assumes handleAuthClick handles login when user doesn't exist
          variant="outline"
          className="absolute bottom-4 left-4 z-10"
        >
          Login
        </Button>
      )} 

      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold font-poppins bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text">
            BreathePulse
          </CardTitle>
          <CardDescription className="text-muted-foreground font-inter pt-2">
            Your emotion-aware microbreak coach.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6 p-8">
          {/* Temporary Test Button */} 
          <Button 
            variant="secondary"
            size="sm"
            onClick={() => { 
              console.log('[TEST BUTTON] Clicked');
              actions.showBreakSuggestion(true); // Pass true to force suggestion
            }}
            className="absolute top-2 right-2"
          >
            Trigger Break (Test)
          </Button>
          {/* End Temporary Test Button */}

          <p className="font-inter text-foreground/80">
            Feeling stressed or strained? BreathePulse subtly monitors your cues and suggests personalized microbreaks to help you reset and refocus.
          </p>
          
          {permissionStatus === "idle" && (
             <Button 
               onClick={requestCameraPermission}
               className="w-full font-poppins font-semibold"
             >
               <Camera className="mr-2 h-4 w-4" /> Get Started
             </Button>
          )}

          {permissionStatus === "pending" && (
            <p className="font-inter text-sm text-muted-foreground animate-pulse">Requesting camera access...</p>
          )}

          {/* If permission is granted, show the WebcamDetector and a button to calibrate */}
          {permissionStatus === "granted" && (
            <div className="flex flex-col items-center space-y-4">
              {/* Render the widget once camera is active */}
              <StressWidget /> 
              <WebcamDetector 
                onFaceDetected={() => console.log("Face detected callback triggered")}
                onNoFace={() => console.log("No face callback triggered")}
                onError={(message) => console.error("Webcam error:", message)}
                onPoseData={handlePoseData}
              />
              <Button onClick={() => navigate('/Calibration')}>Proceed to Calibration</Button>
              <Button onClick={handleOpenCalibration} variant="secondary" className="ml-2">Calibrate Posture</Button> {/* Temp Trigger */}
              {/* Replace Stretching button with Companion navigation */}
              {/* Change Companion navigation to open Sheet */}
              <Button onClick={() => navigate('/Companion')} variant="outline" className="ml-2">My Companion</Button>
            </div>
          )}

          {permissionStatus === "denied" && (
            <div className="space-y-2">
              <p className="font-inter text-sm text-destructive">Camera access denied.</p>
              <p className="font-inter text-xs text-muted-foreground">
                BreathePulse needs camera access to detect stress cues. Please enable it in your browser settings.
              </p>
              <Button 
                 onClick={requestCameraPermission} 
                 variant="outline"
                 size="sm"
                 className="font-poppins"
               > 
                 Retry Permission
               </Button>
            </div>
          )}
          
        </CardContent>
      </Card>

      {/* Break Suggestion Alert - Fixed at bottom */}
      {breakSuggestionActive && (
        <Alert className="fixed bottom-4 right-4 w-auto max-w-sm z-50 shadow-lg bg-background/90 backdrop-blur-sm">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{currentBreakSuggestion?.title ?? "Time for a break?"}</AlertTitle>
          <AlertDescription asChild className="mt-2">{/* Use asChild to allow PuzzleBreak to replace content */}
            <div> {/* Wrap content to allow conditional rendering */} 
              {/* Removed direct puzzle display - handled by selection UI */}
              {false ? (
                <PuzzleBreak />
              ) : (
                <>
                  {/* Show loading or dynamic/static message */}
                  {isFetchingCoachingMessage ? (
                    <p className="text-sm text-muted-foreground animate-pulse">Generating suggestion...</p>
                  ) : (
                    <>
                                        <p className="mb-3">{dynamicCoachingMessage || currentBreakSuggestion?.description || "A quick pause might help recharge."}</p>

</>
                  )}
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        actions.dismissBreakSuggestion(5); // Dismiss first
                        actions.openFeedbackChat({ // Then open feedback
                          role: 'assistant', 
                          content: 'Okay, break skipped. Was there anything about the suggestion you disliked, or was the timing just off?' 
                        }); 
                      }} 
                    >
                      Dismiss
                    </Button>

                    <Button 
                      variant="default"
                      size="sm"
                      onClick={() => {
                        dismissBreakSuggestion(); // Dismiss the alert first
                        setIsBreakSelectionOpen(true); // Open the selection UI (to be built in MYA-40)
                        console.log('[App.tsx] Take Break button clicked - should open selection UI');
                      }}
                    >
                      Take Break
                    </Button>
                  </div>
                </>
              )}
              {/* Removed separate puzzle dismiss logic */}
              {false && (
                 <div className="flex justify-end space-x-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                          dismissBreakSuggestion(5); // Dismiss first
                          openFeedbackChat({ // Then open feedback
                            role: 'assistant',
                            content: 'Okay, puzzle skipped. Any particular reason, or just not feeling it?'
                          });
                      }} 
                    >
                      Dismiss
                    </Button>
                    {/* Submit/Skip buttons are inside PuzzleBreak component */} 
                  </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Chat Sheet */}
      <Sheet open={isChatOpen} onOpenChange={(open) => !open && actions.closeChat()}> 
        <SheetContent className="flex flex-col"> {/* Use flex column */} 
          <SheetHeader>
            <SheetTitle>Feeling Stressed?</SheetTitle>
            <SheetDescription>
              Talk things through. Sometimes just expressing yourself helps.
            </SheetDescription>
          </SheetHeader>
          {/* Chat component will go here, taking up remaining space */}
          <div className="flex-grow overflow-y-auto"> {/* Make chat area scrollable */} 
             <ChatWithCoach /> {/* Render the chat component */} 
          </div>
          {/* Footer might not be needed if input is part of ChatWithCoach */}
          {/* <SheetFooter>
            <SheetClose asChild>
              <Button type="button">Close</Button> 
            </SheetClose>
          </SheetFooter> */} 
        </SheetContent>
      </Sheet>

      {/* Posture Calibration Modal */}
      <PostureCalibrationDialog 
        isOpen={isCalibrationDialogOpen}
        onClose={handleCalibrationClose}
      />

      {/* Stretching Exercise Modal */}
      <StretchingExercise
        isOpen={isStretchingExerciseOpen}
        onClose={handleStretchingClose}
      />

      {/* Breathing Exercise Modal */}
      <BreathingExercise 
        isOpen={isBreathingExerciseOpen} 
        onClose={handleBreathingClose} 
        // durationSeconds={60} // Can customize duration if needed
      />

      {/* Feedback Chat Dialog (rendered but hidden until triggered) */}
      <FeedbackChatDialog />

      {/* Break Selection Dialog */}
      <BreakSelectionDialog 
        isOpen={isBreakSelectionOpen}
        onClose={handleCloseBreakSelection}
        onSelectBreak={handleSelectBreak}
      />

      {/* Puzzle Break Dialog */}
      <Dialog open={isPuzzleBreakOpen} onOpenChange={(open) => !open && handlePuzzleClose()}>
        <DialogContent className="sm:max-w-[380px]"> {/* Slightly smaller width for puzzle */}
          <DialogHeader>
            <DialogTitle>Quick Puzzle</DialogTitle>
            <DialogDescription>
              A short mental exercise.
            </DialogDescription>
          </DialogHeader>
          {/* Render the actual puzzle component */}
          <PuzzleBreak />
          {/* PuzzleBreak component has its own internal submit/skip logic */}
          {/* We might not need an explicit footer button here if PuzzleBreak handles closure */}
          {/* Example close button if needed: */}
          {/* <DialogFooter>
            <Button variant="outline" onClick={handlePuzzleClose}>Close</Button>
          </DialogFooter> */} 
        </DialogContent>
      </Dialog>

      {/* Companion Chat Sheet (triggered by My Companion button) */}
      <Sheet open={isCompanionChatOpen} onOpenChange={(open) => !open && actions.closeCompanionChat()}> 
        <SheetContent className="flex flex-col sm:max-w-lg"> {/* Adjust width if needed */} 
          <SheetHeader>
            <SheetTitle>Chat with Your Companion</SheetTitle>
            <SheetDescription>
              Discuss your habits, mood, or anything on your mind.
            </SheetDescription>
          </SheetHeader>
          {/* Chat component takes up remaining space */} 
          <div className="flex-grow overflow-y-auto py-4"> {/* Add padding and scroll */} 
             <ChatWithCoach /> {/* Render the chat component */} 
          </div>
        </SheetContent>
      </Sheet>

    </div>
  );
}