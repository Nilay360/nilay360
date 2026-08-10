'use client';

import { useEffect } from 'react';
import { applyPlatformBodyClass } from '@/lib/platform';

/**
 * Invisible component that applies `platform-android`, `platform-ios`, or
 * `platform-web` (plus `platform-native` for native) to `document.body`
 * on mount. Rendered once at the root layout level.
 */
export default function PlatformProvider() {
  useEffect(() => {
    applyPlatformBodyClass();
  }, []);
  return null;
}
