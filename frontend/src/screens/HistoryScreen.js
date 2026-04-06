import { useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  SafeAreaView, 
  Modal, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { metricConfig } from '../config/metricConfig';
import WeekCard from '../components/WeekCard';
import colors from '../theme/colors';
import typography from '../theme/typography';
import spacing from '../theme/spacing';

const HistoryScreen = () => {
  const { predictionHistory } = useApp();
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openDetails = (prediction) => {
    setSelectedPrediction(prediction);
    setModalVisible(true);
  };

  const renderDetailModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {selectedPrediction && (
            <>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Injury Report</Text>
                  <Text style={styles.modalSubtitle}>
                    {new Date(selectedPrediction.date || Date.now()).toLocaleDateString('en-GB', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.riskScoreContainer}>
                  <View style={styles.riskTextRow}>
                    <Text style={styles.riskScoreLabel}>Risk Probability</Text>
                    <Text style={[
                      styles.riskScoreValue, 
                      { color: selectedPrediction.injury_risk_percent > 50 ? colors.error : colors.success }
                    ]}>
                      {selectedPrediction.injury_risk_percent}%
                    </Text>
                  </View>
                  
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        { 
                          width: `${selectedPrediction.injury_risk_percent}%`,
                          backgroundColor: selectedPrediction.injury_risk_percent > 50 ? colors.error : colors.success 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={styles.riskLevelText}>
                    {selectedPrediction.risk_level.toUpperCase()} RISK LEVEL
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>Analyzed Metrics</Text>
                <View style={styles.metricsContainer}>
                  {Object.entries(selectedPrediction.key_factors || {})
                    .filter(([key]) => metricConfig[key])
                    .map(([key, value], i) => (
                      <View key={i} style={styles.metricRow}>
                        <Text style={styles.metricName}>{metricConfig[key].label}</Text>
                        <Text style={styles.metricValue}>
                          {typeof value === 'number' ? value.toFixed(2) : value}
                          {metricConfig[key].unit || ''}
                        </Text>
                      </View>
                    ))}
                </View>

                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Done</Text>
                </TouchableOpacity>
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>
          {predictionHistory.length} prediction{predictionHistory.length !== 1 ? 's' : ''} saved
        </Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.list}>
          {predictionHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={60} color={colors.text.secondary} />
              <Text style={styles.emptyText}>No predictions yet</Text>
            </View>
          ) : (
            predictionHistory.map((prediction, index) => {
              const dateObj = new Date(prediction.date || prediction.timestamp);
              const dateLabel = dateObj.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
              });

              return (
                <WeekCard
                  key={index}
                  weekNumber={dateLabel}
                  distance={`${(prediction.totalKms || 0).toFixed(1)} km`}
                  riskPercent={prediction.injury_risk_percent}
                  riskLevel={prediction.risk_level}
                  onPress={() => openDetails(prediction)}
                />
              );
            })
          )}
        </View>
        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderDetailModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    paddingHorizontal: spacing.screenPadding, 
    paddingTop: spacing.xxl, 
    paddingBottom: spacing.lg 
  },
  title: { ...typography.title, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary },
  scrollView: { flex: 1 },
  list: { paddingHorizontal: spacing.screenPadding },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 28,
    padding: spacing.xl,
    width: '100%',
    maxHeight: '75%',
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: { 
    ...typography.h2, 
    color: colors.text.primary, 
    fontSize: 22 
  },
  modalSubtitle: { 
    ...typography.caption, 
    color: colors.text.secondary, 
    marginTop: 2 
  },
  riskScoreContainer: {
    backgroundColor: '#F0F2F5',
    padding: spacing.lg,
    borderRadius: 20,
    marginBottom: spacing.xl,
  },
  riskTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  riskScoreLabel: { 
    ...typography.body, 
    color: colors.text.secondary, 
    fontWeight: '600' 
  },
  riskScoreValue: { 
    fontSize: 36, 
    fontWeight: '900' 
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#E0E4E8',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  riskLevelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.secondary,
    letterSpacing: 1,
    textAlign: 'center'
  },
  sectionTitle: { 
    ...typography.h3, 
    marginBottom: spacing.md, 
    fontSize: 16, 
    color: colors.text.primary 
  },
  metricsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  metricName: { 
    ...typography.body, 
    color: colors.text.secondary 
  },
  metricValue: { 
    ...typography.body, 
    fontWeight: '700', 
    color: colors.text.primary 
  },
  closeButton: {
    backgroundColor: colors.text.primary,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  closeButtonText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
  emptyState: { 
    alignItems: 'center', 
    marginTop: 100 
  },
  emptyText: { 
    ...typography.body, 
    color: colors.text.secondary, 
    marginTop: spacing.md 
  },
  bottomPadding: { height: 40 },
});

export default HistoryScreen;