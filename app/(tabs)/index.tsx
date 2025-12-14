import MapComponent from '@/components/MapView';
import { ThemedText } from '@/components/themed-text';
import { loadClustersAndCrimePoints } from '@/services/clusterService';
import { PolygonArea, CrimePoint } from '@/utils/clusterParser';
import { subscribeToTestHotzone, generateTestHotzonePolygon, getTestHotzone } from '@/utils/testHotzone';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

export default function HomeScreen() {
  const [clusters, setClusters] = useState<PolygonArea[]>([]);
  const [crimePoints, setCrimePoints] = useState<CrimePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadClustersFromApi();
  }, []);

  useEffect(() => {
    // Subscribe to test hotzone changes
    const unsubscribe = subscribeToTestHotzone((testData) => {
      if (testData.enabled && testData.location) {
        // Add test hotzone polygon
        const testPolygon = generateTestHotzonePolygon(testData.location.lat, testData.location.lng);
        setClusters(prevClusters => {
          // Remove any existing test hotzone
          const filteredClusters = prevClusters.filter(c => c.clusterId !== -1);
          return [...filteredClusters, testPolygon];
        });
      } else {
        // Remove test hotzone
        setClusters(prevClusters => prevClusters.filter(c => c.clusterId !== -1));
      }
    });
    
    return () => unsubscribe();
  }, []);

  const loadClustersFromApi = async () => {
    try {
      setLoading(true);
      setError(null);
      const { clusters: clusterData, crimePoints: crimePointData } = await loadClustersAndCrimePoints();
      
      // Check if there's an active test hotzone and add it
      const testHotzone = getTestHotzone();
      
      if (testHotzone.enabled && testHotzone.location) {
        const testPolygon = generateTestHotzonePolygon(testHotzone.location.lat, testHotzone.location.lng);
        setClusters([...clusterData, testPolygon]);
      } else {
        setClusters(clusterData);
      }
      
      setCrimePoints(crimePointData);
    } catch (err) {
      const errorMessage = 'Failed to load crime data. Please check your internet connection.';
      setError(errorMessage);
      console.error('Error loading data:', err);
      Alert.alert(
        'Error Loading Data',
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
        <ThemedText style={styles.loadingText}>Loading crime data...</ThemedText>
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
      <MapComponent 
        markers={[]} 
        polygons={clusters} 
        crimePoints={crimePoints}
        showClusterPoints={true} 
      />
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
