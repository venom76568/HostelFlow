import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ProgressBarProps {
  isLoading: boolean;
  color?: string;
}

export function ProgressBar({ isLoading, color = "bg-blue-500" }: ProgressBarProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isLoading) {
      setIsVisible(true);
      setProgress(0);
      // Quickly jump to 30%, then slow down towards 90%
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 10;
          if (prev < 60) return prev + 2;
          if (prev < 90) return prev + 0.5;
          return prev;
        });
      }, 100);
    } else {
      // Complete to 100%
      setProgress(100);
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 500); // Wait for animation to finish then hide
      return () => clearTimeout(timeout);
    }

    return () => clearInterval(interval);
  }, [isLoading]);

  return (
    <div className="w-full relative h-1 mt-1 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            exit={{ opacity: 0 }}
            transition={{ 
              width: { type: "spring", stiffness: 50, damping: 15 },
              opacity: { duration: 0.3 } 
            }}
            className={`absolute top-0 left-0 h-full ${color} rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]`}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function ProgressBarInline({ isLoading, color = "bg-blue-500" }: ProgressBarProps) {
  return <ProgressBar isLoading={isLoading} color={color} />;
}
