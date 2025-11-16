import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailSortOptions } from './useEmailSearch';

const SORT_PREFERENCES_KEY = '@email_sort_preferences';

export function useEmailSortPreferences() {
  const [sortOptions, setSortOptions] = useState<EmailSortOptions>({
    field: 'date',
    order: 'desc',
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(SORT_PREFERENCES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as EmailSortOptions;
        setSortOptions(parsed);
      }
    } catch (error) {
      console.error('Failed to load sort preferences:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const updateSortOptions = async (newOptions: EmailSortOptions) => {
    try {
      setSortOptions(newOptions);
      await AsyncStorage.setItem(
        SORT_PREFERENCES_KEY,
        JSON.stringify(newOptions)
      );
    } catch (error) {
      console.error('Failed to save sort preferences:', error);
    }
  };

  return {
    sortOptions,
    updateSortOptions,
    isLoaded,
  };
}
