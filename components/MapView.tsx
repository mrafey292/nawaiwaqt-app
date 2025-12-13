import { alarmManager } from '@/utils/alarmSound';
import { setRedZonePolygons, startBackgroundLocationTracking, stopBackgroundLocationTracking } from '@/utils/backgroundLocation';
import { checkRedZoneEntry } from '@/utils/geofence';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, StyleSheet, TouchableOpacity, Vibration, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { ThemedText } from './themed-text';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface UserLocation {
  latitude: number;
  longitude: number;
}

interface MarkerLocation {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
}

interface PolygonArea {
  coordinates: Array<{ lat: number; lng: number }>;
  title?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
  clusterId?: number; // Add cluster ID for reference
}

interface MapComponentProps {
  markers?: MarkerLocation[];
  polygons?: PolygonArea[];
  showClusterPoints?: boolean; // Option to show/hide cluster boundary points
}

export default function MapComponent({ markers = [], polygons = [], showClusterPoints = true }: MapComponentProps) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInRedZone, setIsInRedZone] = useState(false);
  const [currentZoneName, setCurrentZoneName] = useState<string>('');
  const [showAlarmBanner, setShowAlarmBanner] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const bannerOpacity = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Request notification permissions and setup background tracking
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }

      // Initialize alarm sound manager
      await alarmManager.initialize();

      // Set polygons for background task and start background tracking
      if (polygons.length > 0) {
        setRedZonePolygons(polygons);
        const started = await startBackgroundLocationTracking();
        if (!started) {
          Alert.alert(
            'Background Tracking',
            'Background location permission is required for red zone alerts when the app is closed.',
            [{ text: 'OK' }]
          );
        }
      }
    })();

    return () => {
      // Cleanup on unmount
      stopBackgroundLocationTracking();
    };
  }, []);

  // Pulsing animation for alarm banner
  useEffect(() => {
    if (showAlarmBanner) {
      // Fade in banner
      Animated.timing(bannerOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // Start pulsing animation
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        pulse.stop();
      };
    } else {
      // Fade out banner
      Animated.timing(bannerOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showAlarmBanner]);

  // Function to play alarm (using vibration and audio)
  const playAlarm = async () => {
    try {
      // Vibrate in pattern: wait 0ms, vibrate 1000ms, wait 500ms, vibrate 1000ms
      Vibration.vibrate([0, 1000, 500, 1000]);
      
      // Play loud audio alarm
      await alarmManager.playAlarm();
    } catch (error) {
      console.error('Error triggering alarm:', error);
    }
  };

  // Function to send notification
  const sendRedZoneNotification = async (zoneName: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🚨 RED ZONE ALERT! 🚨',
        body: `You are in: ${zoneName}. Please be cautious!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // Send immediately
    });
  };

  // Function to dismiss alarm
  const dismissAlarm = async () => {
    setShowAlarmBanner(false);
    setIsInRedZone(false);
    setCurrentZoneName('');
    stopContinuousAlarm();
    await alarmManager.stopAlarm();
  };

  // Function to start continuous alarm
  const startContinuousAlarm = async (zoneName: string) => {
    // Clear any existing interval
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
    }

    // Show alarm banner
    setShowAlarmBanner(true);

    // Play alarm immediately
    await playAlarm();
    await sendRedZoneNotification(zoneName);

    // Set up interval to repeat alarm every 10 seconds
    alarmIntervalRef.current = setInterval(async () => {
      await playAlarm();
      await sendRedZoneNotification(zoneName);
    }, 10000); // 10 seconds
  };

  // Function to stop continuous alarm
  const stopContinuousAlarm = async () => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    await alarmManager.stopAlarm();
    setShowAlarmBanner(false);
  };

  // Function to check and handle red zone entry
  const handleLocationUpdate = async (currentLocation: Location.LocationObject) => {
    const userPos = {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
    };

    const redZoneCheck = checkRedZoneEntry(userPos, polygons);

    if (redZoneCheck.isInRedZone) {
      const zone = polygons[redZoneCheck.zoneIndex];
      const zoneName = zone.title || 'Red Zone';

      if (!isInRedZone) {
        // User just entered a red zone
        setIsInRedZone(true);
        setCurrentZoneName(zoneName);
        await startContinuousAlarm(zoneName);

        // Show alert
        Alert.alert(
          '🚨 RED ZONE ALERT! 🚨',
          `You are entering: ${zoneName}. Continuous alerts will sound while you remain in this zone.`,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } else if (!redZoneCheck.isInRedZone && isInRedZone) {
      // User left the red zone
      setIsInRedZone(false);
      setCurrentZoneName('');
      await stopContinuousAlarm();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          setLoading(false);
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({});
        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        setLoading(false);

        // Check initial position
        await handleLocationUpdate(currentLocation);

        // Start watching location for continuous monitoring
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000, // Update every 5 seconds
            distanceInterval: 10, // Or when moved 10 meters
          },
          async (newLocation) => {
            setLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            });
            await handleLocationUpdate(newLocation);
          }
        );
      } catch (error) {
        setErrorMsg('Error getting location');
        setLoading(false);
        console.error(error);
      }
    })();

    // Cleanup function
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      stopContinuousAlarm();
      alarmManager.stopAlarm();
    };
  }, [polygons]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <ThemedText>Loading map...</ThemedText>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>{errorMsg}</ThemedText>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.errorContainer}>
        <ThemedText>Unable to get location</ThemedText>
      </View>
    );
  }

  // Generate HTML with Leaflet.js using OpenStreetMap tiles
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body { margin: 0; padding: 0; }
          #map { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Initialize map centered on user location
          const map = L.map('map').setView([${location.latitude}, ${location.longitude}], 13);
          
          // Add OpenStreetMap tile layer
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);
          
          // Add marker for user location
          const userMarker = L.marker([${location.latitude}, ${location.longitude}], {
            icon: L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41]
            })
          }).addTo(map);
          userMarker.bindPopup('<b>You are here</b><br>Your current location').openPopup();
          
          // Add circle to show accuracy
          L.circle([${location.latitude}, ${location.longitude}], {
            color: 'blue',
            fillColor: '#30a3ec',
            fillOpacity: 0.2,
            radius: 100
          }).addTo(map);
          
          // Add polygons from props
          const polygonAreas = ${JSON.stringify(polygons)};
          const showClusterPoints = ${showClusterPoints};
          
          polygonAreas.forEach((polygon) => {
            const coordinates = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
            
            // Draw the polygon
            const poly = L.polygon(coordinates, {
              color: polygon.color || '#3388ff',
              fillColor: polygon.fillColor || '#3388ff',
              fillOpacity: polygon.fillOpacity || 0.3,
              weight: 2
            }).addTo(map);
            
            if (polygon.title || polygon.description) {
              const popupContent = '<b>' + (polygon.title || 'Area') + '</b>' + 
                                  (polygon.description ? '<br>' + polygon.description : '');
              poly.bindPopup(popupContent);
            }
            
            // Add markers for each boundary/outlier point if enabled
            if (showClusterPoints) {
              polygon.coordinates.forEach((coord, index) => {
                const pointMarker = L.circleMarker([coord.lat, coord.lng], {
                  radius: 5,
                  fillColor: '#ff6600',
                  color: '#ffffff',
                  weight: 2,
                  opacity: 1,
                  fillOpacity: 0.9
                }).addTo(map);
                
                const pointPopup = '<b>' + (polygon.title || 'Cluster') + '</b>' +
                                  '<br>Boundary Point ' + (index + 1) +
                                  '<br>Lat: ' + coord.lat.toFixed(6) +
                                  '<br>Lng: ' + coord.lng.toFixed(6);
                pointMarker.bindPopup(pointPopup);
              });
            }
          });
          
          // Set initial view to 20km x 20km radius around current location
          // ~0.09 degrees latitude = ~10km, ~0.12 degrees longitude at ~33°N = ~10km
          const userLat = ${location.latitude};
          const userLng = ${location.longitude};
          const latOffset = 0.09; // ~10km north/south
          const lngOffset = 0.12; // ~10km east/west at this latitude
          
          const bounds = L.latLngBounds(
            [userLat - latOffset, userLng - lngOffset], // Southwest corner
            [userLat + latOffset, userLng + lngOffset]  // Northeast corner
          );
          map.fitBounds(bounds, { padding: [20, 20] });
        </script>
      </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
      
      {/* Red Zone Alarm Banner */}
      {showAlarmBanner && (
        <Animated.View 
          style={[
            styles.alarmBanner,
            {
              opacity: bannerOpacity,
              transform: [{ scale: pulseAnimation }],
            }
          ]}
        >
          <View style={styles.alarmContent}>
            <ThemedText style={styles.alarmEmoji}>🚨</ThemedText>
            <View style={styles.alarmTextContainer}>
              <ThemedText style={styles.alarmTitle}>RED ZONE ALERT!</ThemedText>
              <ThemedText style={styles.alarmZoneName}>{currentZoneName}</ThemedText>
              <ThemedText style={styles.alarmMessage}>You are in a hot zone! Please leave immediately.</ThemedText>
            </View>
            <TouchableOpacity 
              style={styles.dismissButton}
              onPress={dismissAlarm}
            >
              <ThemedText style={styles.dismissButtonText}>DISMISS</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alarmBanner: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: '#ff0000',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  alarmContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  alarmEmoji: {
    fontSize: 40,
  },
  alarmTextContainer: {
    flex: 1,
    gap: 4,
  },
  alarmTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  alarmZoneName: {
    color: '#ffff00',
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  alarmMessage: {
    color: '#ffffff',
    fontSize: 14,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dismissButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: '#ff0000',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
