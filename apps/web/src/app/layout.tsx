import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RolHack',
  description: 'Framework de simulación de hacking en entornos ciberpunk',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="bg-cyber-darker text-white antialiased">
        {children}
      </body>
    </html>
  )
}
