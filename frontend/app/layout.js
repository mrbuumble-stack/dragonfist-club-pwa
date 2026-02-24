import "./globals.css";

export const metadata = {
  title: "DragonFist Club",
  description:
    "Visualizza i tuoi punti associativi e la classifica DragonFist Club",
  manifest: "/manifest.json",
  themeColor: "#d4a843",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DragonFist Club",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
