import { motion } from "framer-motion";

interface ProgressBarProps {
  isLoading: boolean;
  color?: string;
}

export function ProgressBar({ isLoading, color = "bg-blue-500" }: ProgressBarProps) {
  if (!isLoading) return null;

  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className={`h-full ${color} rounded-full`}
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1,
          ease: "easeInOut",
        }}
        style={{ width: "40%" }}
      />
    </div>
  );
}

export function ProgressBarInline({ isLoading, color = "bg-blue-500" }: ProgressBarProps) {
  if (!isLoading) return null;

  return (
    <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden mt-2">
      <motion.div
        className={`h-full ${color} rounded-full opacity-80`}
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          repeat: Infinity,
          duration: 1.2,
          ease: "easeInOut",
        }}
        style={{ width: "50%" }}
      />
    </div>
  );
}
