import { redirect } from 'next/navigation'

import { DASHBOARD_PATHS } from '@/constants/user'
import { getSession } from '@/entry/session'

import { LandingClasses } from './_components/landing-classes'
import { LandingCta } from './_components/landing-cta'
import { LandingFeatures } from './_components/landing-features'
import { LandingFooter } from './_components/landing-footer'
import { LandingHeader } from './_components/landing-header'
import { LandingHero } from './_components/landing-hero'

const RootPage = async () => {
  const session = await getSession()
  if (session) redirect(DASHBOARD_PATHS[session.user.role])

  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <LandingFeatures />
        <LandingClasses />
        <LandingCta />
      </main>
      <LandingFooter />
    </>
  )
}

export default RootPage
