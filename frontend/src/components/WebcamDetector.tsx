import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import brain from "brain";
import { AnalyzeFrameResponse } from "types"; // Assuming response type is in types.ts

// Define the structure for pose data passed to the parent
export interface PoseData {
  faceLandmarks: any[]; // Keep for structure, but will be empty
  stressLevel: number;
  isUserActive: boolean; // Based on face detection
}

interface Props {
  onPoseData: (data: PoseData) => void;
  width?: number | string;
  height?: number | string;
  captureIntervalMs?: number; // How often to capture and analyze (in milliseconds)
}

export function WebcamDetector({
  onPoseData,
  width = "100%",
  height = "auto",
  captureIntervalMs = 2000, // Default to analyzing every 2 seconds
}: Props) {
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleUserMedia = () => {
    console.log("User Media ready");
    setIsCameraReady(true);
  };

  const captureAndAnalyze = useCallback(async () => {
    if (webcamRef.current && isCameraReady) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        try {
          // console.log("Sending frame for analysis...");
          const response = await brain.analyze_frame({ imageData: imageSrc });
          if (response.ok) {
            const data: AnalyzeFrameResponse = await response.json();
            // console.log("Analysis Received:", data);
            onPoseData({
              faceLandmarks: [], // Landmarks are processed backend-only now
              stressLevel: data.stressLevel,
              isUserActive: data.faceDetected,
            });
          } else {
            console.error("Backend analysis failed:", response.status, await response.text());
            // Optionally pass error state up or handle locally
             onPoseData({ faceLandmarks: [], stressLevel: 0, isUserActive: false });
          }
        } catch (error) {
          console.error("Error calling backend analysis:", error);
          // Optionally pass error state up or handle locally
           onPoseData({ faceLandmarks: [], stressLevel: 0, isUserActive: false });
        }
      }
    }
  }, [isCameraReady, onPoseData]); // Dependencies for the callback

  // Effect to start/stop the analysis interval
  useEffect(() => {
    if (isCameraReady) {
      // Start interval
      intervalRef.current = setInterval(captureAndAnalyze, captureIntervalMs);
      console.log(`Started analysis interval (${captureIntervalMs}ms)`);
    } else {
      // Clear interval if camera becomes not ready
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        console.log("Stopped analysis interval");
      }
    }

    // Cleanup function to clear interval on component unmount or when camera becomes unavailable
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log("Cleaned up analysis interval");
      }
    };
  }, [isCameraReady, captureAndAnalyze, captureIntervalMs]); // Dependencies for the effect

  return (
    <div style={{ position: "relative", width, height }}>
      <Webcam
        ref={webcamRef}
        mirrored={true}
        screenshotFormat="image/jpeg"
        videoConstraints={{
          facingMode: "user",
        }}
        onUserMedia={handleUserMedia}
        onUserMediaError={(error) => {
          console.error("Webcam error:", error);
          setIsCameraReady(false);
        }}
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} // Ensure webcam fills the div
      />
      {!isCameraReady && (
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,0.5)", color: "white" }}>
          Waiting for camera...
        </div>
      )}
    </div>
  );
}
