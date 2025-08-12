import * as React from 'react';
import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PromotionBar: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 2,
    hours: 11,
    minutes: 15,
    seconds: 18,
  });

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = { ...prev };
        
        if (newTime.seconds > 0) {
          newTime.seconds--;
        } else if (newTime.minutes > 0) {
          newTime.minutes--;
          newTime.seconds = 59;
        } else if (newTime.hours > 0) {
          newTime.hours--;
          newTime.minutes = 59;
          newTime.seconds = 59;
        } else if (newTime.days > 0) {
          newTime.days--;
          newTime.hours = 23;
          newTime.minutes = 59;
          newTime.seconds = 59;
        }
        
        return newTime;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  // Format time values to always show 2 digits
  const formatTime = (value: number) => value.toString().padStart(2, '0');

  // Calculate total seconds for progress bar
  const totalSeconds = timeLeft.days * 86400 + timeLeft.hours * 3600 + 
                      timeLeft.minutes * 60 + timeLeft.seconds;
  const progress = (totalSeconds / (3 * 86400)) * 100; // 3 days total

  return (
    <div className="relative bg-gradient-to-r from-red-600 to-orange-600 text-white overflow-hidden">
      {/* Progress bar */}
      <div 
        className="h-1 bg-white/20 absolute bottom-0 left-0"
        style={{ width: `${progress}%` }}
      />
      
      <div className="container mx-auto px-3 py-3 sm:py-4">
        <div className="relative flex items-center justify-between gap-4">
          {/* Promo message - Visible on all screens but hidden on mobile */}
          <div className="hidden lg:flex items-center">
            <Zap className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-pulse mr-2" />
            <p className="text-xs sm:text-sm font-medium">
              <span className="font-bold">FLASH SALE:</span> Up to 50% off on selected items
            </p>
          </div>
          
          {/* Mobile promo message - Only visible on mobile */}
          <div className="lg:hidden text-center">
            <div className="flex items-center justify-center">
              <Zap className="flex-shrink-0 h-4 w-4 sm:h-5 sm:w-5 text-yellow-300 animate-pulse mr-2" />
              <p className="text-xs sm:text-sm font-medium">
                <span className="font-bold">FLASH SALE</span>
              </p>
            </div>
          </div>
          
          {/* Countdown timer - Centered on all screens */}
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1 text-xs sm:text-sm bg-black/20 px-3 py-1.5 rounded">
              <span className="hidden sm:inline whitespace-nowrap">Ends in:</span>
              <div className="flex items-center gap-1">
                <div className="flex flex-col items-center min-w-[24px] sm:min-w-[30px]">
                  <span className="font-bold text-sm sm:text-lg">{formatTime(timeLeft.days)}</span>
                  <span className="text-[10px] sm:text-xs opacity-80">Days</span>
                </div>
                <span className="font-bold">:</span>
                <div className="flex flex-col items-center min-w-[24px] sm:min-w-[30px]">
                  <span className="font-bold text-sm sm:text-lg">{formatTime(timeLeft.hours)}</span>
                  <span className="text-[10px] sm:text-xs opacity-80">Hrs</span>
                </div>
                <span className="font-bold">:</span>
                <div className="flex flex-col items-center min-w-[24px] sm:min-w-[30px]">
                  <span className="font-bold text-sm sm:text-lg">{formatTime(timeLeft.minutes)}</span>
                  <span className="text-[10px] sm:text-xs opacity-80">Min</span>
                </div>
                <span className="font-bold">:</span>
                <div className="flex flex-col items-center min-w-[24px] sm:min-w-[30px]">
                  <span className="font-bold text-sm sm:text-lg">{formatTime(timeLeft.seconds)}</span>
                  <span className="text-[10px] sm:text-xs opacity-80">Sec</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Shop Now CTA - Positioned on the right */}
          <div className="hidden lg:block">
            <Link 
              to="/deals" 
              className="px-4 py-1.5 bg-white text-red-600 rounded-full text-xs sm:text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Shop Now
            </Link>
          </div>
          
          {/* Mobile Shop Now CTA - Only visible on mobile */}
          <div className="lg:hidden">
            <Link 
              to="/deals" 
              className="px-3 py-1 bg-white text-red-600 rounded-full text-xs font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              Shop Now
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionBar;
