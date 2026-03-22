import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Map({ route, lineColor = '#39FF14' }: { route: any[], lineColor?: string }) {
  return (
    <View style={[styles.mapOverlay, { paddingHorizontal: 20, justifyContent: 'center', flex: 1 }]}>
      <Ionicons name="map" size={40} color={lineColor} />
      <Text style={[styles.mapLoadingText, { textAlign: 'center', color: lineColor }]}>
        Web Google Maps{'\n'}Placeholder
      </Text>
      <Text style={[styles.mapSubText, { textAlign: 'center', marginTop: 8 }]}>
        (Native Google Maps correctly renders on iOS/Android device build)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapOverlay: {
    alignItems: 'center',
  },
  mapLoadingText: {
    color: '#39FF14',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  mapSubText: {
    color: '#AAA',
    fontSize: 10,
    marginTop: 4,
  },
});
