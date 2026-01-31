import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled = false,
  loading = false,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.colors.text.inverse : theme.colors.primary} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.md,
  },
  primary: {
    backgroundColor: theme.colors.primary,
  },
  secondary: {
    backgroundColor: theme.colors.surface,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  size_sm: {
    height: 40,
    paddingHorizontal: theme.spacing.md,
  },
  size_md: {
    height: 48,
    paddingHorizontal: theme.spacing.lg,
  },
  size_lg: {
    height: 56,
    paddingHorizontal: theme.spacing.xl,
  },
  disabled: {
    backgroundColor: theme.colors.disabled,
  },
  text: {
    fontWeight: theme.typography.fontWeight.semiBold,
  },
  text_primary: {
    color: theme.colors.text.inverse,
  },
  text_secondary: {
    color: theme.colors.text.primary,
  },
  text_outline: {
    color: theme.colors.text.primary,
  },
  textSize_sm: {
    fontSize: theme.typography.fontSize.sm,
  },
  textSize_md: {
    fontSize: theme.typography.fontSize.md,
  },
  textSize_lg: {
    fontSize: theme.typography.fontSize.lg,
  },
  textDisabled: {
    color: theme.colors.text.tertiary,
  },
});
