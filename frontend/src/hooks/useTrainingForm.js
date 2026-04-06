import { useState } from 'react';
import { INITIAL_WEEK_DATA } from '../constants/trainingConstants';

// hook to manage the training form
export const useTrainingForm = () => {
  // start with 4 empty weeks
  const [weeks, setWeeks] = useState([
    { ...INITIAL_WEEK_DATA },
    { ...INITIAL_WEEK_DATA },
    { ...INITIAL_WEEK_DATA },
    { ...INITIAL_WEEK_DATA },
  ]);

  // tracks which week sections are open in the UI
  const [expandedWeeks, setExpandedWeeks] = useState({});

  // open/close a week card
  const toggleWeek = (index) => {
    setExpandedWeeks(prev => ({ ...prev, [index]: !prev[index] }));
  };

  // update a field inside a specific week
  const updateWeek = (index, field, value, allWeeksData, setAllWeeksData) => {
    // update local form state
    const updated = [...weeks];
    updated[index] = { ...updated[index], [field]: value };
    setWeeks(updated);

    // also update full dataset if provided
    if (allWeeksData) {
      const updatedAll = [...allWeeksData];

      // UI shows newest week first, so we reverse index to match data order
      const actualIndex = allWeeksData.length - 1 - index;

      updatedAll[actualIndex] = {
        ...updatedAll[actualIndex],
        [field]: value
      };

      setAllWeeksData(updatedAll);
    }
  };

  // reset form back to empty
  const resetForm = () => {
    setWeeks([
      { ...INITIAL_WEEK_DATA },
      { ...INITIAL_WEEK_DATA },
      { ...INITIAL_WEEK_DATA },
      { ...INITIAL_WEEK_DATA },
    ]);
    setExpandedWeeks({});
  };

  return { weeks, setWeeks, expandedWeeks, toggleWeek, updateWeek, resetForm };
};