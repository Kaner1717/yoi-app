import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { OnboardingData, defaultOnboardingData, Gender, Goal, DietType, CookingEffort, Allergy, MeasurementUnit } from '@/types/onboarding';

const STORAGE_KEY = 'yoi_onboarding_data';

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<OnboardingData>(defaultOnboardingData);

  const query = useQuery({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) as OnboardingData : defaultOnboardingData;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (newData: OnboardingData) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
      return newData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  useEffect(() => {
    if (query.data) {
      setData(query.data);
    }
  }, [query.data]);

  const updateData = (updates: Partial<OnboardingData>) => {
    const newData = { ...data, ...updates };
    setData(newData);
    saveMutation.mutate(newData);
  };

  const setGender = (gender: Gender) => updateData({ gender });
  const setMeasurementUnit = (unit: MeasurementUnit) => updateData({ measurementUnit: unit });
  const setHeight = (heightCm: number) => updateData({ heightCm });
  const setWeight = (weightKg: number) => updateData({ weightKg });
  const setBirthDate = (birthDate: Date) => updateData({ birthDate });
  const setGoal = (goal: Goal) => updateData({ goal });
  const setDietType = (dietType: DietType) => updateData({ dietType });
  const setAllergies = (allergies: Allergy[]) => updateData({ allergies });
  const setCookingEffort = (cookingEffort: CookingEffort) => updateData({ cookingEffort });
  const setWeeklyBudget = (weeklyBudget: number) => updateData({ weeklyBudget });
  const completeOnboarding = () => updateData({ isOnboardingComplete: true });

  const resetOnboarding = () => {
    setData(defaultOnboardingData);
    saveMutation.mutate(defaultOnboardingData);
  };

  return {
    data,
    isLoading: query.isLoading,
    setGender,
    setMeasurementUnit,
    setHeight,
    setWeight,
    setBirthDate,
    setGoal,
    setDietType,
    setAllergies,
    setCookingEffort,
    setWeeklyBudget,
    completeOnboarding,
    resetOnboarding,
    updateData,
  };
});
