import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import colors from '../theme/colors';
import typography from '../theme/typography';
import spacing from '../theme/spacing';

const RiskGauge = ({ riskPercent, riskLevel }) => {
  const getRiskColor = () => {
    if (riskLevel === 'low') return colors.risk.low;
    if (riskLevel === 'moderate') return colors.risk.moderate;
    return colors.risk.high;
  };

  const getRiskLabel = () => {
    if (riskLevel === 'low') return 'Low Risk';
    if (riskLevel === 'moderate') return 'Moderate Risk';
    return 'High Risk';
  };

  return (
    <View style={styles.container}>
      <AnimatedCircularProgress
        size={200}
        width={20}
        fill={riskPercent}
        tintColor={getRiskColor()}
        backgroundColor={colors.border}
        rotation={0}
        lineCap="round"
      >
        {() => (
          <View style={styles.innerContent}>
            <Text style={[styles.percentText, { color: getRiskColor() }]}>
              {Math.round(riskPercent)}%
            </Text>
            <Text style={styles.label}>Injury Risk</Text>
          </View>
        )}
      </AnimatedCircularProgress>
      
      <View style={[styles.badge, { backgroundColor: getRiskColor() }]}>
        <Text style={styles.badgeText}>{getRiskLabel()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  innerContent: {
    alignItems: 'center',
  },
  percentText: {
    ...typography.number,
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.label,
    color: colors.text.secondary,
  },
  badge: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.lg,
  },
  badgeText: {
    ...typography.cardTitle,
    color: colors.text.light,
  },
});

export default RiskGauge;