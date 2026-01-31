import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePlan } from '@/context/PlanContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button, SelectionCard, SegmentedControl, Chip, SliderControl } from '@/components/ui';
import { ChevronRight, User, Target, Utensils, AlertCircle, Wallet, RefreshCw, X, LogOut, Trash2, Edit2, Ruler } from 'lucide-react-native';
import { Gender, Goal, DietType, CookingEffort, Allergy, MeasurementUnit } from '@/types/onboarding';

type EditModal = 'personal' | 'goal' | 'diet' | 'cooking' | 'allergies' | 'budget' | 'name' | 'height' | 'weight' | null;

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const goalOptions: { value: Goal; label: string; subtitle: string }[] = [
  { value: 'lose', label: 'Lose weight', subtitle: 'Calorie deficit meal plans' },
  { value: 'maintain', label: 'Maintain weight', subtitle: 'Balanced nutrition' },
  { value: 'gain', label: 'Gain weight', subtitle: 'Calorie surplus for muscle' },
];

const dietOptions: { value: DietType; label: string }[] = [
  { value: 'classic', label: 'Classic' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' },
  { value: 'keto', label: 'Keto / Low Carb' },
];

const cookingOptions: { value: CookingEffort; label: string; subtitle: string }[] = [
  { value: 'low', label: 'Quick & Simple', subtitle: '15-20 min recipes' },
  { value: 'medium', label: 'Medium Effort', subtitle: '30-45 min recipes' },
  { value: 'high', label: 'Full Recipes', subtitle: 'Love cooking!' },
];

const allergyOptions: Allergy[] = ['dairy', 'gluten', 'nuts', 'shellfish', 'fish', 'soy', 'eggs', 'sesame'];

const unitOptions: { value: MeasurementUnit; label: string }[] = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
];

export default function ProfileScreen() {
  const { data, updateData, resetOnboarding } = useOnboarding();
  const { userId, currentPlan } = usePlan();
  const { signOut, isSigningOut, userId: authUserId } = useAuth();
  const router = useRouter();
  const [editModal, setEditModal] = useState<EditModal>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [tempName, setTempName] = useState(data.userName || '');
  
  const [tempGender, setTempGender] = useState<Gender | null>(data.gender);
  const [tempUnit, setTempUnit] = useState<MeasurementUnit>(data.measurementUnit);
  const [tempHeight, setTempHeight] = useState(data.heightCm);
  const [tempWeight, setTempWeight] = useState(data.weightKg);
  const [tempGoal, setTempGoal] = useState<Goal | null>(data.goal);
  const [tempDiet, setTempDiet] = useState<DietType | null>(data.dietType);
  const [tempCooking, setTempCooking] = useState<CookingEffort | null>(data.cookingEffort);
  const [tempAllergies, setTempAllergies] = useState<Allergy[]>(data.allergies);
  const [tempBudget, setTempBudget] = useState(data.weeklyBudget);

  const syncToSupabase = async (updates: Partial<typeof data>) => {
    const uid = authUserId || userId;
    if (!uid) {
      console.log('[Profile] No user ID, skipping sync');
      return;
    }
    
    const mergedData = { ...data, ...updates };
    
    const profileData = {
      user_id: uid,
      gender: mergedData.gender,
      height_cm: mergedData.heightCm,
      weight_kg: mergedData.weightKg,
      birthdate: mergedData.birthDate ? new Date(mergedData.birthDate).toISOString().split('T')[0] : null,
      goal: mergedData.goal,
      diet_type: mergedData.dietType,
      allergies: mergedData.allergies,
      cooking_effort: mergedData.cookingEffort,
      weekly_budget: mergedData.weeklyBudget,
      measurement_system: mergedData.measurementUnit,
      user_name: mergedData.userName,
      user_email: mergedData.userEmail,
    };

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' });

      if (error) {
        console.log('[Profile] Supabase sync error:', error.message);
      } else {
        console.log('[Profile] Synced to Supabase');
      }
    } catch (err) {
      console.log('[Profile] Supabase sync failed:', err);
    }
  };

  const openModal = (modal: EditModal) => {
    setTempGender(data.gender);
    setTempUnit(data.measurementUnit);
    setTempHeight(data.heightCm);
    setTempWeight(data.weightKg);
    setTempGoal(data.goal);
    setTempDiet(data.dietType);
    setTempCooking(data.cookingEffort);
    setTempAllergies([...data.allergies]);
    setTempBudget(data.weeklyBudget);
    setTempName(data.userName || '');
    setEditModal(modal);
  };

  const saveName = () => {
    setIsSaving(true);
    const updates = { userName: tempName };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const savePersonal = () => {
    setIsSaving(true);
    const updates = {
      gender: tempGender,
      measurementUnit: tempUnit,
    };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveHeight = () => {
    setIsSaving(true);
    const updates = { heightCm: tempHeight, measurementUnit: tempUnit };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveWeight = () => {
    setIsSaving(true);
    const updates = { weightKg: tempWeight, measurementUnit: tempUnit };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveGoal = () => {
    setIsSaving(true);
    const updates = { goal: tempGoal };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveDiet = () => {
    setIsSaving(true);
    const updates = { dietType: tempDiet };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveCooking = () => {
    setIsSaving(true);
    const updates = { cookingEffort: tempCooking };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveAllergies = () => {
    setIsSaving(true);
    const updates = { allergies: tempAllergies };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const saveBudget = () => {
    setIsSaving(true);
    const updates = { weeklyBudget: tempBudget };
    updateData(updates);
    syncToSupabase(updates);
    setIsSaving(false);
    setEditModal(null);
  };

  const toggleAllergy = (allergy: Allergy) => {
    setTempAllergies(prev =>
      prev.includes(allergy) ? prev.filter(a => a !== allergy) : [...prev, allergy]
    );
  };

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Profile',
      'This will clear all your preferences and meal plans. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: resetOnboarding 
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          onPress: async () => {
            try {
              console.log('[Profile] Logging out...');
              await signOut();
              console.log('[Profile] Sign out complete, resetting onboarding...');
              resetOnboarding();
              console.log('[Profile] Navigating to onboarding...');
              router.replace('/onboarding');
            } catch (error) {
              console.log('[Profile] Logout error:', error);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Profile] Deleting account...');
              await signOut();
              console.log('[Profile] Sign out complete, resetting onboarding...');
              resetOnboarding();
              console.log('[Profile] Navigating to onboarding...');
              router.replace('/onboarding');
            } catch (error) {
              console.log('[Profile] Delete account error:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          },
        },
      ]
    );
  };

  const formatHeight = () => {
    if (data.measurementUnit === 'metric') {
      return `${data.heightCm} cm`;
    }
    const totalInches = data.heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const formatWeight = () => {
    if (data.measurementUnit === 'metric') {
      return `${data.weightKg} kg`;
    }
    const lbs = Math.round(data.weightKg * 2.20462);
    return `${lbs} lb`;
  };

  const formatGoal = () => {
    if (!data.goal) return 'Not set';
    return data.goal.charAt(0).toUpperCase() + data.goal.slice(1) + ' weight';
  };

  const formatDiet = () => {
    if (!data.dietType) return 'Not set';
    return data.dietType.charAt(0).toUpperCase() + data.dietType.slice(1);
  };

  const formatCooking = () => {
    if (!data.cookingEffort) return 'Not set';
    const labels: Record<string, string> = {
      low: 'Quick & simple',
      medium: 'Medium effort',
      high: 'Full recipes',
    };
    return labels[data.cookingEffort] || 'Not set';
  };

  const formatAllergies = () => {
    if (data.allergies.length === 0) return 'None';
    return data.allergies.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ');
  };

  const sections = [
    {
      title: 'Personal Details',
      icon: <User size={20} color={theme.colors.text.primary} />,
      items: [
        { label: 'Gender', value: data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1) : 'Not set', modal: 'personal' as EditModal },
      ],
    },
    {
      title: 'Measurements',
      icon: <Ruler size={20} color={theme.colors.text.primary} />,
      items: [
        { label: 'Height', value: formatHeight(), modal: 'height' as EditModal },
        { label: 'Weight', value: formatWeight(), modal: 'weight' as EditModal },
      ],
    },
    {
      title: 'Goals',
      icon: <Target size={20} color={theme.colors.text.primary} />,
      items: [
        { label: 'Goal', value: formatGoal(), modal: 'goal' as EditModal },
      ],
    },
    {
      title: 'Dietary Preferences',
      icon: <Utensils size={20} color={theme.colors.text.primary} />,
      items: [
        { label: 'Diet Type', value: formatDiet(), modal: 'diet' as EditModal },
        { label: 'Cooking Effort', value: formatCooking(), modal: 'cooking' as EditModal },
      ],
    },
    {
      title: 'Allergies',
      icon: <AlertCircle size={20} color={theme.colors.text.primary} />,
      items: [
        { label: 'Food Allergies', value: formatAllergies(), modal: 'allergies' as EditModal },
      ],
    },
    {
      title: 'Budget',
      icon: <Wallet size={20} color={theme.colors.text.primary} />,
      items: [
        { label: 'Weekly Budget', value: `${data.weeklyBudget}`, modal: 'budget' as EditModal },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {data.gender === 'male' ? '👨' : data.gender === 'female' ? '👩' : '🧑'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openModal('name')} activeOpacity={0.7} style={styles.nameEditContainer}>
            {data.userName ? (
              <Text style={styles.nameText}>{data.userName}</Text>
            ) : (
              <View style={styles.tapToSetContainer}>
                <Edit2 size={14} color={theme.colors.primary} />
                <Text style={styles.tapToSetText}>Tap to set name</Text>
              </View>
            )}
          </TouchableOpacity>
          {data.userEmail && <Text style={styles.emailText}>{data.userEmail}</Text>}
          <Text style={styles.subtitleText}>Tap any section to edit</Text>
          {currentPlan && (
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                Active Plan: {currentPlan.durationDays} days
              </Text>
            </View>
          )}
        </View>

        {sections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              {section.icon}
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionContent}>
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.settingRow,
                    itemIndex < section.items.length - 1 && styles.settingRowBorder,
                  ]}
                  onPress={() => openModal(item.modal)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.settingLabel}>{item.label}</Text>
                  <View style={styles.settingRight}>
                    <Text style={styles.settingValue}>{item.value}</Text>
                    <ChevronRight size={18} color={theme.colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>About Your Plan</Text>
          <Text style={styles.infoText}>
            Changes to your profile will be used when you generate a new meal plan. 
            Your current plan will not be affected until you regenerate.
          </Text>
        </View>

        <TouchableOpacity style={styles.resetButton} onPress={handleResetOnboarding} activeOpacity={0.7}>
          <RefreshCw size={18} color={theme.colors.error} />
          <Text style={styles.resetText}>Reset All Data</Text>
        </TouchableOpacity>

        <View style={styles.accountActionsSection}>
          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout} 
            activeOpacity={0.7}
            disabled={isSigningOut}
          >
            <LogOut size={18} color={theme.colors.text.primary} />
            <Text style={styles.logoutText}>{isSigningOut ? 'Logging out...' : 'Log Out'}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.deleteAccountButton} 
            onPress={handleDeleteAccount} 
            activeOpacity={0.7}
          >
            <Trash2 size={18} color={theme.colors.error} />
            <Text style={styles.deleteAccountText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <Modal visible={editModal === 'personal'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Details</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {genderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.genderOption, tempGender === option.value && styles.genderOptionSelected]}
                    onPress={() => setTempGender(option.value)}
                  >
                    <Text style={[styles.genderText, tempGender === option.value && styles.genderTextSelected]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Measurement System</Text>
              <SegmentedControl options={unitOptions} selected={tempUnit} onSelect={setTempUnit} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={savePersonal} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'height'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Height</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Measurement System</Text>
            <SegmentedControl options={unitOptions} selected={tempUnit} onSelect={setTempUnit} />

            <View style={styles.sliderWrapper}>
              <SliderControl
                min={tempUnit === 'metric' ? 120 : 48}
                max={tempUnit === 'metric' ? 220 : 96}
                value={tempUnit === 'metric' ? tempHeight : Math.round(tempHeight / 2.54)}
                step={1}
                onValueChange={(v) => setTempHeight(tempUnit === 'metric' ? v : Math.round(v * 2.54))}
                formatValue={(v) => {
                  if (tempUnit === 'metric') {
                    return `${v} cm`;
                  }
                  const feet = Math.floor(v / 12);
                  const inches = v % 12;
                  return `${feet}'${inches}"`;
                }}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveHeight} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'weight'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Weight</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Measurement System</Text>
            <SegmentedControl options={unitOptions} selected={tempUnit} onSelect={setTempUnit} />

            <View style={styles.sliderWrapper}>
              <SliderControl
                min={tempUnit === 'metric' ? 30 : 66}
                max={tempUnit === 'metric' ? 200 : 440}
                value={tempUnit === 'metric' ? tempWeight : Math.round(tempWeight * 2.20462)}
                step={1}
                onValueChange={(v) => setTempWeight(tempUnit === 'metric' ? v : Math.round(v / 2.20462))}
                formatValue={(v) => tempUnit === 'metric' ? `${v} kg` : `${v} lb`}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveWeight} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'goal'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your Goal</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            {goalOptions.map((option) => (
              <SelectionCard
                key={option.value}
                title={option.label}
                subtitle={option.subtitle}
                selected={tempGoal === option.value}
                onPress={() => setTempGoal(option.value)}
              />
            ))}

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveGoal} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'diet'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Diet Type</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {dietOptions.map((option) => (
                <SelectionCard
                  key={option.value}
                  title={option.label}
                  selected={tempDiet === option.value}
                  onPress={() => setTempDiet(option.value)}
                />
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveDiet} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'cooking'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Cooking Effort</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {cookingOptions.map((option) => (
                <SelectionCard
                  key={option.value}
                  title={option.label}
                  subtitle={option.subtitle}
                  selected={tempCooking === option.value}
                  onPress={() => setTempCooking(option.value)}
                />
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveCooking} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'allergies'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Food Allergies</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Select all that apply</Text>
            <View style={styles.chipContainer}>
              {allergyOptions.map((allergy) => (
                <Chip
                  key={allergy}
                  label={allergy.charAt(0).toUpperCase() + allergy.slice(1)}
                  selected={tempAllergies.includes(allergy)}
                  onPress={() => toggleAllergy(allergy)}
                />
              ))}
            </View>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveAllergies} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'budget'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Weekly Budget</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sliderWrapper}>
              <SliderControl
                min={20}
                max={150}
                value={tempBudget}
                step={5}
                onValueChange={setTempBudget}
                formatValue={(v) => `$${v}`}
              />
            </View>

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveBudget} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editModal === 'name'} animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditModal(null)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Name</Text>
              <TouchableOpacity onPress={() => setEditModal(null)}>
                <X size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={tempName}
              onChangeText={setTempName}
              placeholder="Enter your name"
              placeholderTextColor={theme.colors.text.tertiary}
              autoCapitalize="words"
            />

            <View style={styles.modalFooter}>
              <Button title={isSaving ? "Saving..." : "Save Changes"} onPress={saveName} disabled={isSaving} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  title: {
    fontSize: theme.typography.fontSize.xxl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: 40,
  },
  nameText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
  },
  emailText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  subtitleText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
    marginTop: theme.spacing.xs,
  },
  planBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
    marginTop: theme.spacing.md,
  },
  planBadgeText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.inverse,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settingLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.xs,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  infoTitle: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semiBold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  infoText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  resetText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
  },
  bottomPadding: {
    height: theme.spacing.xxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxxl,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  modalLabel: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  modalSubtitle: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  modalFooter: {
    marginTop: theme.spacing.lg,
  },
  genderRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  genderOption: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  genderOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surface,
  },
  genderText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  genderTextSelected: {
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sliderWrapper: {
    paddingVertical: theme.spacing.xl,
  },
  nameEditContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  tapToSetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.full,
  },
  tapToSetText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  accountActionsSection: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  logoutText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.medium,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  deleteAccountText: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.error,
    fontWeight: theme.typography.fontWeight.medium,
  },
});
