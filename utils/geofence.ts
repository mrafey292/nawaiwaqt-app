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

// Check if user is in any red zone
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
