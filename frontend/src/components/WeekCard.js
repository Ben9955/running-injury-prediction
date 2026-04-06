import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import spacing from '../theme/spacing';

const WeekCard = ({ weekNumber, distance, riskPercent, riskLevel, onPress }) => {
  const getRiskColor = () => {
    if (riskLevel === 'low') return colors.risk.low;
    if (riskLevel === 'moderate') return colors.risk.moderate;
    return colors.risk.high;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.weekText}>Week {weekNumber}</Text>
        <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
      </View>
      
      <View style={styles.content}>
        <View style={styles.stat}>
          <Ionicons name="fitness" size={18} color={colors.secondary} />
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>{distance} km</Text>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.stat}>
          <Ionicons name="analytics" size={18} color={getRiskColor()} />
          <Text style={styles.statLabel}>Risk</Text>
          <Text style={[styles.statValue, { color: getRiskColor() }]}>
            {Math.round(riskPercent)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.cardPadding,
    marginBottom: spacing.cardSpacing,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekText: {
    ...typography.cardTitle,
    color: colors.text.primary,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statValue: {
    ...typography.numberSmall,
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  divider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
  },
});

export default WeekCard;