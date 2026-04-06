import numpy as np
import pandas as pd


# Avoid division by zero
def safe_divide(numerator, denominator, default_value=0):
    return np.where(denominator != 0, numerator / denominator, default_value)


# Rolling helpers (grouped by athlete)
def get_rolling_sum(df, column, window_size):
    return df.groupby('Athlete ID')[column].transform(
        lambda x: x.rolling(window=window_size, min_periods=1).sum()
    )


def get_rolling_mean(df, column, window_size):
    return df.groupby('Athlete ID')[column].transform(
        lambda x: x.rolling(window=window_size, min_periods=1).mean()
    )


def get_rolling_std(df, column, window_size):
    return df.groupby('Athlete ID')[column].transform(
        lambda x: x.rolling(window=window_size, min_periods=1).std()
    )


def calculate_acwr_metrics(df):
    # Acute (current week)
    acute = get_rolling_sum(df, 'total kms', 1)

    # Chronic (previous 4 weeks average, shifted)
    df['_chronic'] = df.groupby('Athlete ID')['total kms'].transform(
        lambda x: x.rolling(4, min_periods=1).mean().shift(1)
    )

    chronic = df['_chronic'].fillna(get_rolling_mean(df, 'total kms', 4))
    df['acwr_total_kms'] = acute / np.maximum(chronic, 0.1)

    # High intensity ACWR
    hi_col = 'total km Z3-Z4-Z5-T1-T2'
    acute_hi = get_rolling_sum(df, hi_col, 1)

    df['_chronic_hi'] = df.groupby('Athlete ID')[hi_col].transform(
        lambda x: x.rolling(4, min_periods=1).mean().shift(1)
    )

    chronic_hi = df['_chronic_hi'].fillna(get_rolling_mean(df, hi_col, 4))
    df['acwr_hi_kms'] = safe_divide(acute_hi, chronic_hi, 1.0)

    return df.drop(['_chronic', '_chronic_hi'], axis=1)


def calculate_monotony(df):
    exertion_range = df['max exertion'] - df['min exertion']
    avg_exertion = (df['max exertion'] + df['min exertion']) / 2

    estimated_std = exertion_range / 2.5
    df['monotony_weekly_load'] = avg_exertion / (estimated_std + 0.05)
    df['monotony_weekly_load'] = df['monotony_weekly_load'].clip(0, 10.0)

    # Low session count → not reliable
    df.loc[df['nr. sessions'] <= 2, 'monotony_weekly_load'] = 1.0

    return df


def calculate_spikes(df):
    # High-intensity spike
    current_hi = get_rolling_sum(df, 'total km Z5-T1-T2', 1)
    prev_hi = df.groupby('Athlete ID')['total km Z5-T1-T2'].transform(
        lambda x: x.rolling(1, min_periods=1).sum().shift(1)
    )

    df['hi_load_spike_ratio'] = current_hi / np.maximum(prev_hi, 0.1)

    # Max distance spike
    current_max = df['max km one day']
    prev_avg_max = (df['max km one day.1'] + df['max km one day.2']) / 2

    df['max_daily_km_spike_ratio'] = safe_divide(current_max, prev_avg_max, 1.0)

    return df


def engineer_all_features(df):
    # Ensure correct order for rolling calculations
    df = df.sort_values(['Athlete ID', 'Date']).reset_index(drop=True)

    df = calculate_acwr_metrics(df)
    df = calculate_monotony(df)
    df = calculate_spikes(df)

    # Effort vs recovery gap
    df['exertion_recovery_gap_7d'] = df['avg exertion'] - df['avg recovery']

    # Rest day deficiency
    recent_rest = get_rolling_sum(df, 'nr. rest days', 2)
    typical_rest = df.groupby('Athlete ID')['nr. rest days'].transform(
        lambda x: x.rolling(2, min_periods=1).sum().expanding().median()
    )

    df['rest_day_deficiency_14d'] = np.maximum(0, typical_rest - recent_rest)

    # Exertion variability (coefficient of variation)
    mean_ex = get_rolling_mean(df, 'avg exertion', 4)
    std_ex = get_rolling_std(df, 'avg exertion', 4)

    df['cv_exertion_7d'] = safe_divide(std_ex, mean_ex, 0) * 100

    # High intensity percentage (4-week)
    hi_4w = get_rolling_sum(df, 'total km Z5-T1-T2', 4)
    total_4w = get_rolling_sum(df, 'total kms', 4)

    df['cumulative_hi_pct_30d'] = (hi_4w / np.maximum(total_4w, 0.5)) * 100

    # Training success decline
    recent_ts = get_rolling_mean(df, 'avg training success', 1)
    prev_ts = df.groupby('Athlete ID')['avg training success'].transform(
        lambda x: x.rolling(1, min_periods=1).mean().shift(1)
    )

    df['training_success_decline_7d'] = prev_ts - recent_ts

    # Exertion variability spike
    df['range'] = df['max exertion'] - df['min exertion']
    df['baseline_range'] = df.groupby('Athlete ID')['range'].transform(
        lambda x: x.expanding(min_periods=1).median()
    )

    df['exertion_variability_spike'] = df['range'] - df['baseline_range']

    # Interval intensity
    interval_days = get_rolling_sum(df, 'nr. days with interval session', 1)
    interval_dist = get_rolling_sum(df, 'total km Z3-4', 1)

    avg_intensity = safe_divide(interval_dist, interval_days, 0)
    df['interval_session_intensity_7d'] = interval_days * np.log1p(avg_intensity)

    # Z-score relative to athlete history
    mean_int = df.groupby('Athlete ID')['interval_session_intensity_7d'].transform('mean')
    std_int = df.groupby('Athlete ID')['interval_session_intensity_7d'].transform('std').fillna(0)

    df['interval_intensity_zscore'] = (
        df['interval_session_intensity_7d'] - mean_int
    ) / (std_int + 0.001)

    return df


def get_final_features():
    return [
        'monotony_weekly_load',
        'cv_exertion_7d',
        'acwr_hi_kms',
        'interval_intensity_zscore',
        'exertion_variability_spike',
        'hi_load_spike_ratio',
        'acwr_total_kms',
        'exertion_recovery_gap_7d',
        'max_daily_km_spike_ratio',
        'training_success_decline_7d',
        'rest_day_deficiency_14d',
        'cumulative_hi_pct_30d',
    ]




