import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HealthKitService from '../services/HealthKitService';
import { Platform } from 'react-native';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // app state
  const [currentPrediction, setCurrentPrediction] = useState(null);
  const [trainingWeeks, setTrainingWeeks] = useState([]);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [healthKitAvailable, setHealthKitAvailable] = useState(false);
  const [healthKitAuthorized, setHealthKitAuthorized] = useState(false);

  // run once when app starts
  useEffect(() => {
    loadStoredData();
    initializeHealthKit();
  }, []);

  const initializeHealthKit = async () => {
    if (Platform.OS === 'ios') {
      try {
        const authorized = await HealthKitService.initialize();
        setHealthKitAvailable(HealthKitService.isAvailable);
        setHealthKitAuthorized(authorized);
      } catch (error) {
        console.error('HealthKit failed to start:', error.message);
        setHealthKitAvailable(false);
        setHealthKitAuthorized(false);
      }
    }
  };

  // load saved data from device storage
  const loadStoredData = async () => {
    try {
      const storedPrediction = await AsyncStorage.getItem('currentPrediction');
      const storedHistory = await AsyncStorage.getItem('predictionHistory');
      const storedWeeks = await AsyncStorage.getItem('trainingWeeks');

      if (storedPrediction) setCurrentPrediction(JSON.parse(storedPrediction));
      if (storedHistory) setPredictionHistory(JSON.parse(storedHistory));
      if (storedWeeks) setTrainingWeeks(JSON.parse(storedWeeks));
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  };

  // sync data from Apple Health
  const syncHealthKitData = async () => {
    if (!healthKitAuthorized) {
      throw new Error('Please allow access to Health data in settings');
    }

    setLoading(true);
    try {
      const weeks = await HealthKitService.getAvailableWeeks(12);
      console.log(`Synced ${weeks.length} weeks from HealthKit`);
      return weeks;
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // save prediction and update history
  const savePrediction = async (prediction) => {
    try {
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];

      // check if there is already a prediction for today
      const existingIndex = predictionHistory.findIndex(p => {
        const predDate = new Date(p.timestamp || p.date);
        return predDate.toISOString().split('T')[0] === todayString;
      });

      const historyEntry = {
        ...prediction,
        timestamp: Date.now(),
        date: Date.now(),
        totalKms: prediction.totalKms || 0,
      };

      let updatedHistory;

      if (existingIndex >= 0) {
        updatedHistory = [...predictionHistory];
        updatedHistory[existingIndex] = historyEntry;
      } else {
        // keep only latest 20 entries
        updatedHistory = [historyEntry, ...predictionHistory].slice(0, 20);
      }

      setCurrentPrediction(prediction);
      setPredictionHistory(updatedHistory);

      await AsyncStorage.setItem('currentPrediction', JSON.stringify(prediction));
      await AsyncStorage.setItem('predictionHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Failed to save prediction:', error);
    }
  };

  // save weekly training data
  const saveTrainingWeeks = async (weeks) => {
    try {
      setTrainingWeeks(weeks);
      await AsyncStorage.setItem('trainingWeeks', JSON.stringify(weeks));
    } catch (error) {
      console.error('Failed to save training weeks:', error);
    }
  };

  // clear all stored data
  const clearAllData = async () => {
    try {
      await AsyncStorage.clear();
      setCurrentPrediction(null);
      setTrainingWeeks([]);
      setPredictionHistory([]);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentPrediction,
        trainingWeeks,
        lastPrediction: currentPrediction,
        predictionHistory,
        loading,
        healthKitAvailable,
        healthKitAuthorized,
        setLoading,
        savePrediction,
        saveTrainingWeeks,
        clearAllData,
        syncHealthKitData,
        initializeHealthKit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// hook to access global state
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside an AppProvider');
  }
  return context;
};

