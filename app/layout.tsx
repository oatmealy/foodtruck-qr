import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Food Truck',
  description: 'Order fresh Bahraini food',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">{children}</body>
    </html>
  )
}
