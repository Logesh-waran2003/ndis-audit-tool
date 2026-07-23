'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// ponytail: tiny client component — just checks localStorage + evidence count, redirects if needed
export function OnboardingRedirect({ totalEvidence }: { totalEvidence: number }) {
  const router = useRouter()

  useEffect(() => {
    if (totalEvidence === 0 && !localStorage.getItem('onboarding_complete')) {
      router.push('/onboarding')
    }
  }, [totalEvidence, router])

  return null
}
