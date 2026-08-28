import React from "react";
import { Loader2 } from "lucide-react";
import { useDarkMode } from "../contexts/DarkModeContext";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({
  size = "md",
  text,
  fullScreen = false
}: LoadingSpinnerProps) {
  const { isDarkMode } = useDarkMode();

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8",
    lg: "w-12 h-12",
    xl: "w-16 h-16"
  };

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-[9999] flex items-center justify-center ${isDarkMode ? "bg-[#0f172a]" : "bg-[#f8fafc]"}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
          {text && (
            <p className={`text-sm font-bold ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{text}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-3">
      <Loader2 className={`${sizeClasses[size]} text-primary animate-spin`} />
      {text && (
        <p className={`text-sm font-bold ${isDarkMode ? "text-slate-300" : "text-gray-600"}`}>{text}</p>
      )}
    </div>
  );
}
