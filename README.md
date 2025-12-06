# Nawaiwaqt App 🚨

A React Native mobile application built with Expo that provides real-time location-based alerts when users enter designated red zones. Features background monitoring, loud audio alarms that bypass silent mode, and persistent notifications.

## Features ✨

- 🗺️ **Interactive Map** with red zone polygons
- 📍 **Real-time Location Tracking** with high accuracy
- 🔊 **Loud Audio Alarms** that play even on silent/vibrate mode
- 📱 **Background Service** - continues monitoring when app is closed
- 🚨 **Visual Alert Banner** with dismiss button
- 🔔 **High-Priority Notifications**
- 📳 **Vibration Patterns** for alerts
- 🎯 **Geofencing** with polygon-based red zones

## Technologies Used

- **Expo** - Development framework
- **React Native** - Mobile app framework
- **TypeScript** - Type-safe JavaScript
- **expo-location** - Location services
- **expo-task-manager** - Background tasks
- **expo-av** - Audio playback
- **expo-notifications** - Push notifications
- **Leaflet.js** - Interactive maps
- **react-native-webview** - Map rendering

## Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator / Android Emulator or physical device

### Setup

```bash
# Clone the repository
git clone https://github.com/mrafey292/nawaiwaqt-app.git
cd nawaiwaqt-app

# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Permissions Required

The app requires the following permissions:

**iOS:**
- Location When In Use
- Location Always (for background monitoring)
- Notifications
- Background Modes: location, audio

**Android:**
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- ACCESS_BACKGROUND_LOCATION
- VIBRATE
- FOREGROUND_SERVICE
- POST_NOTIFICATIONS

## How It Works

1. **Grant Permissions**: On first launch, grant location permissions (select "Always Allow")
2. **View Map**: See your current location and red zone polygons on the map
3. **Automatic Alerts**: 
   - When entering a red zone, you'll receive:
     - Visual alert banner on screen
     - Loud audio alarm (even on silent mode)
     - Vibration pattern
     - Push notification
4. **Background Monitoring**: The app continues monitoring even when closed
5. **Dismiss Alarm**: Tap the DISMISS button to stop the alarm manually

## Configuration

### Add Custom Red Zones

Edit `app/(tabs)/index.tsx` and add your polygon coordinates:

```typescript
const islamabadAreas = [
  {
    coordinates: [
      { lat: 33.7380, lng: 73.0580 },
      { lat: 33.7380, lng: 73.0780 },
      { lat: 33.7180, lng: 73.0780 },
      { lat: 33.7180, lng: 73.0580 }
    ],
    title: "Your Red Zone",
    description: "Description",
    color: "#ff0000",
    fillColor: "#ff0000",
    fillOpacity: 0.4
  }
];
```

### Customize Alarm Settings

In `components/MapView.tsx`:
- Change alarm interval (default: 10 seconds)
- Modify alarm sound URL or add local file
- Adjust notification priority and vibration patterns

## Project Structure

```
├── app/                    # Expo Router screens
│   └── (tabs)/
│       ├── index.tsx      # Home screen with map
│       ├── explore.tsx    # Explore screen
│       └── report.tsx     # Report screen
├── components/
│   ├── MapView.tsx        # Main map component with alerts
│   └── ...
├── utils/
│   ├── alarmSound.ts      # Audio alarm manager
│   ├── backgroundLocation.ts  # Background geofencing
│   └── geofence.ts        # Geofence calculations
├── assets/                # Images and resources
├── app.json              # Expo configuration
└── package.json          # Dependencies
```

## Building for Production

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## Known Issues & Notes

- Audio alarm currently uses an online URL. For production, add a local `alarm.mp3` file to assets.
- Background location tracking increases battery consumption
- iOS requires "Always Allow" location permission for background monitoring

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE file for details

## Author

Muhammad Rafey
- GitHub: [@mrafey292](https://github.com/mrafey292)
- Email: mrafey292@gmail.com

## Acknowledgments

- Built with Expo
- Map tiles from OpenStreetMap
- Uses Leaflet.js for interactive maps

---

For detailed feature documentation, see [RED_ZONE_FEATURES.md](./RED_ZONE_FEATURES.md)