import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WebcamDetector } from "components/WebcamDetector"; // Import WebcamDetector
import { PoseData } from "utils/PoseData"; // Import PoseData type if needed

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const PostureCalibrationDialog: React.FC<Props> = ({ isOpen, onClose }) => {
  const handleCapture = () => {
    console.log("Posture captured (placeholder) - Saving flag to localStorage.");
    
    // Placeholder: Save a simple flag to localStorage to indicate completion
    try {
      localStorage.setItem('postureCalibrationComplete', 'true');
      console.log("'postureCalibrationComplete' flag set in localStorage.");
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }

    // TODO: Implement actual capture logic using pose data received in handlePoseData
    
    onClose(); // Close dialog after capture
  };

  const handlePoseData = (data: PoseData | null) => {
    // TODO: Store or process pose data when calibration happens
    // console.log("Pose data received in dialog:", data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Posture Calibration</DialogTitle>
          <DialogDescription>
            Sit comfortably upright in your chair, facing the camera directly.
            When you're ready and holding your ideal posture, click "Capture Posture".
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {/* Integrate WebcamDetector */}
          <WebcamDetector 
            onPoseData={handlePoseData} 
            width={380} // Adjust width as needed for the dialog
            height={285} // Adjust height as needed
            showStressIndicator={false} // Don't need the stress indicator here
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCapture}>Capture Posture</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
