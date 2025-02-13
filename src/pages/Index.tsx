
import { EntryForm } from "@/components/EntryForm";
import { CountdownTimer } from "@/components/CountdownTimer";

const Index = () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 57); // 57 days from now

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            🎉 Win a $1,000 School Supply Giveaway! 🎉
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ready to kick off the school year with a bang? Enter our $1,000 School
            Supply Giveaway for a chance to win everything you need for an awesome
            academic year! 📚✨
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
          <div className="order-2 md:order-1">
            <img
              src="/lovable-uploads/4378aba7-9a12-42be-93a9-bc52d054387e.png"
              alt="School Supplies"
              className="rounded-lg shadow-lg w-full animate-fadeIn"
            />
          </div>
          <div className="order-1 md:order-2 space-y-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h2 className="text-2xl font-semibold mb-6">Time Left to Enter!</h2>
              <CountdownTimer targetDate={targetDate} />
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm animate-slideUp">
              <EntryForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
