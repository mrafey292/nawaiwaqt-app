import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert, Vibration } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useAudioPlayer } from 'expo-audio';
import { ThemedText } from './themed-text';
import { checkRedZoneEntry } from '@/utils/geofence';

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
}

interface MapComponentProps {
  markers?: MarkerLocation[];
  polygons?: PolygonArea[];
}

export default function MapComponent({ markers = [], polygons = [] }: MapComponentProps) {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isInRedZone, setIsInRedZone] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Request notification permissions
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    })();
  }, []);

  // Function to play alarm (using vibration as fallback)
  const playAlarm = () => {
    try {
      // Vibrate in pattern: wait 0ms, vibrate 1000ms, wait 500ms, vibrate 1000ms
      Vibration.vibrate([0, 1000, 500, 1000]);
    } catch (error) {
      console.error('Error triggering alarm:', error);
    }
  };

  // Function to send notification
  const sendRedZoneNotification = async (zoneName: string) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚠️ Red Zone Alert!',
        body: `You are entering: ${zoneName}. Please be cautious!`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Send immediately
    });
  };

  // Function to check and handle red zone entry
  const handleLocationUpdate = async (currentLocation: Location.LocationObject) => {
    const userPos = {
      lat: currentLocation.coords.latitude,
      lng: currentLocation.coords.longitude,
    };

    const redZoneCheck = checkRedZoneEntry(userPos, polygons);

    if (redZoneCheck.isInRedZone && !isInRedZone) {
      // User just entered a red zone
      setIsInRedZone(true);
      const zone = polygons[redZoneCheck.zoneIndex];
      const zoneName = zone.title || 'Red Zone';

      // Play alarm (vibration)
      playAlarm();

      // Send notification
      await sendRedZoneNotification(zoneName);

      // Show alert
      Alert.alert(
        '⚠️ Red Zone Alert!',
        `You are entering: ${zoneName}`,
        [{ text: 'OK', style: 'default' }]
      );
    } else if (!redZoneCheck.isInRedZone && isInRedZone) {
      // User left the red zone
      setIsInRedZone(false);
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
          
          // Add custom markers from props
          const markerLocations = ${JSON.stringify(markers)};
          markerLocations.forEach((loc) => {
            const marker = L.marker([loc.lat, loc.lng], {
              icon: L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
              })
            }).addTo(map);
            
            const popupContent = '<b>' + (loc.title || 'Location') + '</b>' + 
                                (loc.description ? '<br>' + loc.description : '');
            marker.bindPopup(popupContent);
          });
          
          // Add polygons from props
          const polygonAreas = ${JSON.stringify(polygons)};
          polygonAreas.forEach((polygon) => {
            const coordinates = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
            
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
          });
          
          // Fit map to show all markers and polygons if there are any
          const allPoints = [[${location.latitude}, ${location.longitude}]];
          
          if (markerLocations.length > 0) {
            allPoints.push(...markerLocations.map(loc => [loc.lat, loc.lng]));
          }
          
          if (polygonAreas.length > 0) {
            polygonAreas.forEach(polygon => {
              allPoints.push(...polygon.coordinates.map(coord => [coord.lat, coord.lng]));
            });
          }
          
          if (allPoints.length > 1) {
            const bounds = L.latLngBounds(allPoints);
            map.fitBounds(bounds, { padding: [50, 50] });
          }
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
});
