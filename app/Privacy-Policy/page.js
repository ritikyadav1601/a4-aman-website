import PublicLayout from "@/components/PublicLayout";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Satta King Fast. We use contact information only to operate the website and keep user data secure.",
  alternates: {
    canonical: `${siteUrl}/Privacy-Policy`
  },
  openGraph: {
    title: "Privacy Policy | Satta King Fast",
    description:
      "We use contact and admin information only to operate the website. Learn how we handle your data.",
    url: `${siteUrl}/Privacy-Policy`,
    type: "website"
  }
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="simple-page-title text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="leading-relaxed">
          We use contact and admin information only to operate the website. Database credentials and
          admin passwords should be kept private and rotated before production deployment.
        </p>
      </main>
    </PublicLayout>
  );
}