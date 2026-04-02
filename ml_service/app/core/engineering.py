import numpy as np
import pandas as pd
from typing import List

# Simple helper to avoid division by zero errors in the calculations
def safe_divide(numerator, denominator, defaultValue=0):
    return np.where(denominator != 0, numerator / denominator, defaultValue)

# Helper functions for rolling windows (grouped by Athlete to keep data separate)
def get_rolling_sum(df, column, windowSize):
    return df.groupby('Athlete ID')[column].transform(
        lambda x: x.rolling(window=windowSize, min_periods=1).sum()
    )

def get_rolling_mean(df, column, windowSize):
    return df.groupby('Athlete ID')[column].transform(
        lambda x: x.rolling(window=windowSize, min_periods=1).mean()
    )

def get_rolling_std(df, column, windowSize):
    return df.groupby('Athlete ID')[column].transform(
        lambda x: x.rolling(window=windowSize, min_periods=1).std()
    )

def calculate_acwr_metrics(df):
    # Acute = current week, Chronic = previous 4-week average
    acute = get_rolling_sum(df, 'total kms', 1)

    df['_chronic'] = df.groupby('Athlete ID')['total kms'].transform(
        lambda x: x.rolling(4, min_periods=1).mean().shift(1)
    )

    chronic = df['_chronic'].fillna(get_rolling_mean(df, 'total kms', 4))

    df['acwr_total_kms'] = acute / np.maximum(chronic, 0.1)

    # High intensity version
    hi_col = 'total km Z3-Z4-Z5-T1-T2'
    acute_hi = get_rolling_sum(df, hi_col, 1)

    df['_chronic_hi'] = df.groupby('Athlete ID')[hi_col].transform(
        lambda x: x.rolling(4, min_periods=1).mean().shift(1)
    )

    chronic_hi = df['_chronic_hi'].fillna(get_rolling_mean(df, hi_col, 4))

    df['acwr_hi_kms'] = safe_divide(acute_hi, chronic_hi, 1.0)

    return df.drop(['_chronic', '_chronic_hi'], axis=1)

def calculate_monotony(df):
    # If the exertion doesn't vary much, the monotony score goes up (risk factor)
    exertionRange = df['max exertion'] - df['min exertion']
    avgExertion = (df['max exertion'] + df['min exertion']) / 2
    
    estimatedStd = exertionRange / 2.5 # Rough estimate of StdDev from range
    df['monotony_weekly_load'] = avgExertion / (estimatedStd + 0.05)
    df['monotony_weekly_load'] = df['monotony_weekly_load'].clip(0, 10.0)
    
    # If you only ran once or twice, monotony isn't really a risk yet
    df.loc[df['nr. sessions'] <= 2, 'monotony_weekly_load'] = 1.0
    return df

def calculate_spikes(df):
    # Comparing current high intensity to the previous week to catch big jumps
    currentHiLoad = get_rolling_sum(df, 'total km Z5-T1-T2', windowSize=1)
    previousHiLoad = df.groupby('Athlete ID')['total km Z5-T1-T2'].transform(
        lambda x: x.rolling(window=1, min_periods=1).sum().shift(1)
    )
    df['hi_load_spike_ratio'] = currentHiLoad / np.maximum(previousHiLoad, 0.1)
    
    # Comparing today's longest run against the average of the previous two long runs
    dailyMax = df['max km one day']
    previousAvgMax = (df['max km one day.1'] + df['max km one day.2']) / 2
    df['max_daily_km_spike_ratio'] = safe_divide(dailyMax, previousAvgMax, defaultValue=1.0)
    
    return df

def engineer_all_features(df):
    # Ensure correct order for rolling calculations
    df = df.sort_values(['Athlete ID', 'Date']).reset_index(drop=True)

    df = calculate_acwr_metrics(df)
    df = calculate_monotony(df)
    df = calculate_spikes(df)

    # Difference between effort and recovery
    df['exertion_recovery_gap_7d'] = df['avg exertion'] - df['avg recovery']

    # Rest consistency over last 2 weeks
    recent_rest = get_rolling_sum(df, 'nr. rest days', 2)
    typical_rest = df.groupby('Athlete ID')['nr. rest days'].transform(
        lambda x: x.rolling(2, min_periods=1).sum().expanding().median()
    )
    df['rest_day_deficiency_14d'] = np.maximum(0, typical_rest - recent_rest)

    # Variation in exertion
    mean_ex = get_rolling_mean(df, 'avg exertion', 4)
    std_ex = get_rolling_std(df, 'avg exertion', 4)
    df['cv_exertion_7d'] = safe_divide(std_ex, mean_ex, 0) * 100

    # High intensity proportion (last 4 weeks)
    hi_4w = get_rolling_sum(df, 'total km Z5-T1-T2', 4)
    total_4w = get_rolling_sum(df, 'total kms', 4)
    df['cumulative_hi_pct_30d'] = (hi_4w / np.maximum(total_4w, 0.5)) * 100

    # Training success drop
    recent = get_rolling_mean(df, 'avg training success', 1)
    prev = df.groupby('Athlete ID')['avg training success'].transform(
        lambda x: x.rolling(1, min_periods=1).mean().shift(1)
    )
    df['training_success_decline_7d'] = prev - recent

    # Effort variability compared to personal history
    df['range'] = df['max exertion'] - df['min exertion']
    df['baseline_range'] = df.groupby('Athlete ID')['range'].transform(
        lambda x: x.expanding(min_periods=1).median()
    )
    df['exertion_variability_spike'] = df['range'] - df['baseline_range']

    # Interval intensity
    interval_days = get_rolling_sum(df, 'nr. days with interval session', 1)
    interval_dist = get_rolling_sum(df, 'total km Z3-4', 1)
    avg_int = safe_divide(interval_dist, interval_days, 0)

    df['interval_session_intensity_7d'] = interval_days * np.log1p(avg_int)

    df['interval_intensity_zscore'] = (
        df['interval_session_intensity_7d'] - df['interval_session_intensity_7d'].mean()
    ) / (df['interval_session_intensity_7d'].std() + 0.001)

    return df

def get_final_features():
    # These must match the features used during the XGBoost training phase
    return [
        'monotony_weekly_load', 'cv_exertion_7d', 'acwr_hi_kms',
        'interval_intensity_zscore', 'exertion_variability_spike',
        'hi_load_spike_ratio', 'acwr_total_kms', 'exertion_recovery_gap_7d',
        'max_daily_km_spike_ratio', 'training_success_decline_7d',
        'rest_day_deficiency_14d', 'cumulative_hi_pct_30d'
    ]

