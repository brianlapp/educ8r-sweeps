
import { EntryForm } from "@/components/EntryForm";
import { CountdownTimer } from "@/components/CountdownTimer";

const Index = () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 57); // 57 days from now

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[#2C3E50]">
            🎒 Win Back-to-School Supplies! 🎓
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Enter for a chance to win everything on your school supply list - from backpacks to notebooks, markers, and more! Get ready for a successful school year.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          <div className="order-2 md:order-1">
            <img
              src="/lovable-uploads/399cdf8e-d7b2-47fa-b4d6-8106630d1e5e.png"
              alt="School Supplies Collection"
              className="rounded-2xl w-full animate-fadeIn transform hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
          <div className="order-1 md:order-2">
            <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 animate-slideUp">
              <h2 className="text-2xl font-semibold mb-6 text-center text-[#2C3E50]">Enter to Win!</h2>
              <EntryForm />
            </div>
          </div>
        </div>

        <div className="mt-12 bg-white p-8 rounded-xl shadow-md border border-gray-100">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6 text-center">⏰ Limited Time Offer!</h2>
            <CountdownTimer targetDate={targetDate} />
            
            <div className="mt-8 bg-blue-50 p-6 rounded-xl">
              <h3 className="text-lg font-semibold mb-3 text-blue-800">What You Could Win:</h3>
              <ul className="space-y-2 text-blue-700">
                <li>✓ Premium School Backpack</li>
                <li>✓ Complete Crayola Art Set</li>
                <li>✓ Notebooks & Folders</li>
                <li>✓ Essential School Supplies</li>
                <li>✓ Cleaning & Sanitizing Items</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-sm text-gray-500 max-w-2xl mx-auto">
          <p>No purchase necessary. Void where prohibited. Must be 18 years or older to enter. 
             See official rules for complete details. Prize valued at approximately $250.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
