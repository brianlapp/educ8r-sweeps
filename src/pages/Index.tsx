
import { EntryForm } from "@/components/EntryForm";
import { CountdownTimer } from "@/components/CountdownTimer";

const Index = () => {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 57); // 57 days from now

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
          <header className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              🎉 Win a $1,000 School Supply Giveaway! 🎉
            </h1>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <img
                src="/lovable-uploads/f072d7b0-7f52-4526-aab3-5ba9c4ad9c1f.png"
                alt="School Supplies Collection"
                className="w-full rounded-lg"
              />
            </div>
            <div>
              <EntryForm />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <h2 className="text-2xl font-bold mb-6">Time Left to Enter!</h2>
          <CountdownTimer targetDate={targetDate} />
          <p className="mt-6 text-gray-600">
            Ready to kick off the school year with a bang? Enter our $1,000 School Supply Giveaway for a chance to win everything you need for an awesome academic year! 📚✏️
          </p>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© 2024 School Supply Giveaway. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
