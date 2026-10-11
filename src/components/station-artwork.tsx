import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Station } from '@/api/types';
import { gradientList, radius } from '@/theme/tokens';

interface Props {
  station: Station;
  size: number;
  rounded?: number;
}

/** Picks a stable gradient per station so fallbacks don't flicker between renders. */
export function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return gradientList[Math.abs(hash) % gradientList.length];
}

export function StationArtwork({ station, size, rounded = radius.md }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = !!station.favicon && !failed;

  return (
    <LinearGradient
      colors={gradientFor(station.stationuuid)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.box, { width: size, height: size, borderRadius: rounded }]}
    >
      {showImage ? (
        <View style={[styles.imageWrap, { borderRadius: rounded }]}>
          <Image
            source={{ uri: station.favicon }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            onError={() => setFailed(true)}
            transition={200}
          />
        </View>
      ) : (
        <Ionicons name="radio" size={size * 0.42} color="rgba(255,255,255,0.95)" />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imageWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
});
