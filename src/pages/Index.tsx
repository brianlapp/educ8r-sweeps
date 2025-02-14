import { EntryForm } from "@/components/EntryForm";
import { CountdownTimer } from "@/components/CountdownTimer";
const Index = () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 57); // 57 days from now

  return <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
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
              <img alt="Students collaborating on laptop" className="w-full animate-fadeIn transform hover:scale-[1.02] transition-transform duration-300 rounded-none" src="/lovable-uploads/900a722c-1bde-48e7-9f7f-e4c073649bcd.png" />
            </div>
            <div className="order-2 md:order-2 md:-ml-12 z-10 -mt-4 sm:-mt-8 md:mt-0">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-blue-200 border-4  animate-slideUp">
                <h2 className="text-2xl md:text-3xl mb-6 text-center text-[#2C3E50] font-bold">🏆 Win $1,000 for Your Classroom!
📚 Help Your Students Read Better – Together</h2>
                <EntryForm />
              </div>
            </div>
          </div>

          <div className="mt-12 bg-white p-8 rounded-xl shadow-md border border-gray-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-semibold mb-6 text-center">⏰ Limited Time Offer!</h2>
              <CountdownTimer targetDate={targetDate} />
              
              <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed mt-6 text-center">
                Enter for a chance to win everything on your school supply list - from backpacks to notebooks, markers, and more! Get ready for a successful school year.
              </p>

              <div className="mt-8 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-blue-600 text-2xl">🎁</span>
                  <h3 className="text-xl font-semibold text-blue-800">What You Could Win:</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {["Premium School Backpack", "Complete Crayola Art Set", "Notebooks & Folders", "Essential School Supplies", "Cleaning & Sanitizing Items"].map((item, index) => <div key={index} className="flex items-center gap-2 p-3 hover:bg-blue-100/50 rounded-lg transition-colors">
                      <span className="text-blue-500 font-bold flex-shrink-0">✓</span>
                      <span className="font-medium text-blue-700">{item}</span>
                    </div>)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-sm text-gray-500 max-w-2xl mx-auto">
            <p>No purchase necessary. Void where prohibited. Must be 18 years or older to enter. 
               See official rules for complete details. Prize valued at approximately $250.</p>
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