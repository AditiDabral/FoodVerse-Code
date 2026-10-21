import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://foodverse-api.onrender.com';

export const RATE_LIMIT_MESSAGE = "Our AI servers are currently experiencing high traffic. Please wait a moment before trying again.";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
});

// Intercept 429 status codes and format user-friendly message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 429) {
      const friendlyMessage =
        error.response.data?.detail ||
        error.response.data?.message ||
        RATE_LIMIT_MESSAGE;

      error.message = friendlyMessage;
      if (!error.response.data || typeof error.response.data !== 'object') {
        error.response.data = {};
      }
      error.response.data.detail = friendlyMessage;
      error.response.data.isRateLimited = true;
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Health check
  checkHealth: async () => {
    const res = await apiClient.get('/api/health');
    return res.data;
  },

  // Milestone 2: Track Meals & Nutrition
  analyzeNutrition: async (imageFile, notes = '') => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (notes) formData.append('notes', notes);
    const res = await apiClient.post('/api/nutrition/analyze', formData);
    return res.data;
  },

  // Milestone 3: Freshness & Spoilage Check
  analyzeFreshness: async (imageFile, itemHint = '') => {
    const formData = new FormData();
    formData.append('image', imageFile);
    if (itemHint) formData.append('item_hint', itemHint);
    const res = await apiClient.post('/api/freshness/analyze', formData);
    return res.data;
  },

  // Milestone 4: Kitchen Hygiene Inspection
  analyzeHygiene: async (mediaFile) => {
    const formData = new FormData();
    formData.append('file', mediaFile);
    const res = await apiClient.post('/api/hygiene/analyze', formData);
    return res.data;
  },

  // Milestone 4: Smart Kitchen Cooking Assistant
  assistCooking: async ({ query = '', imageFile = null, audioFile = null }) => {
    const formData = new FormData();
    formData.append('query', query);
    if (imageFile) formData.append('image', imageFile);
    if (audioFile) formData.append('audio', audioFile);
    const res = await apiClient.post('/api/cooking/assist', formData);
    return res.data;
  },

  // Milestone 5: Personalized Meal Plan
  generateMealPlan: async (userProfile) => {
    const res = await apiClient.post('/api/meal-plan/generate', userProfile);
    return res.data;
  },
};
