import React, { useMemo } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, SegmentedControl, WheelPicker } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { MeasurementUnit } from '@/types/onboarding';
import { theme } from '@/constants/theme';

const unitOptions: { value: MeasurementUnit; label: string }[] = [
  { value: 'imperial', label: 'Imperial' },
  { value: 'metric', label: 'Metric' },
];

export default function MeasurementsScreen() {
  const router = useRouter();
  const { data, setMeasurementUnit, setHeight, setWeight } = useOnboarding();

  const isMetric = data.measurementUnit === 'metric';

  const heightItems = useMemo(() => {
    if (isMetric) {
      return Array.from({ length: 81 }, (_, i) => {
        const cm = 140 + i;
        return { value: cm, label: `${cm} cm` };
      });
    } else {
      const items: { value: number; label: string }[] = [];
      for (let ft = 4; ft <= 7; ft++) {
        for (let inch = 0; inch < 12; inch++) {
          if (ft === 7 && inch > 0) break;
          const cm = Math.round((ft * 12 + inch) * 2.54);
          items.push({ value: cm, label: `${ft}' ${inch}"` });
        }
      }
      return items;
    }
  }, [isMetric]);

  const weightItems = useMemo(() => {
    if (isMetric) {
      return Array.from({ length: 121 }, (_, i) => {
        const kg = 40 + i;
        return { value: kg, label: `${kg} kg` };
      });
    } else {
      return Array.from({ length: 261 }, (_, i) => {
        const lb = 90 + i;
        const kg = Math.round(lb * 0.453592);
        return { value: kg, label: `${lb} lb` };
      });
    }
  }, [isMetric]);

  return (
    <OnboardingLayout
      title="Height & weight"
      subtitle="This will be used to calibrate your custom plan."
      progress={0.2}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/birthdate')}
    >
      <View style={styles.container}>
        <SegmentedControl
          options={unitOptions}
          selected={data.measurementUnit}
          onSelect={(unit) => setMeasurementUnit(unit)}
        />

        <View style={styles.pickersRow}>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Height</Text>
            <WheelPicker
              items={heightItems}
              selectedValue={data.heightCm}
              onValueChange={(value) => setHeight(value as number)}
            />
          </View>
          <View style={styles.pickerColumn}>
            <Text style={styles.pickerLabel}>Weight</Text>
            <WheelPicker
              items={weightItems}
              selectedValue={data.weightKg}
              onValueChange={(value) => setWeight(value as number)}
            />
          </View>
        </View>
      </View>
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pickersRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
});
