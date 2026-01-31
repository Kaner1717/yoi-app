export type Gender = 'male' | 'female' | 'other';

export type MeasurementUnit = 'metric' | 'imperial';

export type Goal = 'lose' | 'maintain' | 'gain';

export type DietType = 'classic' | 'vegetarian' | 'vegan' | 'pescatarian' | 'keto';

export type CookingEffort = 'low' | 'medium' | 'high';

export type Allergy = 
  | 'dairy'
  | 'gluten'
  | 'nuts'
  | 'shellfish'
  | 'fish'
  | 'soy'
  | 'eggs'
  | 'sesame';

export interface OnboardingData {
  gender: Gender | null;
  measurementUnit: MeasurementUnit;
  heightCm: number;
  weightKg: number;
  birthDate: Date | null;
  goal: Goal | null;
  dietType: DietType | null;
  allergies: Allergy[];
  cookingEffort: CookingEffort | null;
  weeklyBudget: number;
  isOnboardingComplete: boolean;
  userName: string | null;
  userEmail: string | null;
}

export const defaultOnboardingData: OnboardingData = {
  gender: null,
  measurementUnit: 'metric',
  heightCm: 170,
  weightKg: 70,
  birthDate: null,
  goal: null,
  dietType: null,
  allergies: [],
  cookingEffort: null,
  weeklyBudget: 50,
  isOnboardingComplete: false,
  userName: null,
  userEmail: null,
};
