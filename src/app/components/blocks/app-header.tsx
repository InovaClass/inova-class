import Link from 'next/link'

import { AccountLink } from './account/account-link'
import { SignOutForm } from './authentication/sign-out-form'
import { SoundToggle } from './sound-toggle'

type AppHeaderProps = { userName: string; accountHref: string }

export const AppHeader = ({ userName, accountHref }: AppHeaderProps) => (
  <header className="flex flex-wrap items-center justify-between gap-6 border-b-4 border-foreground p-4 dark:border-ring">
    <Link href="/" className="text-xs underline-offset-4 hover:underline">
      inova.class
    </Link>
    {/* One group, so on a phone the controls wrap together under the brand instead of splitting */}
    <div className="flex min-w-0 flex-wrap items-center justify-end gap-6">
      {/* The pixel font leaves no room for the name next to the brand and the button on a phone */}
      <p className="hidden max-w-80 min-w-0 truncate text-xs text-muted-foreground sm:block">
        {userName}
      </p>
      <AccountLink href={accountHref} />
      <SoundToggle />
      <SignOutForm />
    </div>
  </header>
)
