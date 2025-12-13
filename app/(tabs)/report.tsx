import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface LocationCoordinate {
  latitude: number;
  longitude: number;
}

export default function ReportCrimeScreen() {
  const [crimeType, setCrimeType] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationCoordinate | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationCoordinate | null>(null);

  const crimeTypes = [
    { label: 'Theft', value: 'theft' },
    { label: 'Assault', value: 'assault' },
    { label: 'Robbery', value: 'robbery' },
    { label: 'Vandalism', value: 'vandalism' },
    { label: 'Harassment', value: 'harassment' },
    { label: 'Murder', value: 'murder' },
    { label: 'Burglary', value: 'burglary' },
    { label: 'Other', value: 'other' },
  ];

  // Get user's current location on mount
  useEffect(() => {
    const getInitialLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setUserLocation(coords);
          setSelectedLocation(coords);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };
    getInitialLocation();
  }, []);

  const useCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setSelectedLocation(coords);
      Alert.alert('Success', 'Current location set');
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!crimeType) {
      Alert.alert('Validation Error', 'Please select a crime type');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please provide a description');
      return;
    }

    if (!selectedLocation) {
      Alert.alert('Validation Error', 'Please select a location on the map');
      return;
    }

    setIsSubmitting(true);

    try {
      // Create crime report payload matching API format
      // Format timestamp without milliseconds to match API example
      const now = new Date();
      const timestamp = now.toISOString().split('.')[0]; // Remove milliseconds and Z
      
      const payload = {
        event_type: crimeType,
        timestamp: timestamp,
        source_url: 'mobile_app',
        description: description.trim(),
        locations: [
          {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude,
          },
        ],
      };

      console.log('Submitting payload:', JSON.stringify(payload, null, 2));
      
      const response = await fetch('http://13.204.159.24:8000/log-crime-event', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'WnVeVkkdOt',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log('API Response Status:', response.status);
      console.log('API Response Body:', responseText);

      if (!response.ok) {
        throw new Error(`API error: ${response.status} - ${responseText}`);
      }

      Alert.alert(
        'Report Submitted',
        'Your crime report has been submitted successfully. Thank you for helping make our community safer.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setCrimeType('');
              setDescription('');
              // Keep location for next report
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please check your internet connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate map HTML for location picker
  const generateMapHTML = () => {
    const lat = selectedLocation?.latitude || userLocation?.latitude || 33.6;
    const lng = selectedLocation?.longitude || userLocation?.longitude || 73.0;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
            .confirm-button {
              position: absolute;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #ff0000;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: bold;
              z-index: 1000;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <button class="confirm-button" onclick="confirmLocation()">Confirm Location</button>
          <script>
            var map = L.map('map').setView([${lat}, ${lng}], 13);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors',
              maxZoom: 19
            }).addTo(map);
            
            var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
            marker.bindPopup('<b>Crime Location</b><br>Drag to adjust').openPopup();
            
            var selectedLat = ${lat};
            var selectedLng = ${lng};
            
            marker.on('dragend', function(e) {
              var pos = e.target.getLatLng();
              selectedLat = pos.lat;
              selectedLng = pos.lng;
              marker.setPopupContent('<b>Crime Location</b><br>Lat: ' + pos.lat.toFixed(6) + '<br>Lng: ' + pos.lng.toFixed(6));
            });
            
            map.on('click', function(e) {
              selectedLat = e.latlng.lat;
              selectedLng = e.latlng.lng;
              marker.setLatLng(e.latlng);
              marker.setPopupContent('<b>Crime Location</b><br>Lat: ' + e.latlng.lat.toFixed(6) + '<br>Lng: ' + e.latlng.lng.toFixed(6));
              marker.openPopup();
            });
            
            function confirmLocation() {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                latitude: selectedLat,
                longitude: selectedLng
              }));
            }
          </script>
        </body>
      </html>
    `;
  };

  const handleMapMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      setSelectedLocation({
        latitude: data.latitude,
        longitude: data.longitude,
      });
      setShowMap(false);
      Alert.alert('Location Set', `Lat: ${data.latitude.toFixed(6)}, Lng: ${data.longitude.toFixed(6)}`);
    } catch (error) {
      console.error('Error parsing map message:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedView style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Report a Crime
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Help us keep the community safe by reporting incidents
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.form}>
          {/* Crime Type Selection */}
          <View style={styles.formGroup}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Crime Type *
            </ThemedText>
            <View style={styles.chipContainer}>
              {crimeTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.chip,
                    crimeType === type.value && styles.chipSelected,
                  ]}
                  onPress={() => setCrimeType(type.value)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      crimeType === type.value && styles.chipTextSelected,
                    ]}
                  >
                    {type.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Description *
            </ThemedText>
            <TextInput
              style={styles.textArea}
              placeholder="Provide details about the incident..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          {/* Location Selection */}
          <View style={styles.formGroup}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Location *
            </ThemedText>
            {selectedLocation ? (
              <View style={styles.locationDisplay}>
                <ThemedText style={styles.locationText}>
                  Lat: {selectedLocation.latitude.toFixed(6)}{'\n'}
                  Lng: {selectedLocation.longitude.toFixed(6)}
                </ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.locationInfo}>
                No location selected
              </ThemedText>
            )}
            <View style={styles.locationButtons}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={() => setShowMap(true)}
              >
                <ThemedText style={styles.locationButtonText}>
                  📍 Pick on Map
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={useCurrentLocation}
              >
                <ThemedText style={styles.locationButtonText}>
                  📌 Use Current
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <ThemedText style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </ThemedText>
          </TouchableOpacity>

          <ThemedText style={styles.disclaimer}>
            * Required fields. Your report will help authorities take appropriate action.
          </ThemedText>
        </ThemedView>
      </ScrollView>

      {/* Map Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMap(false)}
            >
              <ThemedText style={styles.closeButtonText}>✕ Close</ThemedText>
            </TouchableOpacity>
            <ThemedText style={styles.mapTitle}>Select Crime Location</ThemedText>
          </View>
          <WebView
            source={{ html: generateMapHTML() }}
            style={styles.webview}
            onMessage={handleMapMessage}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
    fontSize: 14,
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  chipSelected: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
    minHeight: 120,
  },
  locationInfo: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  locationDisplay: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontFamily: 'monospace',
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  locationButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#ff0000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimer: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    marginTop: 8,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  mapTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginRight: 50,
  },
  webview: {
    flex: 1,
  },
});
