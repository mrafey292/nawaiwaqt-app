const API_BASE_URL = 'http://13.204.159.24:8000';
const API_KEY = 'WnVeVkkdOt';

interface ApiCluster {
  cluster_id: number;
  boundary: Array<{
    point_id: string;
    longitude: number;
    latitude: number;
  }>;
}

interface ApiClustersResponse {
  clusters: ApiCluster[];
}

/**
 * Fetch clusters from the API
 */
export async function fetchClusters(): Promise<ApiClustersResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/polygons`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: ApiClustersResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching clusters from API:', error);
    throw error;
  }
}

/**
 * Fetch clusters with retry logic
 */
export async function fetchClustersWithRetry(maxRetries = 3): Promise<ApiClustersResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fetchClusters();
    } catch (error) {
      lastError = error as Error;
      console.log(`Fetch attempt ${attempt} failed, retrying...`);
      
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  throw lastError || new Error('Failed to fetch clusters after retries');
}
