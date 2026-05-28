import "./globals.css";

export const metadata = {
  title: "DragonFist Club",
  description:
    "Visualizza i tuoi punti associativi e la classifica DragonFist Club",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DragonFist Club",
  },
};

export const viewport = {
  themeColor: "#d4a843",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
