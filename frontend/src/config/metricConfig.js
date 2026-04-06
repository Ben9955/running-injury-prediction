import colors from '../theme/colors';

export const metricConfig = {
  acwr_total_kms: {
    icon: 'trending-up',
    label: 'Load Spike',
    description: 'Measures if you suddenly increased your weekly mileage compared to your 4-week average. Values above 1.5 indicate high injury risk. Recommended range: 0.8-1.3.',
    getColor: (val) => (val > 1.5 ? colors.danger : val > 1.3 ? colors.warning : colors.success)
  },
  cumulative_hi_pct_30d: {
    icon: 'flame',
    label: 'High Intensity %',
    description: 'Percentage of running done at high heart rate zones over the past month. Too much high-intensity work without recovery increases injury risk.',
    getColor: (val) => (val > 30 ? colors.warning : colors.success)
  },
  monotony_weekly_load: {
    icon: 'repeat',
    label: 'Training Monotony',
    description: 'Ratio of mean training load to standard deviation. High values indicate repetitive training without variation, which can lead to overuse injuries.',
    getColor: (val) => (val > 4.0 ? colors.danger : val > 2.0 ? colors.warning : colors.success)
  },
  rest_day_deficiency_14d: {
    icon: 'moon',
    label: 'Rest Deficiency',
    description: 'Number of rest days missing compared to your typical recovery pattern. Insufficient rest prevents adaptation and increases injury risk.',
    getColor: (val) => (val > 2.0 ? colors.warning : colors.success)
  },
  exertion_recovery_gap_7d: {
    icon: 'fitness',
    label: 'Recovery Gap',
    description: 'Difference between perceived exertion and recovery quality. A large gap indicates accumulated fatigue and inadequate recovery.',
    getColor: (val) => (val > 0.5 ? colors.warning : colors.success)
  }
};