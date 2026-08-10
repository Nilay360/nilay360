/**
 * Platform detection utilities for Capacitor native app vs. web browser.
 *
 * All functions are SSR-safe — they return 'web' defaults when called
 * server-side (no `window`). Use the `usePlatform` hook in React components
 * for reactive, client-side detection.
 *
 * Enterprise usage pattern:
 *   - Import functions here for logic/services (non-React code)
 *   - Import `usePlatform` hook for React component rendering decisions
 */

import { Capacitor } from '@capacitor/core';

export type Platform = 'android' | 'ios' | 'web';

/** Returns the current platform. SSR-safe: returns 'web' on the server. */
export function getPlatform(): Platform {
  if (typeof window === 'undefined') return 'web';
  return Capacitor.getPlatform() as Platform;
}

/** True when running inside the native Android or iOS Capacitor shell. */
export function isNative(): boolean {
  if (typeof window === 'undefined') return false;
  return Capacitor.isNativePlatform();
}

export function isAndroid(): boolean {
  return getPlatform() === 'android';
}

export function isIOS(): boolean {
  return getPlatform() === 'ios';
}

export function isWeb(): boolean {
  return getPlatform() === 'web';
}

/**
 * Applies a CSS class to `document.body` for the current platform.
 * Call once from a client-side effect (e.g. in RootLayout).
 * This enables platform-specific CSS rules via body.platform-android,
 * body.platform-ios, and body.platform-web selectors.
 */
export function applyPlatformBodyClass(): void {
  if (typeof document === 'undefined') return;
  const platform = getPlatform();
  document.body.classList.remove('platform-android', 'platform-ios', 'platform-web');
  document.body.classList.add(`platform-${platform}`);
  if (isNative()) {
    document.body.classList.add('platform-native');
  }
}
