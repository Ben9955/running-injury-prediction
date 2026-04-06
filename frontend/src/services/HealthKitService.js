import HealthKit from '@kingstinct/react-native-healthkit';
import { Platform } from 'react-native';

class HealthKitService {
  constructor() {
    this.isAvailable = false;
    this.isAuthorized = false;
  }

  // Request permission to access HealthKit data
  async initialize() {
    if (Platform.OS !== 'ios') return false;

    try {
      const isAvailable = await HealthKit.isHealthDataAvailable();
      if (!isAvailable) return false;

      await HealthKit.requestAuthorization({
        read: [
          'HKQuantityTypeIdentifierDistanceWalkingRunning',
          'HKQuantityTypeIdentifierHeartRate',
          'HKWorkoutTypeIdentifier',
        ],
        toRead: [
          'HKQuantityTypeIdentifierDistanceWalkingRunning',
          'HKQuantityTypeIdentifierHeartRate',
          'HKWorkoutTypeIdentifier',
        ]
      });

      this.isAvailable = true;
      this.isAuthorized = true;
      return true;
    } catch (error) {
      console.error('Permission failed:', error);
      return false;
    }
  }

  // Get running workouts within a date range
  async fetchWorkoutSamples(startDate, endDate) {
    try {
      const result = await HealthKit.queryWorkoutSamples({
        startDate,
        endDate,
        limit: 100,
      });

      const allWorkouts = result || [];
      const RUNNING_TYPE_ID = 37;

      const runningWorkouts = allWorkouts
        .filter(workout => {
          const workoutDate = new Date(workout.startDate);
          const isRunning = workout.workoutActivityType === RUNNING_TYPE_ID;
          const isInRange = workoutDate >= startDate && workoutDate < endDate;

          // Keep only workouts coming from Apple Watch
          const isFromWatch =
            workout.sourceName?.toLowerCase().includes('watch') ||
            workout.device?.manufacturer?.toLowerCase().includes('apple');

          return isRunning && isInRange && isFromWatch;
        })
        .map(workout => ({
          type: 'Running',
          distanceMeters: workout.totalDistance?.quantity || 0,
          startDate: workout.startDate,
          endDate: workout.endDate,
        }));

      return runningWorkouts;
    } catch (error) {
      console.error('Error finding workouts:', error);
      return [];
    }
  }

  // Return only distance + dates
  async fetchWorkouts(startDate, endDate) {
    const workouts = await this.fetchWorkoutSamples(startDate, endDate);
    return workouts.map(workout => ({
      value: workout.distanceMeters,
      startDate: workout.startDate,
      endDate: workout.endDate,
    }));
  }

  // Get heart rate data for a workout time window
  async fetchWorkoutHR(workoutStart, workoutEnd) {
    if (!this.isAuthorized) return [];

    const start = new Date(workoutStart);
    const end = new Date(workoutEnd);

    try {
      const result = await HealthKit.queryQuantitySamples(
        'HKQuantityTypeIdentifierHeartRate',
        {
          limit: 5000,
          filter: {
            date: {
              startDate: start,
              endDate: end
            }
          },
          from: start,
          to: end
        }
      );

      const samplesArray = Array.isArray(result) ? result : (result?.samples || []);

      return samplesArray.map(sample => ({
        value: sample.quantity ?? sample.value ?? 0,
        startDate: new Date(sample.startDate),
      }));
    } catch (error) {
      console.error('Error getting heart rate:', error);
      return [];
    }
  }

  // Build one week of data
  async getWeeklySummary(weekStartDate) {
    const weekStart = new Date(weekStartDate);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const distanceSamples = await this.fetchWorkouts(weekStart, weekEnd);

    // Get HR data for each workout
    const workoutHRData = await Promise.all(
      distanceSamples.map(async (workout) => {
        return await this.fetchWorkoutHR(workout.startDate, workout.endDate);
      })
    );

    const allWorkoutHRs = workoutHRData.flat();
    return this.processWeekData(distanceSamples, allWorkoutHRs);
  }

// Convert raw data into backend format
processWeekData(distanceSamples, heartRateSamples) {
  const dailyDistances = {};

  distanceSamples.forEach((sample) => {
    const day = new Date(sample.startDate).toDateString();
    const valueInKm = sample.value / 1000;
    dailyDistances[day] = (dailyDistances[day] || 0) + valueInKm;
  });

  const dailyValuesArray = Object.values(dailyDistances);
  const totalKms = dailyValuesArray.reduce((sum, val) => sum + val, 0);
  const maxKmOneDay = dailyValuesArray.length > 0 ? Math.max(...dailyValuesArray) : 0;
  const daysWithActivity = dailyValuesArray.length;

  const totalHRSamples = heartRateSamples.length;

  const highIntensitySamples = heartRateSamples.filter(s => s.value >= 155).length;
  const highIntensityRatio = totalHRSamples > 0 ? highIntensitySamples / totalHRSamples : 0;

  let avgExertion = 5.0;

  // Estimate effort using heart rate
  if (totalHRSamples > 0) {
    const avgHR = heartRateSamples.reduce((sum, hr) => sum + hr.value, 0) / totalHRSamples;
    avgExertion = Math.max(1, Math.min(10, ((avgHR - 60) / 130) * 10));
  }

  // Create a range so later calculations don't break
  const variability = Math.max(1.5, avgExertion * 0.35);
  const maxEx = Math.min(10, avgExertion + variability);
  const minEx = Math.max(1, avgExertion - variability);

  const derivedRecovery = Math.max(1, 10 - avgExertion);

  const avgTrainingSuccess = totalKms === 0 ? 5.0 : 7.0;

  const totalHighIntensityKm = totalKms * highIntensityRatio;

  return {
    totalKms: totalKms.toFixed(2),
    maxKmOneDay: maxKmOneDay.toFixed(2),

    totalKmHighIntensity: totalHighIntensityKm.toFixed(2),
    totalKmZ5T1T2: (totalHighIntensityKm * 0.4).toFixed(2),
    totalKmZ3Z4: (totalHighIntensityKm * 0.6).toFixed(2),

    nrSessions: daysWithActivity.toString(),
    nrRestDays: (7 - daysWithActivity).toString(),

    avgExertion: avgExertion.toFixed(1),
    maxExertion: maxEx.toFixed(1),
    minExertion: minEx.toFixed(1),

    avgRecovery: derivedRecovery.toFixed(1),
    avgTrainingSuccess: avgTrainingSuccess.toFixed(1),

    nrIntervalDays: highIntensityRatio > 0.2 ? '1' : '0',

    maxKmOneDayWeek1: '',
    maxKmOneDayWeek2: '',
    source: 'apple_watch',
  };
}



  // Get multiple weeks of data
  async getAvailableWeeks(maxWeeks = 12) {
    const weeks = [];
    const now = new Date();
    const currentDay = now.getDay();
    const daysFromMonday = currentDay === 0 ? 6 : currentDay - 1;

    const currentMonday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - daysFromMonday,
      0, 0, 0, 0
    );

    console.log(`Syncing ${maxWeeks} weeks...`);

    for (let i = maxWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(
        currentMonday.getFullYear(),
        currentMonday.getMonth(),
        currentMonday.getDate() - (7 * i),
        0, 0, 0, 0
      );

      try {
        const weekData = await this.getWeeklySummary(weekStart);
        weeks.push({
          ...weekData,
          weekTimestamp: weekStart.getTime(),
        });
      } catch (error) {
        console.error(`Error for week ${weekStart.toDateString()}:`, error);

        // Keep structure consistent even if data fails
        weeks.push({
          totalKms: '0.00',
          nrSessions: '0',
          avgExertion: '5.0',
          avgRecovery: '5.0',
          weekTimestamp: weekStart.getTime()
        });
      }
    }

    // Fill previous weeks' max distance values
    for (let i = 0; i < weeks.length; i++) {
      weeks[i].maxKmOneDayWeek1 = i > 0 ? weeks[i - 1].maxKmOneDay : '0.00';
      weeks[i].maxKmOneDayWeek2 = i > 1 ? weeks[i - 2].maxKmOneDay : '0.00';
    }

    console.log('Sync complete.');
    return weeks;
  }
}

export default new HealthKitService();