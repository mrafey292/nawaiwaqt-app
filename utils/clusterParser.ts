interface ClusterBoundaryPoint {
  point_id: string;
  longitude: number;
  latitude: number;
}

interface ApiCluster {
  cluster_id: number;
  boundary: ClusterBoundaryPoint[];
}

interface ApiClustersResponse {
  clusters: ApiCluster[];
}

export interface PolygonArea {
  coordinates: Array<{ lat: number; lng: number }>;
  title?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  clusterId?: number;
}

/**
 * Transform a single API cluster to app polygon format
 */
export function parseCluster(apiCluster: ApiCluster): PolygonArea {
  // Transform boundary points from {longitude, latitude} to {lat, lng}
  const coordinates = apiCluster.boundary.map(point => ({
    lat: point.latitude,
    lng: point.longitude,
  }));

  return {
    coordinates,
    title: `Cluster ${apiCluster.cluster_id}`,
    description: `High alert area - exercise caution`,
    color: '#ff0000',
    fillColor: '#ff0000',
    fillOpacity: 0.4,
    clusterId: apiCluster.cluster_id,
  };
}

/**
 * Transform API clusters response to array of polygon areas
 */
export function parseClusters(apiResponse: ApiClustersResponse): PolygonArea[] {
  return apiResponse.clusters.map(cluster => parseCluster(cluster));
}

/**
 * Filter clusters by proximity to a location
 * @param clusters - Array of polygon areas
 * @param userLocation - User's current location {lat, lng}
 * @param radiusKm - Radius in kilometers
 */
export function filterClustersByProximity(
  clusters: PolygonArea[],
  userLocation: { lat: number; lng: number },
  radiusKm: number
): PolygonArea[] {
  return clusters.filter(cluster => {
    // Check if any coordinate in the polygon is within radius
    return cluster.coordinates.some(coord => {
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        coord.lat,
        coord.lng
      );
      return distance <= radiusKm;
    });
  });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
