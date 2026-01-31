import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

interface SegmentedControlProps<T extends string> {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
  testID?: string;
}

export function SegmentedControl<T extends string>({
  options,
  selected,
  onSelect,
  testID,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.container} testID={testID}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.segment, selected === option.value && styles.segmentSelected]}
          onPress={() => onSelect(option.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.label, selected === option.value && styles.labelSelected]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.borderRadius.sm,
  },
  segmentSelected: {
    backgroundColor: theme.colors.background,
    ...theme.shadows.sm,
  },
  label: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.secondary,
  },
  labelSelected: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semiBold,
  },
});
