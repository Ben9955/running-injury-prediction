import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TrainingInput from './TrainingInput'; // Double check this path!
import colors from '../theme/colors';
import spacing from '../theme/spacing';
import typography from '../theme/typography';

const TrainingWeekCard = ({ 
  week, 
  index, 
  isExpanded, 
  onToggle, 
  onUpdate, 
  isSynced 
}) => {
  return (
    <View style={styles.weekCard}>
      <View style={styles.weekHeader}>
        <Text style={styles.weekTitle}>
          Week {4 - index} {index === 0 && '(This Week)'}
        </Text>
        {isSynced && (
          <View style={styles.syncBadge}>
            <Ionicons name="watch" size={12} color={colors.success} />
            <Text style={styles.syncBadgeText}>Synced</Text>
          </View>
        )}
      </View>

      <TrainingInput 
        label="Total Kilometers" 
        value={week.totalKms} 
        onChangeText={(v) => onUpdate(index, 'totalKms', v)} 
        placeholder="0.0" 
        suffix="km" 
      />
      <TrainingInput 
        label="Max KM in One Day" 
        value={week.maxKmOneDay} 
        onChangeText={(v) => onUpdate(index, 'maxKmOneDay', v)} 
        placeholder="0.0" 
        suffix="km" 
      />
      <TrainingInput 
        label="Number of Sessions" 
        value={week.nrSessions} 
        onChangeText={(v) => onUpdate(index, 'nrSessions', v)} 
        placeholder="0" 
      />
      <TrainingInput 
        label="Number of Rest Days" 
        value={week.nrRestDays} 
        onChangeText={(v) => onUpdate(index, 'nrRestDays', v)} 
        placeholder="0" 
      />

      <TouchableOpacity style={styles.expandButton} onPress={() => onToggle(index)}>
        <Text style={styles.expandButtonText}>
            {isExpanded ? 'Hide' : 'Show'} Advanced Metrics
        </Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.text.secondary} />
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.advancedFields}>
          <TrainingInput 
            label="Avg Exertion (1-10)" 
            value={week.avgExertion} 
            onChangeText={(v) => onUpdate(index, 'avgExertion', v)} 
            placeholder="5.0" 
            suffix="/ 10" 
          />
          <TrainingInput 
            label="Avg Recovery (1-10)" 
            value={week.avgRecovery} 
            onChangeText={(v) => onUpdate(index, 'avgRecovery', v)} 
            placeholder="7.0" suffix="/ 10" 
          />
          <TrainingInput 
            label="Run Quality / Success (1-10)" 
            value={week.avgTrainingSuccess} 
            onChangeText={(v) => onUpdate(index, 'avgTrainingSuccess', v)} 
            placeholder="7.0" 
            suffix="/ 10" 
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  weekCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  weekTitle: {
    ...typography.cardTitle,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: spacing.borderRadius.sm,
    gap: 4,
  },
  syncBadgeText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '600',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  expandButtonText: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  advancedFields: {
    marginTop: spacing.sm,
  },
});

export default TrainingWeekCard;