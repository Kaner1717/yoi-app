-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  height_cm INTEGER,
  weight_kg INTEGER,
  birthdate DATE,
  goal TEXT CHECK (goal IN ('lose', 'maintain', 'gain')),
  diet_type TEXT CHECK (diet_type IN ('classic', 'vegetarian', 'vegan', 'pescatarian', 'keto')),
  allergies TEXT[] DEFAULT '{}',
  cooking_effort TEXT CHECK (cooking_effort IN ('low', 'medium', 'high')),
  weekly_budget NUMERIC DEFAULT 50,
  measurement_system TEXT DEFAULT 'metric' CHECK (measurement_system IN ('metric', 'imperial')),
  user_name TEXT,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_days INTEGER NOT NULL,
  meals_per_day INTEGER NOT NULL,
  target_calories INTEGER NOT NULL,
  weekly_budget NUMERIC,
  estimated_total_cost NUMERIC,
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  generation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plan_meals table
CREATE TABLE IF NOT EXISTS plan_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('breakfast', 'lunch', 'dinner', 'snack')),
  title TEXT NOT NULL,
  description TEXT,
  calories INTEGER,
  protein_g INTEGER,
  carbs_g INTEGER,
  fat_g INTEGER,
  steps TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create meal_ingredients table
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id UUID REFERENCES plan_meals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  category TEXT CHECK (category IN ('produce', 'protein', 'pantry', 'dairy', 'frozen', 'other')),
  est_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create grocery_items table (optional, for tracking checked items)
CREATE TABLE IF NOT EXISTS grocery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('produce', 'protein', 'pantry', 'dairy', 'frozen', 'other')),
  quantity NUMERIC,
  unit TEXT,
  est_price NUMERIC DEFAULT 0,
  checked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plan_meals_plan_id ON plan_meals(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_meals_day_index ON plan_meals(day_index);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal_id ON meal_ingredients(meal_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_plan_id ON grocery_items(plan_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
