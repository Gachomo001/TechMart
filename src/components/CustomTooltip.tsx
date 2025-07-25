import React from 'react';

interface CustomTooltipProps {
  text: string;
  children: React.ReactNode;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ text, children }) => {
  return (
    <div className="relative inline-block group w-full">
      {children}
      <div className="absolute invisible opacity-0 group-hover:visible group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 transition-all duration-300 ease-out transform group-hover:translate-y-0 translate-y-2 z-50">
        <div className="relative p-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-md rounded-2xl border border-white/10 shadow-[0_0_30px_rgba(79,70,229,0.15)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400">
                <path clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" fillRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white">Required Action</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-300">
              {text}
            </p>
          </div>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 blur-xl opacity-50" />
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-gray-900/95 to-gray-800/95 rotate-45 border-r border-b border-white/10" />
        </div>
      </div>
    </div>
  );
};

export default CustomTooltip; 