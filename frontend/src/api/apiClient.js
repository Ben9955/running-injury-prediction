import axios from 'axios';

// Backend URL
const BASE_URL = 'http://injury-prediction.duckdns.org:8000';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Send data to backend to get injury risk prediction
export const predictInjuryRisk = async (athleteId, trainingHistory) => {
  try {
    const response = await apiClient.post('/predict', {
      athlete_id: athleteId,
      training_history: trainingHistory,
    });
    return response.data;
  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
};

// Format one week so it matches the backend input format
// Also fills missing values using previous weeks if needed
export const formatWeekForAPI = (weekData, allWeeks, currentIndex) => {
  let maxKmWeek1 = parseFloat(weekData.maxKmOneDayWeek1) || 0;
  let maxKmWeek2 = parseFloat(weekData.maxKmOneDayWeek2) || 0;

  // If missing, take values from previous weeks
  if (maxKmWeek1 === 0 && currentIndex > 0) {
    maxKmWeek1 = parseFloat(allWeeks[currentIndex - 1].maxKmOneDay) || 0;
  }

  if (maxKmWeek2 === 0 && currentIndex > 1) {
    maxKmWeek2 = parseFloat(allWeeks[currentIndex - 2].maxKmOneDay) || 0;
  }

  return {
    date: weekData.date || Date.now(),
    total_kms: parseFloat(weekData.totalKms) || 0,
    max_km_one_day: parseFloat(weekData.maxKmOneDay) || 0,
    total_km_z3_z4_z5_t1_t2: parseFloat(weekData.totalKmHighIntensity) || 0,
    total_km_z5_t1_t2: parseFloat(weekData.totalKmZ5T1T2) || 0,
    total_km_z3_4: parseFloat(weekData.totalKmZ3Z4) || 0,
    nr_sessions: parseFloat(weekData.nrSessions) || 0,
    nr_rest_days: parseFloat(weekData.nrRestDays) || 0,
    avg_exertion: parseFloat(weekData.avgExertion) || 5.0,
    max_exertion: parseFloat(weekData.maxExertion) || 7.5,
    min_exertion: parseFloat(weekData.minExertion) || 2.5,
    avg_recovery: parseFloat(weekData.avgRecovery) || 6.0,
    avg_training_success: parseFloat(weekData.avgTrainingSuccess) || 7.0,
    nr_days_with_interval_session: parseFloat(weekData.nrIntervalDays) || 0,
    max_km_one_day_1: maxKmWeek1,
    max_km_one_day_2: maxKmWeek2,
  };
};

export default apiClient;

