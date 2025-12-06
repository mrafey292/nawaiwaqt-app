import MapComponent from '@/components/MapView';
import { StyleSheet, View } from 'react-native';

// Hardcoded locations in Islamabad, Pakistan
const islamabadLocations = [
  {
    lat: 33.6844,
    lng: 73.0479,
    title: "Faisal Mosque",
    description: "One of the largest mosques in the world"
  },
  {
    lat: 33.7294,
    lng: 73.0931,
    title: "Pakistan Monument",
    description: "National monument and museum"
  },
  {
    lat: 33.7077,
    lng: 73.0513,
    title: "Daman-e-Koh",
    description: "Viewing point in Margalla Hills"
  },
  {
    lat: 33.6973,
    lng: 73.0515,
    title: "Lok Virsa Museum",
    description: "National Institute of Folk and Traditional Heritage"
  },
  {
    lat: 33.7181,
    lng: 73.0776,
    title: "Rawal Lake",
    description: "Artificial reservoir"
  }
];

// Polygon areas in Islamabad
const islamabadAreas = [
  {
    coordinates: [
      { lat: 33.7380, lng: 73.0580 },
      { lat: 33.7380, lng: 73.0780 },
      { lat: 33.7180, lng: 73.0780 },
      { lat: 33.7180, lng: 73.0580 }
    ],
    title: "F-6 Sector",
    description: "Commercial and residential area",
    color: "#ff7800",
    fillColor: "#ff7800",
    fillOpacity: 0.4
  },
  {
    coordinates: [
      { lat: 33.6920, lng: 73.0350 },
      { lat: 33.6920, lng: 73.0550 },
      { lat: 33.6720, lng: 73.0550 },
      { lat: 33.6720, lng: 73.0350 }
    ],
    title: "F-7 Sector",
    description: "Popular shopping and residential area",
    color: "#00ff00",
    fillColor: "#00ff00",
    fillOpacity: 0.3
  },
  {
    coordinates: [
      { lat: 33.7100, lng: 73.0900 },
      { lat: 33.7250, lng: 73.1050 },
      { lat: 33.7050, lng: 73.1100 },
      { lat: 33.6950, lng: 73.0950 }
    ],
    title: "Lake View Park Area",
    description: "Recreational zone",
    color: "#0066ff",
    fillColor: "#0066ff",
    fillOpacity: 0.35
  },
  {
    coordinates: [
      { lat: 33.5863, lng: 73.1631 },
      { lat: 33.5863, lng: 73.1831 },
      { lat: 33.5663, lng: 73.1831 },
      { lat: 33.5663, lng: 73.1631 }
    ],
    title: "Designated Red Zone",
    description: "High alert area - exercise caution",
    color: "#ff0000",
    fillColor: "#ff0000",
    fillOpacity: 0.4
  },
  {
    coordinates: [
      { lat: 33.65384, lng: 73.00291 },
      { lat: 33.65384, lng: 72.98121 },
      { lat: 33.63584, lng: 72.98121 },
      { lat: 33.63584, lng: 73.00291 }
    ],
    title: "Cluster Zone",
    description: "2km x 2km area",
    color: "#ff00ff",
    fillColor: "#ff00ff",
    fillOpacity: 0.35
  }
];

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <MapComponent markers={islamabadLocations} polygons={islamabadAreas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
