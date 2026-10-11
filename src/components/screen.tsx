import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/theme-provider';
import { spacing, typography } from '@/theme/tokens';

interface Props {
  title: string;
  subtitle?: string;
  scroll?: boolean;
  right?: ReactNode;
}

export function Screen({ title, subtitle, scroll = true, right, children }: PropsWithChildren<Props>) {
  const { colors } = useTheme();

  const header = (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        {subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
        <Text style={[typography.title, { color: colors.text }]}>{title}</Text>
      </View>
      {right}
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {header}
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content]}>
          {header}
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function SectionTitle({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <Text style={[typography.heading, styles.section, { color: colors.text }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg },
  subtitle: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  section: { marginTop: spacing.xl, marginBottom: spacing.md },
});
