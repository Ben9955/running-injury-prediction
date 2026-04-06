import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { useApp } from '../context/AppContext';
import { metricConfig } from '../config/metricConfig';
import RiskGauge from '../components/RiskGauge';
import StatCard from '../components/StatCard';
import RecommendationCard from '../components/RecommendationCard';
import colors from '../theme/colors';
import typography from '../theme/typography';
import spacing from '../theme/spacing';

const DashboardScreen = ({ navigation }) => {
  const { currentPrediction } = useApp();

  const showMetricInfo = (config) => {
    Alert.alert(config.label, config.description, [{ text: 'Got it' }]);
  };

  if (!currentPrediction) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <View style={styles.header}>
            <Text style={styles.greeting}>Welcome, Runner</Text>
            <Text style={styles.subtitle}>Get started by logging your training data</Text>
          </View>

          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Predictions Yet</Text>
            <Text style={styles.emptyText}>
              Log 4 weeks of training data to get your injury risk prediction
            </Text>
            
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => navigation.navigate('Log Training')}
            >
              <Text style={styles.ctaText}>Log Training Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { injury_risk_percent, risk_level, key_factors, recommendations } = currentPrediction;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, Runner</Text>
          <Text style={styles.subtitle}>Here's your injury risk analysis</Text>
        </View>

        <View style={styles.gaugeCard}>
          <RiskGauge riskPercent={injury_risk_percent} riskLevel={risk_level} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Risk Drivers</Text>
          
          {Object.entries(key_factors)
            .filter(([factor]) => metricConfig[factor] !== undefined)
            .sort(([a], [b]) => (a.includes('acwr') ? -1 : 1))
            .map(([factor, value], index) => {
              const config = metricConfig[factor];

              return (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => showMetricInfo(config)} 
                  activeOpacity={0.7}
                >
                  <StatCard
                    icon={config.icon}
                    label={config.label}
                    value={typeof value === 'number' ? value.toFixed(2) : value}
                    color={config.getColor(value)}
                    subtitle="Tap for info"
                  />
                </TouchableOpacity>
              );
            })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          
          {recommendations.map((rec, index) => (
            <RecommendationCard key={index} text={rec} />
          ))}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  gaugeCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.screenPadding,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },
  emptyState: {
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyTitle: {
    ...typography.subtitle,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  ctaButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  ctaText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default DashboardScreen;