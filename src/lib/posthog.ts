import PostHog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    PostHog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug(false)
      }
    })
  }
}

export { PostHog as posthog }
