import PublicLayout from "@/components/PublicLayout";

export const revalidate = 300;

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="simple-page-title text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="leading-relaxed">We use contact and admin information only to operate the website. Database credentials and admin passwords should be kept private and rotated before production deployment.</p>
      </main>
    </PublicLayout>
  );
}
