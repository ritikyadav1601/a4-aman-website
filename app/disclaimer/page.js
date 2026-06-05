import PublicLayout from "@/components/PublicLayout";

export const revalidate = 300;

export default function DisclaimerPage() {
  return (
    <PublicLayout>
      <main className="max-w-3xl mx-auto p-6 text-center">
        <h1 className="simple-page-title text-2xl font-bold mb-4">Disclaimer</h1>
        <p className="leading-relaxed">The information on this website is provided for record and informational purposes. Visitors are responsible for following all laws applicable in their location.</p>
      </main>
    </PublicLayout>
  );
}
