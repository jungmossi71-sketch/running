import React from 'react';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export default function Map({ route, lineColor = '#39FF14' }: { route: {latitude: number, longitude: number}[], lineColor?: string }) {
  return (
    <MapView 
      provider={PROVIDER_GOOGLE}
      style={{ width: '100%', height: '100%' }}
      showsUserLocation
      followsUserLocation
      initialRegion={{
        latitude: route.length > 0 ? route[route.length - 1].latitude : 37.5665,
        longitude: route.length > 0 ? route[route.length - 1].longitude : 126.9780,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }}
    >
      {route.length > 0 && (
        <Polyline coordinates={route} strokeColor={lineColor} strokeWidth={5} />
      )}
    </MapView>
  );
}
