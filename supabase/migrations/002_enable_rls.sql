-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies: user can only access their own profile
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Plans policies: user can only access their own plans
CREATE POLICY "Users can view their own plans"
  ON plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
  ON plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON plans FOR DELETE
  USING (auth.uid() = user_id);

-- Plan meals policies: user can access meals for their plans
CREATE POLICY "Users can view meals for their plans"
  ON plan_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_meals.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert meals for their plans"
  ON plan_meals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_meals.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete meals for their plans"
  ON plan_meals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = plan_meals.plan_id
      AND plans.user_id = auth.uid()
    )
  );

-- Meal ingredients policies: user can access ingredients for their meals
CREATE POLICY "Users can view ingredients for their meals"
  ON meal_ingredients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plan_meals
      JOIN plans ON plans.id = plan_meals.plan_id
      WHERE plan_meals.id = meal_ingredients.meal_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert ingredients for their meals"
  ON meal_ingredients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_meals
      JOIN plans ON plans.id = plan_meals.plan_id
      WHERE plan_meals.id = meal_ingredients.meal_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete ingredients for their meals"
  ON meal_ingredients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plan_meals
      JOIN plans ON plans.id = plan_meals.plan_id
      WHERE plan_meals.id = meal_ingredients.meal_id
      AND plans.user_id = auth.uid()
    )
  );

-- Grocery items policies: user can access groceries for their plans
CREATE POLICY "Users can view groceries for their plans"
  ON grocery_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = grocery_items.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert groceries for their plans"
  ON grocery_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = grocery_items.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update groceries for their plans"
  ON grocery_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = grocery_items.plan_id
      AND plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = grocery_items.plan_id
      AND plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete groceries for their plans"
  ON grocery_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM plans
      WHERE plans.id = grocery_items.plan_id
      AND plans.user_id = auth.uid()
    )
  );
