import Link from "next/link";

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#fcf8f9] text-[#1b1b1c] font-sans p-8 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Terms and Conditions</h1>
          <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
            Back to Home
          </Link>
        </div>
        
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">1. Acceptance of Terms</h2>
          <p>By accessing and using Obsidian, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
          
          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">2. Description of Service</h2>
          <p>Obsidian provides users with access to a rich collection of resources, including various communications tools, search services, and personalized content. You understand and agree that the service is provided "AS-IS".</p>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">3. User Conduct</h2>
          <p>You agree to not use the service to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Upload, post, email, transmit or otherwise make available any content that is unlawful, harmful, threatening, abusive, harassing, tortious, defamatory, vulgar, obscene, libelous, invasive of another's privacy, hateful, or racially, ethnically or otherwise objectionable.</li>
            <li>Impersonate any person or entity.</li>
            <li>Forge headers or otherwise manipulate identifiers in order to disguise the origin of any content transmitted through the service.</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">4. Modifications to Service</h2>
          <p>Obsidian reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the service (or any part thereof) with or without notice.</p>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">5. Data Retention and Deletion</h2>
          <p>Once you send a message, it is stored in our database. Obsidian is under no legal obligation to delete or keep your messages indefinitely. We reserve the right to retain your data as long as necessary, or delete it at any time due to database restrictions or operational requirements.</p>
          <p>Generally, we routinely delete all messages after a month to maintain system performance. You are encouraged to export your chats regularly if you wish to keep a record. The platform provides a feature to export your chats in a highly readable format at any time.</p>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">6. Termination</h2>
          <p>You agree that Obsidian may, under certain circumstances and without prior notice, immediately terminate your account, any associated email address, and access to the service.</p>
        </div>
      </div>
    </div>
  );
}
