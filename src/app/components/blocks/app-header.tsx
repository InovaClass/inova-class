import Link from 'next/link'

import { SignOutForm } from './authentication/sign-out-form'

export const AppHeader = ({ userName }: { userName: string }) => (
  <header className="flex flex-wrap items-center justify-end gap-6 border-b-4 border-foreground p-4 dark:border-ring">
    <Link
      href="/"
      className="mr-auto text-xs underline-offset-4 hover:underline"
    >
      inova.class
    </Link>
    {/* The pixel font leaves no room for the name next to the brand and the button on a phone */}
    <p className="hidden max-w-80 min-w-0 truncate text-xs text-muted-foreground sm:block">
      {userName}
    </p>
    <SignOutForm />
  </header>
)
