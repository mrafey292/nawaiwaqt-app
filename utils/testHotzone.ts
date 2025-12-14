// Test hotzone manager for development testing
// This creates a temporary crime hotzone at the user's current location

interface TestHotzoneData {
  enabled: boolean;
  location: {
    lat: number;
    lng: number;
  } | null;
}

let testHotzoneState: TestHotzoneData = {
  enabled: false,
  location: null,
};

const listeners: Array<(data: TestHotzoneData) => void> = [];

export function setTestHotzone(enabled: boolean, location: { lat: number; lng: number } | null) {
  testHotzoneState = { enabled, location };
  // Notify all listeners
  listeners.forEach(listener => listener(testHotzoneState));
}

export function getTestHotzone(): TestHotzoneData {
  return testHotzoneState;
}

export function subscribeToTestHotzone(callback: (data: TestHotzoneData) => void) {
  listeners.push(callback);
  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

export function generateTestHotzonePolygon(centerLat: number, centerLng: number) {
  // Create a polygon around the user's location (500m x 500m)
  // At approximately 33°N latitude, 1 degree latitude ≈ 111km, 1 degree longitude ≈ 93km
  // 500m = 0.0045 degrees latitude, 0.0054 degrees longitude
  const latRadius = 0.0045; // ~500 meters north-south
  const lngRadius = 0.0054; // ~500 meters east-west at ~33°N
  
  // Create a square around the center point
  const points: Array<{ lat: number; lng: number }> = [
    { lat: centerLat + latRadius, lng: centerLng - lngRadius }, // NW
    { lat: centerLat + latRadius, lng: centerLng + lngRadius }, // NE
    { lat: centerLat - latRadius, lng: centerLng + lngRadius }, // SE
    { lat: centerLat - latRadius, lng: centerLng - lngRadius }, // SW
  ];
  
  return {
    coordinates: points,
    title: 'TEST HOTZONE',
    description: 'This is a test crime hotzone for development purposes (500m radius)',
    color: '#ff9800',
    fillColor: '#ff9800',
    fillOpacity: 0.5,
    clusterId: -1, // Special ID for test hotzone
  };
}
