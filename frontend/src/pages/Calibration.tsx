import React from 'react';
import { PostureCalibration } from 'components/PostureCalibration';

/**
 * Page dedicated to the posture calibration process.
 */
export default function CalibrationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
       {/* Add any page-specific layout or titles here if needed */}
       <PostureCalibration />
    </div>
  );
}
