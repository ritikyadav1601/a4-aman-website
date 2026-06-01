import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sattakingfast.com";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: "Satta King Fast - Live Results & Daily Number Charts",
  description: "Check live results, daily updates, fast number charts, and market records with quick access, simple layout, and regular updates for users.SattaKingFast.Com",
  verification: {
    google: "RyOErpCLdPJqTB3jfG_mF8k_bQD-oRD4CzhvGUknWBY",
  },
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Satta King Fast - Live Results & Daily Number Charts",
    description: "Check live results, daily updates, fast number charts, and market records with quick access, simple layout, and regular updates.",
    url: siteUrl,
    siteName: "Satta King Fast",
    type: "website"
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
        <title>Satta King Fast - Live Results & Daily Number Charts</title>
        <meta name="google-site-verification" content="RyOErpCLdPJqTB3jfG_mF8k_bQD-oRD4CzhvGUknWBY" />
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
