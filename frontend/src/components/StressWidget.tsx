import React, { useRef, useEffect } from 'react'; // Removed useState, useCallback
import { Card } from '@/components/ui/card';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { useAppStore, useAppActions } from 'utils/useAppStore'; // Import Zustand store // Let's use framer-motion for smoother animations if available

// Check if framer-motion is actually available, otherwise fallback
// Note: Framer Motion *is* listed in the available packages, so this should work.

// No initial stress needed, reads from store

export const StressWidget: React.FC = () => {
  const currentStressLevel = useAppStore((state) => state.currentStressLevel);
  // No need to import setStressLevel or actions here anymore
  const widgetRef = useRef<HTMLDivElement>(null);

  // Use Framer Motion for smooth dragging
  const x = useMotionValue(10); // Initial X position
  const y = useMotionValue(10); // Initial Y position
  const springConfig = { damping: 25, stiffness: 300 };
  const smoothX = useSpring(x, springConfig);
  const smoothY = useSpring(y, springConfig);

  // Determine pulse color/speed based on stress level
  const getPulseStyle = (level: number) => {
    let pulseColorClass = 'bg-green-500';
    let animationDuration = 'animate-pulse-slow'; // Default slow pulse

    if (level >= 20) { // New Red threshold
      pulseColorClass = 'bg-red-500';
      animationDuration = 'animate-pulse-fast';
    } else if (level >= 15) { // New Moderate threshold
      pulseColorClass = 'bg-yellow-500';
      animationDuration = 'animate-pulse-medium';
    }
    // We'll need to define these animations in index.css
    console.log('[StressWidget] getPulseStyle - Level:', level, '-> Color:', pulseColorClass, 'Duration:', animationDuration); // <<< Log style decision
    return { pulseColorClass, animationDuration }; 
  };

  const { pulseColorClass, animationDuration } = getPulseStyle(currentStressLevel);

  return (
    <motion.div
      ref={widgetRef}
      drag // Enable dragging
      dragConstraints={{ left: 0, right: window.innerWidth - 100, top: 0, bottom: window.innerHeight - 100 }} // Basic constraints (adjust size later)
      dragMomentum={false} // Disable momentum for a simpler feel
      style={{
        position: 'fixed', // Use fixed to position relative to viewport
        x: smoothX,
        y: smoothY,
        cursor: 'grab',
        width: '80px', // Small size
        height: '80px',
        touchAction: 'none', // Prevent page scroll on touch devices
      }}
      whileTap={{ cursor: 'grabbing' }}
      className="z-50" // Ensure it's on top
    >
      <Card className="w-full h-full rounded-full flex items-center justify-center shadow-lg p-2 overflow-hidden bg-card/80 backdrop-blur-sm">
        {/* Pulsing Indicator */}
        <div className={`w-3/4 h-3/4 rounded-full ${pulseColorClass} ${animationDuration} opacity-70`} />
        {/* Optional: Display stress level number 
        <span className="absolute text-xs font-semibold text-card-foreground">
            {stressLevel}
        </span>
        */}
      </Card>
    </motion.div>
  );
};
