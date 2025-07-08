import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import StartupProvider from "./startup-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Datadog Events UI",
  description: "Synthetic Events Generator for Datadog Correlation Testing",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/globals.css" as="style" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <StartupProvider>
          {children}
        </StartupProvider>
        <Toaster />
      </body>
    </html>
  )
}