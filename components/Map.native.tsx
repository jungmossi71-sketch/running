import React, { useEffect, useRef } from 'react';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export default function Map({ route, lineColor = '#39FF14' }: { route: {latitude: number, longitude: number}[], lineColor?: string }) {
  const mapRef = useRef<MapView>(null);
  const isFirstLocation = useRef(true);

  useEffect(() => {
    if (route.length > 0 && mapRef.current) {
      const lastCoord = route[route.length - 1];
      
      // 첫 번째 위치가 잡혔을 때 또는 이동 중에 화면 중앙 추적
      // 원한다면 isFirstLocation.current 조건으로 처음에만 튀게 할 수도 있음
      mapRef.current.animateToRegion({
        latitude: lastCoord.latitude,
        longitude: lastCoord.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
      
      if (isFirstLocation.current) {
        isFirstLocation.current = false;
      }
    }
  }, [route]);

  return (
    <MapView 
      ref={mapRef}
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
        <Polyline coordinates={route} strokeColor={lineColor} strokeWidth={2} />
      )}
    </MapView>
  );
}
