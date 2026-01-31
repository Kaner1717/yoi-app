import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingLayout, WheelPicker } from '@/components/ui';
import { useOnboarding } from '@/context/OnboardingContext';
import { theme } from '@/constants/theme';

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function BirthdateScreen() {
  const router = useRouter();
  const { data, setBirthDate } = useOnboarding();

  const currentYear = new Date().getFullYear();
  const birthDate = data.birthDate ? new Date(data.birthDate) : new Date(2000, 0, 1);

  const monthItems = useMemo(() => 
    months.map((month, i) => ({ value: i, label: month })), 
  []);

  const dayItems = useMemo(() => 
    Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}` })),
  []);

  const yearItems = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => {
      const year = currentYear - 16 - i;
      return { value: year, label: `${year}` };
    }),
  [currentYear]);

  const handleMonthChange = (value: number | string) => {
    const newDate = new Date(birthDate);
    newDate.setMonth(value as number);
    setBirthDate(newDate);
  };

  const handleDayChange = (value: number | string) => {
    const newDate = new Date(birthDate);
    newDate.setDate(value as number);
    setBirthDate(newDate);
  };

  const handleYearChange = (value: number | string) => {
    const newDate = new Date(birthDate);
    newDate.setFullYear(value as number);
    setBirthDate(newDate);
  };

  return (
    <OnboardingLayout
      title="When were you born?"
      subtitle="This will be used to calibrate your custom plan."
      progress={0.3}
      onBack={() => router.back()}
      onContinue={() => router.push('/onboarding/goal')}
    >
      <View style={styles.container}>
        <View style={styles.pickersRow}>
          <View style={styles.pickerColumn}>
            <WheelPicker
              items={monthItems}
              selectedValue={birthDate.getMonth()}
              onValueChange={handleMonthChange}
            />
          </View>
          <View style={styles.pickerColumnSmall}>
            <WheelPicker
              items={dayItems}
              selectedValue={birthDate.getDate()}
              onValueChange={handleDayChange}
            />
          </View>
          <View style={styles.pickerColumnSmall}>
            <WheelPicker
              items={yearItems}
              selectedValue={birthDate.getFullYear()}
              onValueChange={handleYearChange}
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
    justifyContent: 'center',
  },
  pickersRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  pickerColumn: {
    flex: 2,
  },
  pickerColumnSmall: {
    flex: 1,
  },
});
