import "./colors.css";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Satta King Result Today | Gali, Desawar, Ghaziabad & Faridabad Chart Records",
    template: "%s | Satta King Fast"
  },
  description:
    "Check daily Satta King Result updates, Gali Satta Result, Desawar Chart, Ghaziabad Result and Faridabad Records. Explore complete old chart history from 2015 to 2025 with updated archives and historical data.",
  keywords: [
    "satta king",
    "satta king result",
    "satta king fast",
    "gali result",
    "desawar result",
    "ghaziabad result",
    "faridabad result",
    "satta king chart",
    "satta result today",
    "satta king 2025",
    "satta king online",
    "black satta king",
    "satta king record chart",
    "satta king old chart"
  ],
  verification: {
    google: "atrP2Nan2ywH60TPdfGhm7mUuD2X5ZJEVAm_FFBlKWQ"
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Satta King Result Today | Gali, Desawar, Ghaziabad & Faridabad Chart Records",
    description:
      "Check daily Satta King Result updates, Gali Satta Result, Desawar Chart, Ghaziabad Result and Faridabad Records. Explore complete old chart history from 2015 to 2025.",
    url: siteUrl,
    siteName: "Satta King Fast",
    type: "website",
    locale: "en_IN"
  },
  twitter: {
    card: "summary_large_image",
    title: "Satta King Result Today | Gali, Desawar, Ghaziabad & Faridabad",
    description:
      "Live Satta King results for Gali, Desawar, Ghaziabad, Faridabad and more. Daily updated charts and historical records."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "64x64" }
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.ico"
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="atrP2Nan2ywH60TPdfGhm7mUuD2X5ZJEVAm_FFBlKWQ" />
        <link rel="stylesheet" href="/asset/app.css" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}