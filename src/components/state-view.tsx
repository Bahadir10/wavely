import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/theme-provider';
import { spacing } from '@/theme/tokens';

interface Props {
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Shared loading / empty / error placeholder. */
export function StateView({ loading, icon = 'radio-outline', title, message, onRetry }: Props) {
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={44} color={colors.textMuted} />
      {title && <Text style={[styles.title, { color: colors.text }]}>{title}</Text>}
      {message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}
      {onRetry && (
        <Pressable onPress={onRetry} style={[styles.retry, { backgroundColor: colors.primary }]}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', marginTop: spacing.sm },
  message: { fontSize: 14, textAlign: 'center' },
  retry: { marginTop: spacing.md, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 },
  retryText: { color: '#fff', fontWeight: '700' },
});
