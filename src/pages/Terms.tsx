import { Helmet } from 'react-helmet-async';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-white">
      <Helmet>
        <title>Terms & Conditions | Educ8r Sweepstakes</title>
      </Helmet>
      <header className="w-full bg-[#f3f3f3] py-4 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <img src="/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" className="h-12 w-auto" />
          </div>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold mb-6">OFFICIAL RULES</h1>
          <div className="prose prose-gray max-w-none">
            <p className="text-xl font-semibold">$1,000 School Supply Giveaway ("Sweepstakes")</p>
            <p className="font-bold mt-4">INITIAL ENTRY: NO PURCHASE NECESSARY.</p>
            <p>Additional entries available through referral program as described below.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">1. ELIGIBILITY</h2>
            <p>The Sweepstakes is open only to legal residents of Canada (excluding Quebec) who are of the age of majority in their province/territory of residence at the time of entry. Void where prohibited by law.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">2. SPONSOR</h2>
            <p>The Sweepstakes is sponsored by Free Parent Search ("Sponsor"), [Full Legal Address].</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">3. SWEEPSTAKES PERIOD</h2>
            <p>The Sweepstakes begins on [START DATE] at 12:00:01 a.m. Eastern Time ("ET") and ends on [END DATE] at 11:59:59 p.m. ET (the "Sweepstakes Period").</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">4. HOW TO ENTER</h2>
            <p>There are two methods of entry:</p>
            <p className="font-semibold mt-2">Initial Entry:</p>
            <p>Visit [WEBSITE URL] and complete the entry form with your required information. Limit one (1) initial entry per person/email address.</p>
            <p className="font-semibold mt-2">Additional Entries through Referrals:</p>
            <p>After completing your initial entry, you will receive a unique referral link. You can earn one (1) additional entry each time someone you referred activates a Free Trial of Comprendi Reading lessons through your unique referral link during the Sweepstakes Period. There is no limit to the number of additional entries that can be earned through successful referrals.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">5. PRIZE</h2>
            <p>One (1) Grand Prize: $1,000 CAD worth of school supplies, delivered in the form of [gift cards/specific retailers/etc.]. Approximate Retail Value ("ARV"): $1,000 CAD.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">6. WINNER SELECTION AND NOTIFICATION</h2>
            <p>The potential winner will be selected in a random drawing from among all eligible entries received during the Sweepstakes Period, including both initial entries and additional entries earned through referrals. The drawing will be conducted by Sponsor or its designated representatives on [DATE] at [TIME] ET. Odds of winning depend on the total number of eligible entries received.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">7. MATHEMATICAL SKILL-TESTING QUESTION</h2>
            <p>Before being declared a winner, the selected entrant must correctly answer, without assistance of any kind, a mathematical skill-testing question administered by phone or email.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">8. VERIFICATION OF POTENTIAL WINNER</h2>
            <p>Potential winner must comply with all terms and conditions of these Official Rules and winning is contingent upon fulfilling all requirements. The potential winner will be notified by email. If a potential winner cannot be contacted within five (5) days after the date of the first attempt to contact them, the Sponsor may select an alternate potential winner in their place at random from the remaining eligible entries.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">9. ENTRY CONDITIONS AND RELEASE</h2>
            <p>By entering, each participant agrees to: (a) comply with and be bound by these Official Rules and the decisions of the Sponsor which are binding and final in all matters relating to this Sweepstakes; and (b) release and hold harmless the Sponsor and its respective parent, subsidiary, and affiliated companies, the prize suppliers and any other organizations responsible for sponsoring, fulfilling, administering, advertising or promoting the Sweepstakes, and all of their respective past and present officers, directors, employees, agents and representatives from and against any and all claims, expenses, and liability.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">10. PUBLICITY</h2>
            <p>Except where prohibited, participation in the Sweepstakes constitutes winner's consent to Sponsor's use of winner's name, likeness, photograph, voice, opinions, biographical information, hometown, and province for promotional purposes in any media without further payment or consideration.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">11. GENERAL CONDITIONS</h2>
            <p>Sponsor reserves the right to cancel, suspend and/or modify the Sweepstakes if any factor interferes with the proper conduct of the Sweepstakes as contemplated by these Official Rules.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">12. LIMITATION OF LIABILITY</h2>
            <p>By entering, You agree that the Sponsor and its respective parent, subsidiary and affiliated companies, and their respective officers, directors, employees, agents, representatives, successors and assigns shall not be responsible or liable for: (i) any injuries, losses, damages, claims, actions and liability of any kind resulting from participation in the Sweepstakes; or (ii) any technical malfunctions of any kind.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">13. DISPUTES</h2>
            <p>All issues and questions concerning these Official Rules shall be governed by the laws of [PROVINCE], without giving effect to any choice of law or conflict of law rules. Any legal proceedings arising out of this Sweepstakes or relating to these Official Rules shall be instituted only in the federal and provincial courts located in [CITY, PROVINCE], and the parties consent to jurisdiction therein with respect to any legal proceedings or disputes.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">14. PRIVACY</h2>
            <p>Information collected from entrants is subject to the Sponsor's Privacy Policy.</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">15. WINNER LIST</h2>
            <p>To obtain a copy of the winner's name or a copy of these Official Rules, send your request along with a stamped, self-addressed envelope to: [SPONSOR ADDRESS]. Requests must be received no later than [DATE].</p>

            <h2 className="text-xl font-semibold mt-6 mb-3">16. COMPLIANCE WITH LAWS</h2>
            <p>This Sweepstakes is subject to all applicable federal, provincial, and municipal laws and regulations.</p>
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
