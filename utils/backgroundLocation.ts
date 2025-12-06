import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { checkRedZoneEntry } from './geofence';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

interface PolygonArea {
  coordinates: Array<{ lat: number; lng: number }>;
  title?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

let redZonePolygons: PolygonArea[] = [];
let isCurrentlyInRedZone = false;

// Function to set polygons from the app
export function setRedZonePolygons(polygons: PolygonArea[]) {
  redZonePolygons = polygons;
}

// Define the background task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }: any) => {
  if (error) {
    console.error('Background location error:', error);
    return;
  }

  if (data) {
    const { locations } = data;
    const location = locations[0];

    if (location && redZonePolygons.length > 0) {
      const userPos = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      const redZoneCheck = checkRedZoneEntry(userPos, redZonePolygons);

      if (redZoneCheck.isInRedZone) {
        // User is in a red zone
        const zone = redZonePolygons[redZoneCheck.zoneIndex];
        const zoneName = zone.title || 'Red Zone';

        // Send high priority notification
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 RED ZONE ALERT! 🚨',
            body: `You are in: ${zoneName}. Please leave immediately!`,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 250, 250, 250],
          },
          trigger: null,
        });

        isCurrentlyInRedZone = true;
      } else {
        if (isCurrentlyInRedZone) {
          // User left the red zone
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '✅ Safe Zone',
              body: 'You have left the red zone.',
              sound: true,
            },
            trigger: null,
          });
          isCurrentlyInRedZone = false;
        }
      }
    }
  }
});

// Start background location tracking
export async function startBackgroundLocationTracking() {
  try {
    // Request background location permission
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    
    if (foregroundStatus !== 'granted') {
      console.log('Foreground location permission not granted');
      return false;
    }

    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    
    if (backgroundStatus !== 'granted') {
      console.log('Background location permission not granted');
      return false;
    }

    // Check if task is already registered
    const isTaskDefined = await TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK);
    if (!isTaskDefined) {
      console.log('Background task not defined');
      return false;
    }

    // Start location updates
    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: Location.Accuracy.High,
      timeInterval: 10000, // Update every 10 seconds
      distanceInterval: 50, // Or when moved 50 meters
      foregroundService: {
        notificationTitle: 'Red Zone Monitor Active',
        notificationBody: 'Monitoring your location for red zones',
        notificationColor: '#FF0000',
      },
      pausesUpdatesAutomatically: false,
      showsBackgroundLocationIndicator: true,
    });

    console.log('Background location tracking started');
    return true;
  } catch (error) {
    console.error('Error starting background location:', error);
    return false;
  }
}

// Stop background location tracking
export async function stopBackgroundLocationTracking() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      console.log('Background location tracking stopped');
    }
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
}

// Check if background tracking is active
export async function isBackgroundTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  } catch (error) {
    console.error('Error checking background tracking status:', error);
    return false;
  }
}
