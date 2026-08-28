import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/Toaster"

export const metadata: Metadata = {
  title: "PANDA Fantasy",
  description: "Fantasy fútbol para ligas amateurs de Canning",
  icons: {
    icon: "https://lh3.googleusercontent.com/d/14Wc0C7x__d6ZY_popX5OQH8EhhOPQSu8",
    apple: "https://lh3.googleusercontent.com/d/14Wc0C7x__d6ZY_popX5OQH8EhhOPQSu8",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0a0e17" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#0a0e17', color: '#ffffff', minHeight: '100vh' }}>
        <Toaster />
        {children}
      </body>
    </html>
  )
}
