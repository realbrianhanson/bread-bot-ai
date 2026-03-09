import { motion } from "framer-motion";

export function AuroraBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Primary aurora */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-primary/15 blur-[120px]"
        animate={{
          x: ["-10%", "5%", "-5%", "10%", "-10%"],
          y: ["-5%", "10%", "5%", "-10%", "-5%"],
          scale: [1, 1.1, 0.95, 1.05, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: "10%", left: "15%" }}
      />
      
      {/* Secondary aurora */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full bg-brand-rose/10 blur-[100px]"
        animate={{
          x: ["5%", "-10%", "10%", "-5%", "5%"],
          y: ["10%", "-5%", "-10%", "5%", "10%"],
          scale: [1.05, 0.95, 1.1, 1, 1.05],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        style={{ bottom: "15%", right: "10%" }}
      />
      
      {/* Accent aurora */}
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full bg-brand-emerald/8 blur-[80px]"
        animate={{
          x: ["-5%", "10%", "-10%", "5%", "-5%"],
          y: ["5%", "-10%", "10%", "-5%", "5%"],
          scale: [0.95, 1.1, 1, 1.05, 0.95],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: "40%", left: "50%" }}
      />
    </div>
  );
}
