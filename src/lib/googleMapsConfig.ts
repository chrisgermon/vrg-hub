// Google Maps API Configuration
// This is a PUBLIC API key that's safe to expose in frontend code
// Replace 'YOUR_GOOGLE_MAPS_API_KEY' with your actual Google Maps JavaScript API key
// Get your key from: https://console.cloud.google.com/google/maps-apis/credentials

export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// Helper to check if API key is configured
export const isGoogleMapsConfigured = () => {
  return GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== '';
};
