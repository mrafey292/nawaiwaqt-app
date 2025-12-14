// Calculate distance between two coordinates in meters using Haversine formula
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Utility to check if a point is inside a polygon using ray-casting algorithm
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

// Calculate minimum distance from a point to a polygon
export function distanceToPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): number {
  if (isPointInPolygon(point, polygon)) {
    return 0;
  }

  let minDistance = Infinity;

  // Check distance to each edge of the polygon
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const distance = calculateDistance(
      point.lat,
      point.lng,
      polygon[i].lat,
      polygon[i].lng
    );
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}

export type AlertLevel = 'critical' | 'warning' | 'safe';

export interface ProximityAlert {
  level: AlertLevel;
  message: string;
  zoneIndex?: number;
  zoneName?: string;
  distance?: number;
  isCrimePoint?: boolean;
}

// Check user proximity to crime zones with three alert levels
export function checkProximityAlerts(
  userLocation: { lat: number; lng: number },
  crimeZones: Array<{ coordinates: Array<{ lat: number; lng: number }>; title?: string }>,
  criticalRadius: number = 0, // Inside polygon = critical
  warningRadius: number = 500, // 500m warning distance
  crimePoints: Array<{ lat: number; lng: number; title?: string }> = [] // Individual crime points
): ProximityAlert {
  // Check if inside any polygon (CRITICAL)
  for (let i = 0; i < crimeZones.length; i++) {
    if (isPointInPolygon(userLocation, crimeZones[i].coordinates)) {
      return {
        level: 'critical',
        message: `You are inside a crime hotspot zone!`,
        zoneIndex: i,
        zoneName: crimeZones[i].title || 'Crime Hotspot',
        distance: 0,
        isCrimePoint: false,
      };
    }
  }

  // Check if near any polygon (WARNING)
  let closestDistance = Infinity;
  let closestZoneIndex = -1;
  let closestIsCrimePoint = false;

  for (let i = 0; i < crimeZones.length; i++) {
    const distance = distanceToPolygon(userLocation, crimeZones[i].coordinates);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestZoneIndex = i;
      closestIsCrimePoint = false;
    }
  }

  // Check if near any individual crime point (WARNING at 500m-1km)
  for (let i = 0; i < crimePoints.length; i++) {
    const distance = calculateDistance(
      userLocation.lat,
      userLocation.lng,
      crimePoints[i].lat,
      crimePoints[i].lng
    );
    
    // Only trigger warning for crime points between 0-1000m
    if (distance <= 1000 && distance < closestDistance) {
      closestDistance = distance;
      closestZoneIndex = i;
      closestIsCrimePoint = true;
    }
  }

  if (closestDistance <= warningRadius && closestZoneIndex !== -1) {
    return {
      level: 'warning',
      message: closestIsCrimePoint ? `You are near a crime incident location` : `You are near a crime zone`,
      zoneIndex: closestZoneIndex,
      zoneName: closestIsCrimePoint 
        ? (crimePoints[closestZoneIndex].title || 'Crime Incident')
        : (crimeZones[closestZoneIndex].title || 'Crime Zone'),
      distance: Math.round(closestDistance),
      isCrimePoint: closestIsCrimePoint,
    };
  }

  // Also check for crime points within 500m-1km range (extended warning)
  if (closestIsCrimePoint && closestDistance <= 1000 && closestZoneIndex !== -1) {
    return {
      level: 'warning',
      message: `You are near a crime incident location`,
      zoneIndex: closestZoneIndex,
      zoneName: crimePoints[closestZoneIndex].title || 'Crime Incident',
      distance: Math.round(closestDistance),
      isCrimePoint: true,
    };
  }

  // User is safe
  return {
    level: 'safe',
    message: 'You are in a safe area',
  };
}

// Legacy function for backward compatibility
export function checkRedZoneEntry(
  userLocation: { lat: number; lng: number },
  redZones: Array<{ coordinates: Array<{ lat: number; lng: number }> }>
): { isInRedZone: boolean; zoneIndex: number } {
  for (let i = 0; i < redZones.length; i++) {
    if (isPointInPolygon(userLocation, redZones[i].coordinates)) {
      return { isInRedZone: true, zoneIndex: i };
    }
  }
  return { isInRedZone: false, zoneIndex: -1 };
}
