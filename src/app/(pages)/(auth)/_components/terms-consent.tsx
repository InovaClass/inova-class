import Link from 'next/link'

// In a new tab, since leaving the page would lose what was typed in the sign-up form
const TermsLinks = () => (
  <>
    <Link
      href="/termos"
      target="_blank"
      className="underline underline-offset-4"
    >
      Termos de Uso
    </Link>{' '}
    e a{' '}
    <Link
      href="/privacidade"
      target="_blank"
      className="underline underline-offset-4"
    >
      Política de Privacidade
    </Link>
  </>
)

export const TermsCheckboxLabel = () => (
  <>
    Li e aceito os <TermsLinks />.
  </>
)

export const GoogleTermsNotice = () => (
  <p className="text-xs leading-relaxed text-muted-foreground">
    Ao continuar com o Google, você aceita os <TermsLinks />.
  </p>
)
