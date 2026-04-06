import { View, Text, ScrollView, StyleSheet, SafeAreaView, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useApp } from '../context/AppContext';
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography'; 

const screenWidth = Dimensions.get('window').width;

// format a timestamp into a simple day/month label
const formatDate = (item, index) => {
  if (!item) return '';

  const dateSource = item.weekTimestamp || item.date || item.timestamp;

  if (dateSource) {
    const date = new Date(dateSource);
    if (!isNaN(date.getTime())) {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    }
  }

  // fallback if no valid date
  return `W${index + 1}`;
};

const AnalyticsScreen = () => {
  const { predictionHistory, trainingWeeks } = useApp();

  // --- distance chart ---
  const distanceLabels = trainingWeeks.length > 0
    ? trainingWeeks.map((w, i) => formatDate(w, i))
    : ['No Data'];

  const distanceData = trainingWeeks.length > 0
    ? trainingWeeks.map(w => parseFloat(w.totalKms) || 0)
    : [0];

  const weeklyDistanceChartData = {
    labels: distanceLabels,
    datasets: [{ data: distanceData }],
  };

  // adjust chart width so labels don’t overlap
  const baseChartWidth = screenWidth - spacing.screenPadding * 2 - spacing.cardPadding * 2;
  const dynamicDistanceChartWidth = Math.max(baseChartWidth, distanceLabels.length * 50);

  // --- risk history chart ---
  // reverse so oldest is on the left
  const historyToShow = [...predictionHistory].slice(0, 12).reverse();

  const riskLabels = historyToShow.length > 0
    ? historyToShow.map((p, i) => formatDate(p, i))
    : ['No Data'];

  const riskData = historyToShow.length > 0
    ? historyToShow.map(p => p.injury_risk_percent || 0)
    : [0];

  const riskHistoryChartData = {
    labels: riskLabels,
    datasets: [{ data: riskData }],
  };

  const dynamicRiskChartWidth = Math.max(baseChartWidth, riskLabels.length * 50);

  // chart styling
  const chartConfig = {
    backgroundColor: colors.cardBackground,
    backgroundGradientFrom: colors.cardBackground,
    backgroundGradientTo: colors.cardBackground,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(29, 53, 87, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(43, 45, 66, ${opacity})`,
    style: {
      borderRadius: spacing.borderRadius.md,
    },
    propsForDots: {
      r: '5',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Training insights and trends</Text>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Distance (km)</Text>
          <Text style={styles.chartDescription}>
            Total running volume per week over the last 12 weeks.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <BarChart
              data={weeklyDistanceChartData}
              width={dynamicDistanceChartWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              showValuesOnTopOfBars
              fromZero
            />
          </ScrollView>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Injury Risk History (%)</Text>
          <Text style={styles.chartDescription}>
            Timeline of injury risk calculations based on training load.
          </Text>
          {predictionHistory.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={riskHistoryChartData}
                width={dynamicRiskChartWidth}
                height={220}
                chartConfig={chartConfig}
                style={styles.chart}
                bezier
                fromZero
              />
            </ScrollView>
          ) : (
            <Text style={styles.emptyChartText}>
              Run your first prediction to see history
            </Text>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {trainingWeeks.reduce((sum, w) => sum + (parseFloat(w.totalKms) || 0), 0).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>Total KM</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{trainingWeeks.length}</Text>
            <Text style={styles.statLabel}>Weeks Logged</Text>
          </View>
          
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{predictionHistory.length}</Text>
            <Text style={styles.statLabel}>Predictions</Text>
          </View>
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
  title: {
    ...typography.title,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  chartCard: {
    backgroundColor: colors.cardBackground,
    marginHorizontal: spacing.screenPadding,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    elevation: 2,
  },
  chartTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  chartDescription: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },
  emptyChartText: {
    textAlign: 'center',
    marginTop: 20,
    color: colors.text.secondary,
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.cardPadding,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    elevation: 1,
  },
  statValue: {
    ...typography.numberMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default AnalyticsScreen;

