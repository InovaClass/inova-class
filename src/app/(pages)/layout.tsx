import '../styles/globals.css'

import type { Metadata } from 'next'
import { Press_Start_2P } from 'next/font/google'

const pressStart2P = Press_Start_2P({
  variable: '--font-press-start-2p',
  weight: '400',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: { default: 'inova.class', template: '%s | inova.class' },
  description: 'Gestão de sala de aula gamificada'
}

const RootLayout = ({ children }: LayoutProps<'/'>) => (
  <html lang="pt-BR" className={`${pressStart2P.variable} h-full antialiased`}>
    <body className="flex min-h-full flex-col">{children}</body>
  </html>
)

export default RootLayout
