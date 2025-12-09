import MapComponent from '@/components/MapView';
import { ThemedText } from '@/components/themed-text';
import { loadClusters } from '@/services/clusterService';
import { PolygonArea } from '@/utils/clusterParser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const [clusters, setClusters] = useState<PolygonArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClustersFromApi();
  }, []);

  const loadClustersFromApi = async () => {
    try {
      setLoading(true);
      setError(null);
      const clusterData = await loadClusters();
      setClusters(clusterData);
      console.log(`Loaded ${clusterData.length} clusters successfully`);
    } catch (err) {
      const errorMessage = 'Failed to load red zone clusters. Please check your internet connection.';
      setError(errorMessage);
      console.error('Error loading clusters:', err);
      Alert.alert(
        'Error Loading Clusters',
        errorMessage,
        [
          { text: 'Retry', onPress: loadClustersFromApi },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff0000" />
        <ThemedText style={styles.loadingText}>Loading red zone clusters...</ThemedText>
      </View>
    );
  }

  if (error && clusters.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
        <ThemedText style={styles.retryText} onPress={loadClustersFromApi}>
          Tap to retry
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapComponent markers={[]} polygons={clusters} showClusterPoints={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ff0000',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 16,
    color: '#0066ff',
    textDecorationLine: 'underline',
  },
});
