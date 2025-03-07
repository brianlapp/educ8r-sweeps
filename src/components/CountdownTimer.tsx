
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Rocket, Star, Gift } from "lucide-react";

interface CountdownTimerProps {
  targetDate: Date;
  displayMode?: "standard" | "launch-phase";
}

export const CountdownTimer = ({ 
  targetDate, 
  displayMode = "standard" 
}: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (displayMode === "launch-phase") {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6 rounded-xl border border-blue-200 shadow-sm animate-fadeIn">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Rocket className="text-primary h-5 w-5 md:h-6 md:w-6 animate-pulse" />
            <h3 className="font-bold text-lg md:text-xl text-primary">Launch Period</h3>
          </div>
          <Badge variant="success" className="animate-fadeIn">
            <Star className="mr-1 h-3 w-3" /> Early Entry Phase
          </Badge>
        </div>
        
        <div className="mb-6">
          <p className="text-center font-medium text-gray-700 mb-2">Be Among the First 500 Teachers to Enter!</p>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute top-0 left-0 h-full bg-primary rounded-full w-[15%] animate-pulse"></div>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">Launch Phase: 15% Complete</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center gap-3">
            <Gift className="text-primary h-5 w-5" />
            <div>
              <p className="text-sm text-gray-500">Prize Value</p>
              <p className="font-bold text-lg text-primary">$1,000</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center gap-3">
            <div className="text-2xl font-bold text-primary">{timeLeft.days}</div>
            <div className="text-sm text-gray-600">
              <span className="block font-medium">Days</span>
              <span className="text-xs">Until Drawing</span>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-center text-center">
            <p className="text-sm font-medium text-gray-700">
              <span className="text-primary font-bold">Enter Now</span> Before Spots Fill Up!
            </p>
          </div>
        </div>
        
        <div className="text-center text-sm md:text-base font-medium text-primary-hover">
          Get Your Entry in Before the Rush!
        </div>
      </div>
    );
  }

  // Original countdown timer display
  return (
    <div className="grid grid-cols-4 gap-1 md:gap-0.5 text-center max-w-2xl mx-auto">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div
          key={unit}
          className="bg-white p-2 md:p-3 rounded-lg shadow-sm animate-fadeIn"
        >
          <div className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-0.5">{value.toString().padStart(2, '0')}</div>
          <div className="text-xs md:text-sm text-gray-600 capitalize">{unit}</div>
        </div>
      ))}
    </div>
  );
};
