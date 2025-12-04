import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface CrimeReport {
  crimeType: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  dateTime: string;
  reporterName?: string;
  reporterContact?: string;
}

export default function ReportCrimeScreen() {
  const [crimeType, setCrimeType] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const crimeTypes = ['Theft', 'Assault', 'Robbery', 'Vandalism', 'Harassment', 'Other'];

  // Get user's current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to report crime location.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Error', 'Failed to get current location');
      return null;
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

    setIsSubmitting(true);

    try {
      // Get current location
      const location = await getCurrentLocation();
      if (!location) {
        setIsSubmitting(false);
        return;
      }

      // Create crime report object
      const crimeReport: CrimeReport = {
        crimeType,
        description: description.trim(),
        location,
        dateTime: new Date().toISOString(),
        reporterName: reporterName.trim() || undefined,
        reporterContact: reporterContact.trim() || undefined,
      };

      // TODO: Replace with your actual API endpoint
      // await fetch('YOUR_API_ENDPOINT/report-crime', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(crimeReport),
      // });

      // For now, just log to console
      console.log('Crime Report:', crimeReport);

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
              setReporterName('');
              setReporterContact('');
              setUserLocation(null);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
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
                  key={type}
                  style={[
                    styles.chip,
                    crimeType === type && styles.chipSelected,
                  ]}
                  onPress={() => setCrimeType(type)}
                >
                  <ThemedText
                    style={[
                      styles.chipText,
                      crimeType === type && styles.chipTextSelected,
                    ]}
                  >
                    {type}
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

          {/* Reporter Name (Optional) */}
          <View style={styles.formGroup}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Your Name (Optional)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              value={reporterName}
              onChangeText={setReporterName}
            />
          </View>

          {/* Contact Information (Optional) */}
          <View style={styles.formGroup}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Contact Number (Optional)
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor="#999"
              keyboardType="phone-pad"
              value={reporterContact}
              onChangeText={setReporterContact}
            />
          </View>

          {/* Location Info */}
          <View style={styles.formGroup}>
            <ThemedText type="defaultSemiBold" style={styles.label}>
              Location
            </ThemedText>
            <ThemedText style={styles.locationInfo}>
              {userLocation
                ? `Lat: ${userLocation.latitude.toFixed(6)}, Lng: ${userLocation.longitude.toFixed(6)}`
                : 'Location will be automatically captured when you submit'}
            </ThemedText>
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
});
