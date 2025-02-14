
const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <header className="w-full bg-[#f3f3f3] py-4 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-12 w-auto" />
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold mb-6">Terms and Conditions</h1>
          <div className="prose prose-gray max-w-none">
            <h2 className="text-xl font-semibold mt-6 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and participating in this sweepstakes, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you should not participate in the sweepstakes.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. Eligibility</h2>
            <p>The sweepstakes is open to legal residents of the United States who are 18 years of age or older at the time of entry. Employees of Free Parent Search and their immediate family members are not eligible to participate.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. Entry Period</h2>
            <p>The sweepstakes entry period is clearly stated on the entry form. All entries must be received during this period to be eligible.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. How to Enter</h2>
            <p>Complete the entry form with all required information. Limit one entry per person/email address. Multiple entries from the same person or email address will be disqualified.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. Prize</h2>
            <p>One (1) winner will receive $1,000 for their classroom. Prize is non-transferable and no substitution will be made except as provided herein at the Sponsor's sole discretion.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. Winner Selection and Notification</h2>
            <p>Winner will be selected in a random drawing from all eligible entries. Winner will be notified by email within 5 business days of the drawing.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. General Conditions</h2>
            <p>By entering, participants agree to release and hold harmless Free Parent Search and their respective subsidiaries, affiliates, suppliers, distributors, advertising/promotion agencies, and prize suppliers from any liability arising out of participation in the sweepstakes.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. Privacy</h2>
            <p>Information collected from entrants is subject to our Privacy Policy.</p>
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
    </div>
  );
};

export default Terms;
