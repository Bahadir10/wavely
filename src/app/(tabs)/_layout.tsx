import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/mini-player';
import { useI18n } from '@/store/settings-store';
import { useTheme } from '@/theme/theme-provider';

type IconName = keyof typeof Ionicons.glyphMap;
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ['home-outline', 'home'],
  search: ['search-outline', 'search'],
  favorites: ['heart-outline', 'heart'],
  settings: ['settings-outline', 'settings'],
};

/** Custom tab bar with localized labels and persistent mini player. */
function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors } = useTheme();
  const t = useI18n();
  const insets = useSafeAreaInsets();

  const tabLabels: Record<string, string> = {
    index: t.home,
    search: t.search,
    favorites: t.favorites,
    settings: t.settings,
  };

  return (
    <View>
      <MiniPlayer />
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const color = focused ? colors.primary : colors.textMuted;
          const [icon, activeIcon] = TAB_ICONS[route.name] ?? ['ellipse-outline', 'ellipse'];
          const label = tabLabels[route.name] ?? descriptors[route.key].options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.item}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <Ionicons name={focused ? activeIcon : icon} size={24} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '600' },
});
