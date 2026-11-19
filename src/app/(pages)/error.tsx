'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { Button, linkButtonVariants } from '@/app/components/ui/8bit/button'
import { StatusScreen } from '@/app/components/ui/custom/status-screen'

type ErrorProps = {
  error: Error & { digest?: string }
  retry: () => void
}

const ErrorPage = ({ error, retry }: ErrorProps) => {
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    console.error(error)
  }, [error])

  // The boundary swaps the page under the focused control, which drops the focus to the body
  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
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
  )
}

export default ErrorPage
