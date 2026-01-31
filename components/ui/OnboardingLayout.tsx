import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  progress: number;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  canContinue?: boolean;
  showBack?: boolean;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  progress,
  onBack,
  onContinue,
  continueLabel = 'Continue',
  canContinue = true,
  showBack = true,
}: OnboardingLayoutProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          {showBack && onBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
              <ArrowLeft size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <View style={styles.progressContainer}>
            <ProgressBar progress={progress} />
          </View>
          <View style={styles.backPlaceholder} />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.body}>{children}</View>
      </View>

      <View style={styles.footer}>
        <Button
          title={continueLabel}
          onPress={onContinue}
          disabled={!canContinue}
          testID="continue-button"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
    marginLeft: -theme.spacing.xs,
  },
  backPlaceholder: {
    width: 32,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  titleContainer: {
    marginTop: theme.spacing.xxl,
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    lineHeight: 32,
  },
  subtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
    lineHeight: 22,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
});
