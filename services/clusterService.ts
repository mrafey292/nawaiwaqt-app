import { filterClustersByProximity, parseClusters, PolygonArea } from '@/utils/clusterParser';
import { fetchClustersWithRetry } from './api';

/**
 * Load clusters from API and transform to polygon format
 */
export async function loadClusters(): Promise<PolygonArea[]> {
  try {
    const apiResponse = await fetchClustersWithRetry();
    const polygons = parseClusters(apiResponse);
    console.log(`Loaded ${polygons.length} clusters from API`);
    return polygons;
  } catch (error) {
    console.error('Failed to load clusters:', error);
    throw error;
  }
}

/**
 * Load clusters filtered by proximity to user location
 */
export async function loadClustersNearby(
  userLocation: { lat: number; lng: number },
  radiusKm: number = 100
): Promise<PolygonArea[]> {
  try {
    const allClusters = await loadClusters();
    const nearbyClusters = filterClustersByProximity(allClusters, userLocation, radiusKm);
    console.log(`Filtered to ${nearbyClusters.length} clusters within ${radiusKm}km`);
    return nearbyClusters;
  } catch (error) {
    console.error('Failed to load nearby clusters:', error);
    throw error;
  }
}
