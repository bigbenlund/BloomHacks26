import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Charger } from '@/constants/chargers';

declare global {
  interface Window {
    google: any;
    initMap: any;
  }
}

const GOOGLE_MAPS_DARK_THEME = [
  { "elementType": "geometry", "stylers": [{ "color": "#090d16" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#090d16" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#f8fafc" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#131f24" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#10b981" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#131924" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#334155" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#131924" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0b0f19" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#1e293b" }] }
];

const DEFAULT_CENTER = { lat: 34.020, lng: -118.485 }; // Santa Monica fallback

interface EVMapProps {
  chargers: Charger[];
  selectedCharger: Charger | null;
  onSelectCharger: (charger: Charger) => void;
  routeToCharger: Charger | null;
  userLocation: { latitude: number; longitude: number } | null;
}

export function EVMap({ chargers, selectedCharger, onSelectCharger, routeToCharger, userLocation }: EVMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const [mapLoaded, setMapLoaded] = React.useState(false);

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const getUserLatLng = React.useCallback(() => {
    if (userLocation) {
      return { lat: userLocation.latitude, lng: userLocation.longitude };
    }
    return DEFAULT_CENTER;
  }, [userLocation]);

  // 1. Initial Google Map Loading and setup
  useEffect(() => {
    if (typeof window === 'undefined' || !containerRef.current) return;

    const initializeMap = () => {
      if (!window.google || !window.google.maps) return;

      const userLatLng = getUserLatLng();
      const mapOptions = {
        center: userLatLng,
        zoom: 13,
        styles: GOOGLE_MAPS_DARK_THEME,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: false,
        rotateControl: false,
        fullscreenControl: true,
      };

      // Create map
      const map = new window.google.maps.Map(containerRef.current, mapOptions);
      mapRef.current = map;

      // Directions renderer setup
      directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
        map: map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#06b6d4',
          strokeWeight: 5,
          strokeOpacity: 0.8,
        }
      });

      // Add user location marker
      userMarkerRef.current = new window.google.maps.Marker({
        position: userLatLng,
        map: map,
        title: "Your Geolocation Position",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#00f0ff',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        }
      });
      
      const userInfoWindow = new window.google.maps.InfoWindow({
        content: '<div style="color:#090d16; font-family:sans-serif; font-size:12px; font-weight:bold; padding:2px;">Your EV Current Location</div>'
      });
      userMarkerRef.current.addListener('click', () => {
        userInfoWindow.open(map, userMarkerRef.current);
      });

      setMapLoaded(true);
    };

    // If script isn't loaded, load it.
    if (!window.google || !window.google.maps) {
      const scriptId = 'google-maps-api-script';
      let script = document.getElementById(scriptId) as HTMLScriptElement;
      
      if (!script) {
        script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,directions`;
        script.async = true;
        script.defer = true;
        script.onload = initializeMap;
        document.head.appendChild(script);
      } else {
        script.addEventListener('load', initializeMap);
      }
    } else {
      initializeMap();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Handle userLocation prop updates to adjust user location marker
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !userMarkerRef.current || !window.google) return;
    
    const userLatLng = getUserLatLng();
    userMarkerRef.current.setPosition(userLatLng);
    
    if (!routeToCharger) {
      mapRef.current.setCenter(userLatLng);
    }
  }, [mapLoaded, userLocation, getUserLatLng, routeToCharger]);

  // 2. Clear & Redraw charger pins whenever chargers array updates
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !window.google) return;

    // Clear old charger markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Redraw markers
    chargers.forEach((charger) => {
      const isSecure = charger.status === 'secure';
      const color = isSecure ? '#10b981' : '#ef4444'; // Emerald vs. Alarm Red
      const scale = isSecure ? 7 : 8;

      // Custom shape: Shield or octagon
      const path = isSecure
        ? "M 0,-10 L 8,-6 L 8,2 C 8,7 4,11 0,13 C -4,11 -8,7 -8,2 L -8,-6 Z" // Shield
        : "M -5,-10 L 5,-10 L 10,-5 L 10,5 L 5,10 L -5,10 L -10,5 L -10,-5 Z"; // Octagon Alert

      const marker = new window.google.maps.Marker({
        position: { lat: charger.latitude, lng: charger.longitude },
        map: mapRef.current,
        title: charger.name,
        icon: {
          path: path,
          fillColor: color,
          fillOpacity: 0.9,
          scale: scale / 7,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
        }
      });

      marker.addListener('click', () => {
        onSelectCharger(charger);
      });

      markersRef.current.push(marker);
    });
  }, [mapLoaded, chargers, onSelectCharger]);

  // 3. Handle route creation using live user geolocation origin
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !directionsRendererRef.current || !window.google) return;

    if (routeToCharger) {
      const directionsService = new window.google.maps.DirectionsService();
      const userLatLng = getUserLatLng();
      
      directionsService.route(
        {
          origin: userLatLng,
          destination: { lat: routeToCharger.latitude, lng: routeToCharger.longitude },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            directionsRendererRef.current.setDirections(result);
            
            // Adjust zoom to fit the route nicely
            const bounds = new window.google.maps.LatLngBounds();
            bounds.extend(new window.google.maps.LatLng(userLatLng.lat, userLatLng.lng));
            bounds.extend(new window.google.maps.LatLng(routeToCharger.latitude, routeToCharger.longitude));
            mapRef.current.fitBounds(bounds);
          } else {
            console.error("Directions request failed: " + status);
          }
        }
      );
    } else {
      // Clear route
      directionsRendererRef.current.setDirections({ routes: [] });
      const userLatLng = getUserLatLng();
      mapRef.current.setCenter(userLatLng);
      mapRef.current.setZoom(13);
    }
  }, [mapLoaded, routeToCharger, userLocation, getUserLatLng]);

  // 4. Handle zooming / pan when charger selection changes from sidebar
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedCharger || !window.google) return;
    
    mapRef.current.panTo({ lat: selectedCharger.latitude, lng: selectedCharger.longitude });
    mapRef.current.setZoom(14);
  }, [mapLoaded, selectedCharger]);

  return (
    <View style={styles.mapContainer}>
      <div 
        ref={containerRef} 
        style={{ width: '100%', height: '100%', borderRadius: '16px', overflow: 'hidden' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
});
