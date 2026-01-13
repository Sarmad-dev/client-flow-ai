import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizations } from '@/hooks/useOrganizations';
import type { Organization } from '@/types/organization';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  error: any;
  setCurrentOrganization: (organization: Organization | null) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

interface OrganizationProviderProps {
  children: ReactNode;
}

const CURRENT_ORG_KEY = 'current_organization';

export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const { user } = useAuth();
  const { organizations, isLoading, error } = useOrganizations();
  const [currentOrganization, setCurrentOrganizationState] =
    useState<Organization | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load saved organization from AsyncStorage on mount
  useEffect(() => {
    const loadSavedOrganization = async () => {
      if (!user || isLoading || organizations.length === 0) return;

      try {
        const savedOrgId = await AsyncStorage.getItem(
          `${CURRENT_ORG_KEY}_${user.id}`
        );

        if (savedOrgId) {
          const savedOrg = organizations.find((org) => org.id === savedOrgId);
          if (savedOrg) {
            setCurrentOrganizationState(savedOrg);
            setIsInitialized(true);
            return;
          }
        }

        // If no saved organization or saved org not found, use the first one
        if (organizations.length > 0) {
          const firstOrg = organizations[0];
          setCurrentOrganizationState(firstOrg);
          await AsyncStorage.setItem(
            `${CURRENT_ORG_KEY}_${user.id}`,
            firstOrg.id
          );
        }
      } catch (error) {
        console.error('Failed to load saved organization:', error);
        // Fallback to first organization
        if (organizations.length > 0) {
          setCurrentOrganizationState(organizations[0]);
        }
      } finally {
        setIsInitialized(true);
      }
    };

    loadSavedOrganization();
  }, [user, organizations, isLoading]);

  // Update current organization if it's no longer in the list
  useEffect(() => {
    if (
      !isLoading &&
      currentOrganization &&
      organizations.length > 0 &&
      !organizations.find((org) => org.id === currentOrganization.id)
    ) {
      // Current organization was removed, switch to first available
      const firstOrg = organizations[0];
      setCurrentOrganizationState(firstOrg);
      if (user) {
        AsyncStorage.setItem(`${CURRENT_ORG_KEY}_${user.id}`, firstOrg.id);
      }
    }
  }, [organizations, currentOrganization, isLoading, user]);

  const setCurrentOrganization = async (organization: Organization | null) => {
    setCurrentOrganizationState(organization);

    if (user && organization) {
      try {
        await AsyncStorage.setItem(
          `${CURRENT_ORG_KEY}_${user.id}`,
          organization.id
        );
      } catch (error) {
        console.error('Failed to save current organization:', error);
      }
    } else if (user && !organization) {
      try {
        await AsyncStorage.removeItem(`${CURRENT_ORG_KEY}_${user.id}`);
      } catch (error) {
        console.error('Failed to remove current organization:', error);
      }
    }
  };

  const switchOrganization = async (organizationId: string) => {
    const organization = organizations.find((org) => org.id === organizationId);
    if (organization) {
      await setCurrentOrganization(organization);
    }
  };

  // Reset organization when user logs out
  useEffect(() => {
    if (!user) {
      setCurrentOrganizationState(null);
      setIsInitialized(false);
    }
  }, [user]);

  const value: OrganizationContextType = {
    currentOrganization,
    organizations,
    isLoading: isLoading || !isInitialized,
    error,
    setCurrentOrganization,
    switchOrganization,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      'useOrganization must be used within an OrganizationProvider'
    );
  }
  return context;
}
