import Link from "next/link";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#fcf8f9] text-[#1b1b1c] font-sans p-8 md:p-16">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          <Link href="/" className="text-sm font-medium text-primary-600 hover:underline">
            Back to Home
          </Link>
        </div>
        
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">1. Introduction</h2>
          <p>Welcome to Obsidian. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our application and tell you about your privacy rights and how the law protects you.</p>
          
          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">2. Data We Collect</h2>
          <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong>Identity Data:</strong> includes username, and display name.</li>
            <li><strong>Contact Data:</strong> includes email address.</li>
            <li><strong>Profile Data:</strong> includes your profile picture, role, age, and location.</li>
            <li><strong>Communication Data:</strong> includes messages sent through our encrypted platform. Note that we employ encryption to maximize data security.</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">3. How We Use Your Data</h2>
          <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>To register you as a new user.</li>
            <li>To manage our relationship with you.</li>
            <li>To enable secure communication between you and other users.</li>
          </ul>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">4. Data Security</h2>
          <p>We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. Messages are transmitted securely and access is strictly governed by Firebase Security Rules.</p>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">5. Data Retention</h2>
          <p>Once you message, it will be stored in our database. We are not under any force to delete it or keep it. Sometimes, due to database restrictions or other reasons, we may have to delete all your messages, or we may never delete your data, as this is a messaging system.</p>
          <p>As a general policy, we usually delete all your messages after a month. Meanwhile, you can easily export your chats in a readable text format through the user interface.</p>

          <h2 className="text-xl font-semibold text-[#1b1b1c] mt-8">6. Contact Us</h2>
          <p>If you have any questions about this privacy policy or our privacy practices, please contact us at support@qurevotechnologies.com.</p>
        </div>
      </div>
    </div>
  );
}
