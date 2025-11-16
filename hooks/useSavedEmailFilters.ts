import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmailSearchFilters } from './useEmailSearch';

const SAVED_FILTERS_KEY = '@saved_email_filters';

export interface SavedEmailFilter {
  id: string;
  name: string;
  filters: EmailSearchFilters;
  createdAt: string;
}

export function useSavedEmailFilters() {
  const [savedFilters, setSavedFilters] = useState<SavedEmailFilter[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadSavedFilters();
  }, []);

  const loadSavedFilters = async () => {
    try {
      const stored = await AsyncStorage.getItem(SAVED_FILTERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SavedEmailFilter[];
        // Convert date strings back to Date objects
        const withDates = parsed.map((filter) => ({
          ...filter,
          filters: {
            ...filter.filters,
            dateFrom: filter.filters.dateFrom
              ? new Date(filter.filters.dateFrom)
              : undefined,
            dateTo: filter.filters.dateTo
              ? new Date(filter.filters.dateTo)
              : undefined,
          },
        }));
        setSavedFilters(withDates);
      }
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveFilter = async (name: string, filters: EmailSearchFilters) => {
    try {
      const newFilter: SavedEmailFilter = {
        id: Date.now().toString(),
        name,
        filters,
        createdAt: new Date().toISOString(),
      };

      const updated = [...savedFilters, newFilter];
      setSavedFilters(updated);
      await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
      return newFilter;
    } catch (error) {
      console.error('Failed to save filter:', error);
      throw error;
    }
  };

  const deleteFilter = async (id: string) => {
    try {
      const updated = savedFilters.filter((f) => f.id !== id);
      setSavedFilters(updated);
      await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to delete filter:', error);
      throw error;
    }
  };

  const updateFilter = async (
    id: string,
    name: string,
    filters: EmailSearchFilters
  ) => {
    try {
      const updated = savedFilters.map((f) =>
        f.id === id ? { ...f, name, filters } : f
      );
      setSavedFilters(updated);
      await AsyncStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to update filter:', error);
      throw error;
    }
  };

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    updateFilter,
    isLoaded,
  };
}
