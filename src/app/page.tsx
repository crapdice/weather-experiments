import { GeoRedirect } from '@/components/geolocation/GeoRedirect';

/**
 * Root page - handles geolocation-based routing.
 * 
 * Renders the GeoRedirect client component which:
 * 1. Checks localStorage for saved city preference
 * 2. Calls /api/geo-detect for IP-based geolocation
 * 3. Redirects to the appropriate city page
 * 
 * This approach works on any hosting platform (Railway, Render, etc.)
 * without requiring platform-specific geo headers.
 */
export default function Home() {
  return <GeoRedirect />;
}
