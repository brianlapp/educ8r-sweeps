
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Rocket, Star, Gift, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
      <Card className="bg-gradient-to-br from-blue-100 to-indigo-100 border-blue-200 shadow-md overflow-hidden animate-fadeIn">
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
              <Progress value={progress} className="h-5 bg-blue-50" />
              <div className="flex justify-between items-center text-xs text-gray-600">
                <p>Campaign Start</p>
                <p className="font-medium text-primary">Launch Phase: {progress}% Complete</p>
                <p>Goal: 500 Entries</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            
            <Card className="bg-white border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-full">
                  <Clock className="text-primary h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-bold text-primary">{timeLeft.days}</span>
                    <span className="text-lg font-medium text-gray-600">days</span>
                  </div>
                  <p className="text-sm text-gray-500">Until Drawing</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white border-blue-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300">
              <CardContent className="p-4 flex items-center justify-center text-center">
                <div className="flex flex-col items-center">
                  <p className="font-medium text-gray-700 mb-1">
                    <span className="text-primary font-bold">Enter Now</span>
                  </p>
                  <p className="text-sm text-gray-600">Before Spots Fill Up!</p>
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
