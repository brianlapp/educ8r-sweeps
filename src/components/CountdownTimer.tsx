
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Rocket, Star, Gift, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
  
  const [progress, setProgress] = useState(15);

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
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-md overflow-hidden animate-fadeIn">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <Rocket className="text-primary h-6 w-6 animate-pulse" />
              </div>
              <h3 className="font-bold text-xl text-primary">Launch Period</h3>
            </div>
            <Badge variant="success" className="animate-fadeIn py-1.5 px-3">
              <Star className="mr-1.5 h-3.5 w-3.5" /> Early Entry Phase
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-4">
          <div className="space-y-3">
            <p className="text-center font-semibold text-gray-800 mb-3 text-lg">
              Be Among the First 500 Teachers to Enter!
            </p>
            
            <div className="space-y-2">
              <Progress value={progress} className="h-7 bg-blue-50" />
              <div className="flex justify-between items-center text-xs text-gray-600">
                <p>Campaign Start</p>
                <p className="font-medium text-primary">Launch Phase: {progress}% Complete</p>
                <p>Goal: 500 Entries</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-white border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <Gift className="text-primary h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Prize Value</p>
                  <p className="font-bold text-2xl text-primary">$1,000</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300 relative overflow-hidden group">
              <CardContent className="p-4 flex justify-between items-center">
                <div className="flex flex-col">
                  <p className="font-medium text-gray-700 mb-1">
                    <span className="text-primary font-bold text-lg">Enter Now</span>
                  </p>
                  <p className="text-sm text-gray-600">Before Spots Fill Up!</p>
                  <ArrowRight className="h-5 w-5 mt-2 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="bg-blue-50/80 rounded-full p-2 relative">
                  <div className="absolute -top-2 -right-2 z-10">
                    <Badge variant="success" className="animate-pulse h-6 w-6 flex items-center justify-center p-0">
                      <Star className="h-3 w-3" />
                    </Badge>
                  </div>
                  <div className="relative h-20 w-20 overflow-hidden rounded-full bg-gradient-to-b from-blue-50 to-indigo-50 border-2 border-blue-100 shadow-sm">
                    <img 
                      src="/lovable-uploads/f5195a11-06c5-427c-9cd7-246be0569877.png" 
                      alt="Teacher avatar" 
                      className="object-contain transform scale-110 translate-y-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
        
        <CardFooter className="pt-0 flex justify-center">
          <div className="flex items-center gap-1 text-sm md:text-base font-medium text-primary hover:text-primary-hover transition-colors duration-200">
            Get Your Entry in Before the Rush
            <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </CardFooter>
      </Card>
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
