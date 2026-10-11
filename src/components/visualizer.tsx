import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  active: boolean;
  color: string;
  bars?: number;
  height?: number;
}

function Bar({ index, active, color, height }: { index: number; active: boolean; color: string; height: number }) {
  const scale = useSharedValue(0.25);

  useEffect(() => {
    if (active) {
      const duration = 380 + ((index * 137) % 300);
      scale.value = withDelay((index * 60) % 400, withRepeat(withTiming(1, { duration }), -1, true));
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0.25, { duration: 250 });
    }
  }, [active, index, scale]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: scale.value }] }));

  return <Animated.View style={[styles.bar, { backgroundColor: color, height }, style]} />;
}

/** Decorative equalizer. Live streams expose no waveform data, so bars are animated procedurally. */
export function Visualizer({ active, color, bars = 24, height = 48 }: Props) {
  return (
    <View style={[styles.row, { height }]}>
      {Array.from({ length: bars }, (_, i) => (
        <Bar key={i} index={i} active={active} color={color} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bar: { width: 4, borderRadius: 2 },
});
