// components/JsonLd.js
// Drop this inside PublicLayout or directly in app/page.js <head> section.
// Usage: <JsonLd type="website" />  or  <JsonLd type="breadcrumb" items={[...]} />

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

export function WebsiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Satta King Fast",
    url: siteUrl,
    description:
      "Check daily Satta King Result updates, Gali Satta Result, Desawar Chart, Ghaziabad Result and Faridabad Records.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/year-chart/{search_term_string}-result-chart-2025`
      },
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbJsonLd({ items = [] }) {
  // items: [{ name: "Home", url: "/" }, { name: "Charts", url: "/charts" }]
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteUrl}${item.url}`
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}