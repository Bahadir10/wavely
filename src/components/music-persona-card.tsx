import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { useStatsStore } from '@/store/stats-store';
import { useI18n } from '@/store/settings-store';
import { radius, spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/theme-provider';

function formatListeningTime(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, seconds)} sn`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk`;
  const hours = (seconds / 3600).toFixed(1);
  return `${hours} saat`;
}

export function MusicPersonaCard() {
  const t = useI18n();
  const { isDark } = useTheme();
  const totalSeconds = useStatsStore((s) => s.totalSeconds);
  const persona = useStatsStore((s) => s.getPersona());
  const topStations = useStatsStore((s) => s.getTopStations(1));
  const topStation = topStations[0];

  return (
    <LinearGradient
      colors={
        isDark
          ? ['#261947', '#17122B', '#0F0C1B']
          : ['#F3E8FF', '#EDE9FE', '#FFFFFF']
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        {
          borderColor: isDark ? 'rgba(167, 139, 250, 0.28)' : 'rgba(167, 139, 250, 0.4)',
        },
      ]}
      testID="music-persona-card"
    >
      <View style={styles.headerRow}>
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeEmoji}>{persona.badge}</Text>
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.subHeader}>{t.musicPersona.toUpperCase()}</Text>
          <Text numberOfLines={1} style={[styles.personaTitle, { color: isDark ? '#FFFFFF' : '#1E1B4B' }]}>
            {persona.title}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: isDark ? '#C4B5FD' : '#4C1D95' }]}>
        {persona.description}
      </Text>

      <View style={styles.statsRow}>
        <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139, 92, 246, 0.12)' }]}>
          <Text style={styles.pillIcon}>⏱️</Text>
          <Text style={[styles.statPillText, { color: isDark ? '#F3E8FF' : '#4C1D95' }]}>
            {formatListeningTime(totalSeconds)}
          </Text>
        </View>

        <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139, 92, 246, 0.12)' }]}>
          <Text style={styles.pillIcon}>🎯</Text>
          <Text style={[styles.statPillText, { color: isDark ? '#F3E8FF' : '#4C1D95' }]}>
            #{persona.topGenre}
          </Text>
        </View>

        {topStation ? (
          <View
            style={[
              styles.statPill,
              styles.stationPill,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139, 92, 246, 0.12)' },
            ]}
          >
            <Text style={styles.pillIcon}>📻</Text>
            <Text
              numberOfLines={1}
              style={[styles.statPillText, { color: isDark ? '#F3E8FF' : '#4C1D95' }]}
            >
              {topStation.name}
            </Text>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    marginVertical: spacing.xs,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  badgeWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 24,
  },
  titleWrap: {
    flex: 1,
  },
  subHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#A78BFA',
    marginBottom: 2,
  },
  personaTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    gap: 5,
  },
  stationPill: {
    maxWidth: 160,
  },
  pillIcon: {
    fontSize: 12,
  },
  statPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
