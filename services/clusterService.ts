import { CrimePoint, filterClustersByProximity, parseClusters, parseOutliers, PolygonArea } from '@/utils/clusterParser';
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
 * Load individual crime points (outliers) from API
 */
export async function loadCrimePoints(): Promise<CrimePoint[]> {
  try {
    const apiResponse = await fetchClustersWithRetry();
    const crimePoints = parseOutliers(apiResponse);
    console.log(`Loaded ${crimePoints.length} individual crime points from API`);
    return crimePoints;
  } catch (error) {
    console.error('Failed to load crime points:', error);
    throw error;
  }
}

/**
 * Load both clusters and crime points in a single API call
 */
export async function loadClustersAndCrimePoints(): Promise<{ clusters: PolygonArea[], crimePoints: CrimePoint[] }> {
  try {
    const apiResponse = await fetchClustersWithRetry();
    const clusters = parseClusters(apiResponse);
    const crimePoints = parseOutliers(apiResponse);
    console.log(`Loaded ${clusters.length} clusters and ${crimePoints.length} crime points from API`);
    return { clusters, crimePoints };
  } catch (error) {
    console.error('Failed to load clusters and crime points:', error);
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
