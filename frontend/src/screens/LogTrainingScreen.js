import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useTrainingForm } from '../hooks/useTrainingForm';
import { predictInjuryRisk, formatWeekForAPI } from '../api/apiClient';
import TrainingWeekCard from '../components/TrainingWeekCard';
import colors from '../theme/colors';
import typography from '../theme/typography';
import spacing from '../theme/spacing';

const LogTrainingScreen = () => {
  const navigation = useNavigation();

  const { 
    savePrediction, 
    saveTrainingWeeks, 
    setLoading, 
    loading, 
    syncHealthKitData, 
    healthKitAuthorized, 
    initializeHealthKit, 
    lastPrediction 
  } = useApp();

  const [allSyncData, setAllSyncData] = useState(null);
  const [isSynced, setIsSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { 
    weeks, 
    setWeeks, 
    expandedWeeks, 
    toggleWeek, 
    updateWeek, 
    resetForm 
  } = useTrainingForm();

  const handleSync = async () => {
    if (!healthKitAuthorized) {
      const isAuthorized = await initializeHealthKit();
      if (!isAuthorized) return;
    }

    setSyncing(true);

    try {
      const healthData = await syncHealthKitData();
      setAllSyncData(healthData);

      const recentWeeks = healthData.slice(-4).reverse().map(week => ({
        ...week,
        totalKms: String(week.totalKms || ''),
        nrSessions: String(week.nrSessions || ''),
        nrRestDays: String(week.nrRestDays || ''),
        avgTrainingSuccess: String(week.avgTrainingSuccess),
      }));

      setWeeks(recentWeeks);
      setIsSynced(true);
      Alert.alert('Success', 'Apple Watch data imported successfully.');
    } catch (error) {
      console.error("Sync error:", error.message);
      Alert.alert('Sync Error', error.message);
    } finally {
      setSyncing(false);
    }
  };

  const submitPrediction = async () => {
    const hasMissingData = weeks.some(w => !w.totalKms || !w.nrSessions);
    if (hasMissingData) {
      Alert.alert('Missing Data', 'Please fill in total distance and sessions for all weeks.');
      return;
    }

    const invalidData = weeks.some(w => { 
      const sessions = parseInt(w.nrSessions); 
      const restDays = parseInt(w.nrRestDays || 0);
      
      const exertion = parseFloat(w.avgExertion); 
      const recovery = parseFloat(w.avgRecovery);
      const success = parseFloat(w.avgTrainingSuccess);

      return (
        sessions > 7 || 
        restDays > 7 || 
        exertion < 1 || exertion > 10 || 
        recovery < 1 || recovery > 10 || 
        success < 1 || success > 10
      );
    });

    if (invalidData) {
      Alert.alert(
        'Invalid Input',
        'Please ensure:\n\n' +
        '- Sessions and rest days are ≤ 7\n' +
        '- Exertion and recovery are between 1 and 10'
      );
      return;
    }

    const currentTotalMileage = weeks.reduce(
      (sum, w) => sum + parseFloat(w.totalKms || 0),
      0
    );

    if (lastPrediction) {
      const startOfCurrentWeek = new Date();
      const dayOffset = startOfCurrentWeek.getDay() === 0 ? 6 : startOfCurrentWeek.getDay() - 1;
      startOfCurrentWeek.setDate(startOfCurrentWeek.getDate() - dayOffset);
      startOfCurrentWeek.setHours(0, 0, 0, 0);

      const predictionIsFromThisWeek = new Date(lastPrediction.timestamp) >= startOfCurrentWeek;
      const mileageIsUnchanged = Math.abs(lastPrediction.totalKms - currentTotalMileage) < 0.1;

      if (predictionIsFromThisWeek && mileageIsUnchanged) {
        Alert.alert('No New Data', 'Risk already calculated for this week.');
        return;
      }
    }

    try {
      setLoading(true);

      const chronologicalWeeks = [...weeks].reverse();
      const historicalContext = (allSyncData && allSyncData.length === 12)
        ? allSyncData
        : chronologicalWeeks;

      const formattedWeeks = historicalContext.map((week, index) => ({
        ...formatWeekForAPI(week, historicalContext, index),
        date: week.weekTimestamp || (Date.now() - ((historicalContext.length - 1 - index) * 604800000)),
      }));

      const predictionResult = await predictInjuryRisk(1001, formattedWeeks);

      await savePrediction({ 
        ...predictionResult, 
        totalKms: currentTotalMileage, 
        timestamp: Date.now() 
      });

      await saveTrainingWeeks(historicalContext);

      resetForm();
      navigation.navigate('Dashboard');

    } catch (error) {
      console.error("Prediction error:", error.message);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Log Training</Text>
        <Text style={styles.subtitle}>Review metrics for the last 4 weeks</Text>
      </View>

      <TouchableOpacity 
        style={styles.syncButton} 
        onPress={handleSync} 
        disabled={syncing}
      >
        {syncing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.row}>
            <Ionicons name="watch" size={20} color="#fff" />
            <Text style={styles.syncButtonText}>Sync Apple Watch</Text>
          </View>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {weeks.map((week, index) => (
            <TrainingWeekCard 
              key={index}
              week={week}
              index={index}
              isExpanded={expandedWeeks[index]}
              onToggle={toggleWeek}
              onUpdate={(idx, field, val) => updateWeek(idx, field, val, allSyncData, setAllSyncData)}
              isSynced={isSynced}
            />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitButton, loading && { opacity: 0.7 }]} 
          onPress={submitPrediction} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Calculate Risk</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  header: { 
    padding: spacing.lg 
  },
  title: { 
    ...typography.title, 
    color: colors.text.primary 
  },
  subtitle: { 
    ...typography.body, 
    color: colors.text.secondary 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8 
  },
  syncButton: {
    backgroundColor: colors.primary,
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: 8,
    alignItems: 'center'
  },
  syncButtonText: { 
    color: '#fff', 
    fontWeight: '600' 
  },
  scrollView: { 
    flex: 1 
  },
  form: { 
    paddingHorizontal: spacing.lg 
  },
  footer: { 
    padding: spacing.lg, 
    borderTopWidth: 1, 
    borderColor: colors.border 
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10
  },
  submitButtonText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  }
});

export default LogTrainingScreen;




