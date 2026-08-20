import type { Metadata } from "next"
import "./globals.css"
import { Toaster } from "@/components/Toaster"

export const metadata: Metadata = {
  title: "PANDA Fantasy",
  description: "Fantasy fútbol para ligas amateurs de Canning",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
