import PublicLayout from "@/components/PublicLayout";

export const revalidate = 300;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

export const metadata = {
  title: "About Us",
  description:
    "Learn about Satta King Fast — your trusted source for fast Satta King results, daily chart updates, and complete market-wise records for Gali, Desawar, Ghaziabad, and Faridabad.",
  alternates: {
    canonical: `${siteUrl}/about-us`
  },
  openGraph: {
    title: "About Us | Satta King Fast",
    description:
      "Satta King Fast provides fast result updates, old charts, and market-wise records for all major satta games.",
    url: `${siteUrl}/about-us`,
    type: "website"
  }
};

export default function AboutPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="simple-page-title text-2xl font-bold mb-4">About Us</h1>
        <p className="leading-relaxed">
          Satta King Fast provides fast result updates, old charts, and market-wise records. This
          website keeps the same public experience while delivering quick access to Gali, Desawar,
          Ghaziabad, and Faridabad results — updated daily with complete chart history.
        </p>
      </main>
    </PublicLayout>
  );
}