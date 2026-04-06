import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import typography from '../theme/typography';
import spacing from '../theme/spacing';

const RecommendationCard = ({ text, type = 'info' }) => {
  const getIcon = () => {
    if (text.toLowerCase().includes('low')) return 'checkmark-circle';
    if (text.toLowerCase().includes('moderate')) return 'alert-circle';
    if (text.toLowerCase().includes('high')) return 'warning';
    return 'information-circle';
  };

  const getColor = () => {
    if (text.toLowerCase().includes('low')) return colors.risk.low;
    if (text.toLowerCase().includes('moderate')) return colors.risk.moderate;
    if (text.toLowerCase().includes('high')) return colors.risk.high;
    return colors.secondary;
  };

  const color = getColor();

  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={getIcon()} size={20} color={color} />
      </View>
      
      <Text style={styles.text}>{text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.cardSpacing,
    borderLeftWidth: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: spacing.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  text: {
    ...typography.body,
    color: colors.text.primary,
    flex: 1,
  },
});

export default RecommendationCard;