/**
 * FoodVerse AI - Food Log & Daily Calorie State Manager
 * Handles dynamic food logging, macro calculation, date indexing,
 * cross-tab synchronization, and localStorage persistence.
 */

export const STORAGE_KEY = 'foodverse_daily_log';

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's local timezone.
 */
export const getTodayKey = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats a Date object as YYYY-MM-DD in local timezone.
 */
export const formatDateKey = (dateObj) => {
  if (!dateObj) return getTodayKey();
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Creates an empty 4-slot meal dictionary.
 */
export const createEmptyDayMeals = () => ({
  breakfast: [],
  lunch: [],
  dinner: [],
  snacks: [],
});

/**
 * Calculates total calories from a daily meals object.
 */
export const calculateTotalCalories = (mealsForDay) => {
  if (!mealsForDay || typeof mealsForDay !== 'object') return 0;
  let total = 0;
  ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((slot) => {
    const items = Array.isArray(mealsForDay[slot]) ? mealsForDay[slot] : [];
    items.forEach((item) => {
      total += Number(item.calories) || 0;
    });
  });
  return Math.round(total);
};

/**
 * Calculates total macronutrients from a daily meals object.
 */
export const calculateTotalMacros = (mealsForDay) => {
  const res = { protein_g: 0, carbs_g: 0, fats_g: 0, fiber_g: 0 };
  if (!mealsForDay || typeof mealsForDay !== 'object') return res;

  ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((slot) => {
    const items = Array.isArray(mealsForDay[slot]) ? mealsForDay[slot] : [];
    items.forEach((item) => {
      res.protein_g += Number(item.protein_g) || 0;
      res.carbs_g += Number(item.carbs_g) || 0;
      res.fats_g += Number(item.fats_g) || 0;
      res.fiber_g += Number(item.fiber_g) || 0;
    });
  });

  return {
    protein_g: Math.round(res.protein_g * 10) / 10,
    carbs_g: Math.round(res.carbs_g * 10) / 10,
    fats_g: Math.round(res.fats_g * 10) / 10,
    fiber_g: Math.round(res.fiber_g * 10) / 10,
  };
};

/**
 * Reads and parses foodverse_daily_log from localStorage.
 * Initializes with empty meals (0 kcal) if no records exist.
 */
export const loadDailyLogsFromStorage = () => {
  const todayKey = getTodayKey();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        // Multi-day dictionary format: { byDate: { ... } }
        if (parsed.byDate && typeof parsed.byDate === 'object') {
          return parsed.byDate;
        }
        // Single day format: { date, meals, totalCalories }
        if (parsed.meals && parsed.date) {
          return { [parsed.date]: parsed.meals };
        }
        // Direct meals object: { breakfast: [], lunch: [], ... }
        if (parsed.breakfast || parsed.lunch || parsed.dinner || parsed.snacks) {
          return { [todayKey]: parsed };
        }
      }
    }
  } catch (err) {
    console.error('Failed to load foodverse_daily_log from localStorage:', err);
  }

  // Initial clean state: 0 foods logged
  return {
    [todayKey]: createEmptyDayMeals(),
  };
};

/**
 * Persists daily logs to localStorage.
 * Also stores today's snapshot (date, totalCalories, meals) for simple inspection.
 */
export const saveDailyLogsToStorage = (allLogs) => {
  const todayKey = getTodayKey();
  try {
    const todayMeals = allLogs[todayKey] || createEmptyDayMeals();
    const todayTotal = calculateTotalCalories(todayMeals);

    const payload = {
      date: todayKey,
      totalCalories: todayTotal,
      meals: todayMeals,
      byDate: allLogs,
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.error('Failed to save foodverse_daily_log to localStorage:', err);
  }
};
