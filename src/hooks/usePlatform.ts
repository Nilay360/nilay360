/**
 * React hook for platform-aware rendering.
 *
 * SSR-safe: returns web defaults on first render (hydration), then
 * updates to the real platform on the client. The `ready` flag is
 * false until the client-side effect has run — use it to avoid
 * platform-specific flash during hydration.
 *
 * Usage:
 *   const { isNative, isAndroid, isIOS } = usePlatform();
 *   if (isAndroid) return <AndroidBackButton />;
 */

'use client';

import { useState, useEffect } from 'react';
import {
  getPlatform,
  isNative,
  isAndroid,
  isIOS,
  isWeb,
  applyPlatformBodyClass,
  type Platform,
} from '@/lib/platform';

interface PlatformState {
  /** The current platform identifier. */
  platform: Platform;
  /** True when running inside the native Capacitor shell (Android or iOS). */
  isNative: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWeb: boolean;
  /**
   * False during SSR and the first client render (hydration).
   * Becomes true once the real platform has been detected client-side.
   * Gate platform-specific rendering behind this flag to prevent flicker.
   */
  ready: boolean;
}

const SSR_DEFAULTS: PlatformState = {
  platform: 'web',
  isNative: false,
  isAndroid: false,
  isIOS: false,
  isWeb: true,
  ready: false,
};

export function usePlatform(): PlatformState {
  const [state, setState] = useState<PlatformState>(SSR_DEFAULTS);

  useEffect(() => {
    const platform = getPlatform();
    setState({
      platform,
      isNative: isNative(),
      isAndroid: isAndroid(),
      isIOS: isIOS(),
      isWeb: isWeb(),
      ready: true,
    });
    applyPlatformBodyClass();
  }, []);

  return state;
}
