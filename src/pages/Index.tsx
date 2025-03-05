
import { EntryForm } from "@/components/EntryForm";
import { CountdownTimer } from "@/components/CountdownTimer";
import { Helmet } from 'react-helmet-async';
import { Link } from "react-router-dom";

const Index = () => {
  // Setting the countdown target date to August 15, 2025
  const targetDate = new Date("August 15, 2025");

  return <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>Win $1,000 for Your Classroom - Educ8r Sweepstakes</title>
      </Helmet>
      <header className="w-full bg-[#f3f3f3] py-1 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-12 w-auto" />
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="container mx-auto px-4 py-6 md:py-12">
          <div className="relative grid md:grid-cols-2 gap-0 items-center max-w-6xl mx-auto">
            <div className="order-1 md:order-1 md:pr-12 z-0 md:w-[calc(100%+3rem)]">
              <img alt="Students collaborating on laptop" className="w-full animate-fadeIn transform hover:scale-[1.02] transition-transform duration-300 rounded-none" src="/lovable-uploads/308c0411-e546-4640-ab1a-b354a074f9c4.png" />
            </div>
            <div className="order-2 md:order-2 md:-ml-12 z-10 -mt-4 sm:-mt-8 md:mt-0">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-blue-200 border-4  animate-slideUp">
                <h2 className="text-2xl md:text-3xl lg:text-4xl mb-3 text-center text-[#2C3E50] font-bold whitespace-nowrap text-[clamp(20px,5vw,32px)] overflow-hidden text-ellipsis">🏆 Win $1,000 for Your Classroom!</h2>
                <p className="text-lg md:text-xl mb-6 text-center text-gray-600 whitespace-nowrap text-[clamp(14px,4vw,20px)] overflow-hidden text-ellipsis">Support Your Students and Stock Up on Supplies</p>
                <EntryForm />
                <p className="text-center text-xs text-gray-500 mt-4">In partnership with Comprendi™ by Dr. Marion's Learning Lab – Because tackling the reading crisis is a team effort.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">⏰ Enter Before Time's Up!</h2>
              <CountdownTimer targetDate={targetDate} />
              
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mt-6 text-center">
                Enter for a chance to win $1,000 to spend on everything on your school supply list - from backpacks and notebooks to markers and more! Get ready for a successful school year.
              </p>

              <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
                <div className="flex flex-col items-center mb-6">
                  <img 
                    src="https://i0.wp.com/dmlearninglab.com/wp-content/uploads/2024/03/Comprendi-Logo-5.png?fit=580%2C327&ssl=1" 
                    alt="Comprendi Logo" 
                    className="h-16 object-contain mb-4" 
                  />
                  <div className="flex items-center gap-3">
                    <span className="text-blue-600 text-2xl">📚</span>
                    <h3 className="text-xl font-semibold text-blue-800">About Comprendi</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-gray-700">
                    Dr. Marion Blank and her team at Dr. Marion's Learning Lab have developed Comprendi™, a research-backed reading comprehension program that not only helps kids improve their reading skills but also makes reading fun and engaging.
                  </p>
                  <p className="text-gray-700">
                    We believe reading is a team effort, and that's why we're offering a free trial of Comprendi™—a gift you can share with your students (and their parents) just for entering our sweepstakes!
                  </p>
                  <p className="font-medium text-blue-700 mt-4">
                    Bonus: Earn extra sweepstakes entries for every student who enrolls—help your students thrive while increasing your chances to win!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-gray-500 max-w-2xl mx-auto">
            <p>No purchase necessary. Void where prohibited. Must be 18 years or older to enter. See <Link to="/terms" className="text-primary hover:underline">official rules</Link> for complete details. Prize valued at approximately $1000.</p>
          </div>
        </div>
      </main>

      <footer className="w-full bg-[#f3f3f3] py-6 border-t border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-8 w-auto" />
            <p className="text-sm text-gray-600">© 2024 All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>;
};
export default Index;
