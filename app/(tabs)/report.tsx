import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getTestHotzone, setTestHotzone as setGlobalTestHotzone } from '@/utils/testHotzone';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { WebView } from 'react-native-webview';

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
  const [testHotzone, setTestHotzone] = useState(false);

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

  // Get user's current location on mount and check test hotzone state
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
    
    // Check if test hotzone is already active
    const currentTestHotzone = getTestHotzone();
    if (currentTestHotzone.enabled) {
      setTestHotzone(true);
    }
    
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
        <View style={styles.headerContainer}>
          <ThemedView style={styles.header}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="report-problem" size={36} color="#ff0000" />
            </View>
            <ThemedText type="title" style={styles.title}>
              Report a Crime
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Your report helps keep our community safe. All information is confidential.
            </ThemedText>
          </ThemedView>
        </View>

        <View style={styles.formCard}>
          {/* Crime Type Selection */}
          <View style={styles.formGroup}>
            <View style={styles.labelContainer}>
              <Ionicons name="alert-circle" size={20} color="#ff6b6b" />
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Crime Type
              </ThemedText>
              <View style={styles.requiredBadge}>
                <ThemedText style={styles.requiredText}>Required</ThemedText>
              </View>
            </View>
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
            <View style={styles.labelContainer}>
              <Ionicons name="document-text" size={20} color="#4a90e2" />
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Description
              </ThemedText>
              <View style={styles.requiredBadge}>
                <ThemedText style={styles.requiredText}>Required</ThemedText>
              </View>
            </View>
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
            <View style={styles.labelContainer}>
              <Ionicons name="location" size={20} color="#4CAF50" />
              <ThemedText type="defaultSemiBold" style={styles.label}>
                Incident Location
              </ThemedText>
              <View style={styles.requiredBadge}>
                <ThemedText style={styles.requiredText}>Required</ThemedText>
              </View>
            </View>
            {selectedLocation ? (
              <View style={styles.locationDisplay}>
                <View style={styles.locationIconWrapper}>
                  <Ionicons name="checkmark-circle" size={24} color="#2e7d32" />
                </View>
                <View style={styles.locationTextWrapper}>
                  <ThemedText style={styles.locationLabel}>Selected Location</ThemedText>
                  <ThemedText style={styles.locationText}>
                    {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={styles.noLocationDisplay}>
                <Ionicons name="information-circle" size={20} color="#8b6914" style={{ marginRight: 8 }} />
                <ThemedText style={styles.locationInfo}>No location selected yet</ThemedText>
              </View>
            )}
            <View style={styles.locationButtons}>
              <TouchableOpacity
                style={[styles.locationButton, styles.locationButtonPrimary]}
                onPress={() => setShowMap(true)}
              >
                <Ionicons name="map" size={20} color="#fff" />
                <ThemedText style={styles.locationButtonText}>Pick on Map</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.locationButton, styles.locationButtonSecondary]}
                onPress={useCurrentLocation}
              >
                <Ionicons name="navigate" size={20} color="#fff" />
                <ThemedText style={styles.locationButtonText}>Use Current</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <Ionicons name="hourglass" size={22} color="#fff" />
            ) : (
              <Ionicons name="send" size={22} color="#fff" />
            )}
            <ThemedText style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting Report...' : 'Submit Crime Report'}
            </ThemedText>
          </TouchableOpacity>

          {/* Test Hotzone Button - For Testing Only */}
          <TouchableOpacity
            style={[styles.testButton, testHotzone && styles.testButtonActive]}
            onPress={async () => {
              const newState = !testHotzone;
              
              if (newState) {
                // Get fresh current location
                try {
                  const { status } = await Location.requestForegroundPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permission Denied', 'Location permission is required to create test hotzone.');
                    return;
                  }
                  
                  const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                  });
                  
                  const currentLat = location.coords.latitude;
                  const currentLng = location.coords.longitude;
                  
                  // Set global state first
                  setGlobalTestHotzone(true, { lat: currentLat, lng: currentLng });
                  
                  // Then update local state
                  setTestHotzone(true);
                  
                  Alert.alert(
                    'Test Hotzone Created', 
                    `A 500m x 500m test hotzone has been created at your current location:\nLat: ${currentLat.toFixed(6)}\nLng: ${currentLng.toFixed(6)}\n\nGo to the Home tab to see it on the map!`
                  );
                } catch (error) {
                  console.error('Error getting location:', error);
                  Alert.alert('Error', 'Failed to get current location. Make sure GPS is enabled.');
                  setTestHotzone(false);
                }
              } else {
                // Remove global state first
                setGlobalTestHotzone(false, null);
                
                // Then update local state
                setTestHotzone(false);
                
                Alert.alert('Test Hotzone Removed', 'The test hotzone has been disabled.');
              }
            }}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={testHotzone ? "warning" : "warning-outline"} 
              size={22} 
              color={testHotzone ? "#fff" : "#ff9800"} 
            />
            <ThemedText style={[styles.testButtonText, testHotzone && styles.testButtonTextActive]}>
              {testHotzone ? '✓ Test Hotzone Active' : 'Create Test Hotzone'}
            </ThemedText>
          </TouchableOpacity>
          {testHotzone && userLocation && (
            <View style={styles.testInfoContainer}>
              <Ionicons name="information-circle" size={18} color="#ff9800" />
              <ThemedText style={styles.testInfo}>
                Test hotzone created at your location. Navigate to Home tab to see alerts.
              </ThemedText>
            </View>
          )}

          <View style={styles.disclaimerContainer}>
            <Ionicons name="shield-checkmark" size={18} color="#666" />
            <ThemedText style={styles.disclaimer}>
              Your information is confidential and will be shared with authorities to help keep our community safe.
            </ThemedText>
          </View>
        </View>
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
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  header: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.7,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    gap: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formGroup: {
    gap: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 16,
    flex: 1,
  },
  requiredBadge: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipSelected: {
    backgroundColor: '#ff0000',
    borderColor: '#ff0000',
    shadowColor: '#ff0000',
    shadowOpacity: 0.3,
    elevation: 3,
  },
  chipText: {
    fontSize: 14,
    color: '#555',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#000',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fafafa',
    color: '#000',
    minHeight: 120,
  },
  noLocationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff9e6',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffe0a3',
    marginBottom: 12,
  },
  locationInfo: {
    fontSize: 14,
    color: '#8b6914',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#a5d6a7',
  },
  locationIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextWrapper: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#2e7d32',
    fontWeight: '600',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#1b5e20',
    fontFamily: 'monospace',
  },
  locationButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  locationButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  locationButtonPrimary: {
    backgroundColor: '#2196F3',
  },
  locationButtonSecondary: {
    backgroundColor: '#4CAF50',
  },
  locationButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#ff0000',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 10,
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  testButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ff9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 10,
  },
  testButtonActive: {
    backgroundColor: '#ff9800',
    borderColor: '#ff9800',
  },
  testButtonText: {
    color: '#ff9800',
    fontSize: 15,
    fontWeight: 'bold',
  },
  testButtonTextActive: {
    color: '#fff',
  },
  testInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#ffcc80',
  },
  testInfo: {
    flex: 1,
    fontSize: 12,
    color: '#e65100',
    lineHeight: 18,
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  disclaimer: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    lineHeight: 16,
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
