import React from 'react';
import { motion } from 'framer-motion';

interface SoundWaveAnimationProps {
  color: string;
  /** Array of frequency data values (e.g., 0-255). The length determines the number of bars. */
  frequencyData: Uint8Array | null;
  /** Maximum height for a bar in pixels */
  maxHeight?: number;
}

const SoundWaveAnimation: React.FC<SoundWaveAnimationProps> = ({
  color,
  frequencyData,
  maxHeight = 24, // Default max height (adjust as needed)
}) => {
  const barCount = frequencyData?.length || 0;
  const minHeight = 2; // Minimum height for a bar

  const bars = Array.from({ length: barCount }, (_, i) => {
    // Scale frequency value (0-255) to bar height (minHeight to maxHeight)
    const frequencyValue = frequencyData ? frequencyData[i] : 0;
    // Normalize the frequency value (0 to 1)
    const normalizedValue = frequencyValue / 255;
    // Scale to the desired height range
    const height = Math.max(minHeight, minHeight + normalizedValue * (maxHeight - minHeight));
    // Smooth transition for height changes
    const transition = { type: 'tween', duration: 0.05, ease: 'linear' };

    return (
      <motion.div
        key={i}
        className={`w-2 rounded-full mx-0.5`} // Thicker bars with slightly more margin
        style={{ backgroundColor: color }}
        initial={{ height: `${minHeight}px`, opacity: 0.7 }}
        animate={{
          height: `${height}px`,
          opacity: height > minHeight ? 1 : 0.7,
        }}
        transition={transition}
      />
    );
  });

  return (
    // Ensure container has a fixed height to contain the bars
    <div className="flex items-end justify-center h-8">
      {/* Render bars if frequencyData is available */}
      {frequencyData && bars}
    </div>
  );
};

export default SoundWaveAnimation;