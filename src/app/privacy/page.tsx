export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-base p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-display mb-8">Privacy Policy</h1>
      <div className="space-y-4 text-text-secondary text-sm">
        <p>Last updated: April 2026</p>
        <p>Feathr ("we", "our", "us") operates the feathr.agency platform. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our service.</p>
        <h2 className="text-xl text-text-primary font-display pt-4">Information We Collect</h2>
        <p>We collect information you provide directly: email address, professional name, city, platform credentials, and content you upload. We also receive data from connected platforms (messages, analytics, profile information) that you explicitly authorize.</p>
        <h2 className="text-xl text-text-primary font-display pt-4">How We Use Your Information</h2>
        <p>We use your information to provide the Feathr service: managing your social media platforms, scheduling content, handling messages, and providing analytics. We do not sell your data to third parties.</p>
        <h2 className="text-xl text-text-primary font-display pt-4">Data Security</h2>
        <p>Platform credentials are encrypted using AES-256-GCM. All data is stored in Supabase with row-level security ensuring users can only access their own data.</p>
        <h2 className="text-xl text-text-primary font-display pt-4">Data Deletion</h2>
        <p>You can delete your account and all associated data at any time through the Settings page. This action is irreversible.</p>
        <h2 className="text-xl text-text-primary font-display pt-4">Contact</h2>
        <p>For privacy-related questions, contact us at privacy@feathr.agency.</p>
      </div>
    </div>
  )
}
