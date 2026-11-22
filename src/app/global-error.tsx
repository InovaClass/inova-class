'use client'

// global-error replaces the root layout, so it brings the styles and the font itself
import '@/app/styles/globals.css'

import { Press_Start_2P } from 'next/font/google'
import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { Button, linkButtonVariants } from '@/app/components/ui/8bit/button'
import { StatusScreen } from '@/app/components/ui/custom/status-screen'

const pressStart2P = Press_Start_2P({
  variable: '--font-press-start-2p',
  weight: '400',
  subsets: ['latin']
})

type GlobalErrorProps = {
  error: Error & { digest?: string }
  retry: () => void
}

const GlobalError = ({ error, retry }: GlobalErrorProps) => {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    console.error(error)
  }, [error])

  // The boundary swaps the page under the focused control, which drops the focus to the body
  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <html
      lang="pt-BR"
      className={`${pressStart2P.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <title>Algo deu errado | inova.class</title>
        <StatusScreen
          banner="ERRO"
          title="Algo deu errado"
          description="Não conseguimos carregar esta tela. Tente de novo ou volte ao início."
          headingRef={heading}
        >
          <Button onClick={() => retry()}>Tentar de novo</Button>
          <Link href="/" className={linkButtonVariants({ variant: 'outline' })}>
            Voltar ao início
          </Link>
        </StatusScreen>
      </body>
    </html>
  )
}

export default GlobalError
