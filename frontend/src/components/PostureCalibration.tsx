import React, { useState, useEffect, useRef } from 'react';
import { WebcamDetector } from 'components/WebcamDetector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Info } from 'lucide-react';

type CalibrationStep = 'initial' | 'positioning' | 'holding' | 'capturing' | 'complete' | 'error';

const CALIBRATION_HOLD_DURATION = 30; // seconds

export const PostureCalibration: React.FC = () => {
  const [step, setStep] = useState<CalibrationStep>('initial');
  const [countdown, setCountdown] = useState<number>(CALIBRATION_HOLD_DURATION);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPositioning = () => {
    setStep('positioning');
    // Give user a moment before starting the hold countdown
    setTimeout(() => {
      setStep('holding');
    }, 3000); // 3 seconds to get ready
  };

  useEffect(() => {
    if (step === 'holding') {
      setCountdown(CALIBRATION_HOLD_DURATION);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!); // Stop timer
            setStep('capturing');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step]);

  useEffect(() => {
    if (step === 'capturing') {
      // Simulate capturing data
      console.log('Capturing reference posture...');
      // TODO: Add actual pose estimation data capture here
      // Example: const poseData = await capturePose(webcamRef.current.video);

      try {
        const calibrationData = {
          calibrationComplete: true,
          timestamp: new Date().toISOString(),
          // TODO: Add actual captured pose data here
          // poseData: poseData 
        };
        localStorage.setItem('breathepulse_calibration', JSON.stringify(calibrationData));
        console.log('Calibration data placeholder saved to localStorage.');
        setStep('complete');
      } catch (error) {
        console.error('Failed to save calibration data to localStorage:', error);
        setStep('error');
      }
    }
  }, [step]);

  const handleWebcamError = (message: string) => {
     console.error("Calibration webcam error:", message);
     setStep('error');
  }

  const renderContent = () => {
    switch (step) {
      case 'initial':
        return (
          <div className="text-center space-y-4">
            <CardTitle>Posture Calibration</CardTitle>
            <CardDescription>Let's set your ideal sitting posture as a baseline.</CardDescription>
            <p className="text-sm text-muted-foreground">We'll guide you to sit correctly and hold the position for {CALIBRATION_HOLD_DURATION} seconds.</p>
            <Button onClick={startPositioning}>Start Calibration</Button>
          </div>
        );
      case 'positioning':
        return (
          <div className="text-center space-y-2">
            <p className="font-semibold">Get Ready!</p>
            <p className="text-sm text-muted-foreground">Sit up straight, shoulders relaxed, feet flat, looking forward.</p>
            <p className="text-sm text-blue-500 animate-pulse">Starting countdown soon...</p>
          </div>
        );
      case 'holding':
        return (
          <div className="text-center space-y-2">
            <p className="font-semibold">Hold Still...</p>
            <p className="text-sm text-muted-foreground">Maintain this posture.</p>
            <Progress value={((CALIBRATION_HOLD_DURATION - countdown) / CALIBRATION_HOLD_DURATION) * 100} className="w-full" />
            <p className="text-lg font-bold">{countdown}s</p>
          </div>
        );
      case 'capturing':
        return (
          <div className="text-center space-y-2">
            <p className="font-semibold animate-pulse">Capturing...</p>
            <p className="text-sm text-muted-foreground">Analyzing your posture.</p>
            {/* TODO: Potentially show skeleton overlay here */}
          </div>
        );
      case 'complete':
        return (
          <div className="text-center space-y-4">
            <CardTitle>Calibration Complete!</CardTitle>
            <p className="text-sm text-green-600">Your reference posture has been saved.</p>
            {/* TODO: Add button to proceed or redo calibration */}
             <Button variant="outline" onClick={() => setStep('initial')}>Recalibrate</Button>
          </div>
        );
       case 'error':
         return (
           <div className="text-center space-y-4">
             <CardTitle className="text-destructive">Calibration Error</CardTitle>
             <p className="text-sm text-destructive">Something went wrong during calibration. Please ensure camera access and try again.</p>
             <Button variant="outline" onClick={() => setStep('initial')}>Try Again</Button>
           </div>
         );
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto mt-8">
      <CardContent className="p-6 space-y-6">
        {/* Always show webcam during active calibration steps */}
        {(step === 'positioning' || step === 'holding' || step === 'capturing') && (
           <div className="mb-4">
             <WebcamDetector onError={handleWebcamError} />
           </div>
        )}

        {renderContent()}
      </CardContent>
    </Card>
  );
};
