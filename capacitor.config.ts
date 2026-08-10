import { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor configuration — environment-aware.
 *
 * Production (default):
 *   npx cap sync android
 *   npx cap sync ios
 *   → App loads from https://nilay360.com
 *
 * Local development:
 *   Terminal 1: npm run dev:mobile          (Next.js on 0.0.0.0:3000)
 *   Terminal 2: npm run android             (syncs + runs on Android emulator)
 *               npm run ios                 (syncs + runs on iOS simulator)
 *
 * The Android emulator reaches the host machine at 10.0.2.2.
 * The iOS simulator shares the host network and uses localhost directly.
 */
const isDev = process.env.CAPACITOR_DEV === 'true';
const platform = process.env.CAPACITOR_PLATFORM ?? 'android';

function getDevUrl(): string {
  if (platform === 'ios') {
    return process.env.CAPACITOR_IOS_DEV_URL ?? 'http://localhost:3000';
  }
  return process.env.CAPACITOR_DEV_URL ?? 'http://10.0.2.2:3000';
}

const serverUrl = isDev ? getDevUrl() : 'https://nilay360.com';

const config: CapacitorConfig = {
  appId: 'com.nilay360.app',
  appName: 'Nilay360',
  webDir: 'public',
  server: {
    url: serverUrl,
    androidScheme: isDev ? 'http' : 'https',
    allowNavigation: [
      'nilay360.com',
      'www.nilay360.com',
      '*.nilay360.com',
      'localhost',
      '127.0.0.1',
      '10.0.2.2',
    ],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0B0D10',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
  },
};

export default config;
