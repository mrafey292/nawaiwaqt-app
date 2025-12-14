import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AlertLevel, checkProximityAlerts } from './geofence';

const BACKGROUND_LOCATION_TASK = 'background-location-task';

interface PolygonArea {
  coordinates: Array<{ lat: number; lng: number }>;
  title?: string;
  description?: string;
  color?: string;
  fillColor?: string;
  fillOpacity?: number;
}

interface CrimePoint {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
}

let redZonePolygons: PolygonArea[] = [];
let crimePoints: CrimePoint[] = [];
let currentAlertLevel: AlertLevel = 'safe';
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 30000; // 30 seconds between notifications

// Function to set polygons from the app
export function setRedZonePolygons(polygons: PolygonArea[]) {
  redZonePolygons = polygons;
}

// Function to set crime points from the app
export function setCrimePoints(points: CrimePoint[]) {
  crimePoints = points;
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

      // Check proximity with three alert levels (including crime points)
      const proximityAlert = checkProximityAlerts(
        userPos,
        redZonePolygons,
        0, // Inside = critical
        500, // 500m = warning
        crimePoints // Individual crime points
      );

      const now = Date.now();
      const previousLevel = currentAlertLevel;
      currentAlertLevel = proximityAlert.level;

      // Only send notification if:
      // 1. Alert level changed, OR
      // 2. Still in critical zone and cooldown passed
      const shouldNotify =
        previousLevel !== currentAlertLevel ||
        (currentAlertLevel === 'critical' && now - lastNotificationTime > NOTIFICATION_COOLDOWN);

      if (shouldNotify) {
        if (currentAlertLevel === 'critical') {
          // CRITICAL: Inside crime hotspot - HIGH ALARM
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '🚨 DANGER! CRIME HOTSPOT ALERT! 🚨',
              body: `You are inside ${proximityAlert.zoneName}! Leave immediately for your safety!`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.MAX,
              vibrate: [0, 500, 200, 500],
              data: { level: 'critical', zone: proximityAlert.zoneName },
            },
            trigger: null,
          });
          lastNotificationTime = now;
        } else if (currentAlertLevel === 'warning') {
          // WARNING: Near crime zone - Moderate alert
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '⚠️ Warning: Approaching Crime Zone',
              body: `You are ${proximityAlert.distance}m from ${proximityAlert.zoneName}. Stay alert and avoid the area.`,
              sound: true,
              priority: Notifications.AndroidNotificationPriority.HIGH,
              vibrate: [0, 250, 250],
              data: { level: 'warning', zone: proximityAlert.zoneName, distance: proximityAlert.distance },
            },
            trigger: null,
          });
          lastNotificationTime = now;
        } else if (previousLevel !== 'safe') {
          // SAFE: Left dangerous area
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '✅ Safe Zone',
              body: 'You are now in a safe area.',
              sound: false,
              priority: Notifications.AndroidNotificationPriority.DEFAULT,
              data: { level: 'safe' },
            },
            trigger: null,
          });
          lastNotificationTime = now;
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
      timeInterval: 5000, // Update every 5 seconds for better proximity detection
      distanceInterval: 25, // Or when moved 25 meters
      foregroundService: {
        notificationTitle: 'Crime Zone Monitor Active',
        notificationBody: 'Monitoring your location for crime zones',
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
