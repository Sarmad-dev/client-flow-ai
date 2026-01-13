import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { ChevronDown, Building2, Check } from 'lucide-react-native';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Organization } from '@/types/organization';

interface OrganizationSelectorProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function OrganizationSelector({
  showLabel = true,
  compact = false,
}: OrganizationSelectorProps) {
  const { colors } = useTheme();
  const { currentOrganization, organizations, isLoading, switchOrganization } =
    useOrganization();
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleSelectOrganization = async (organization: Organization) => {
    await switchOrganization(organization.id);
    setIsModalVisible(false);
  };

  if (isLoading || organizations.length === 0) {
    return null;
  }

  // If only one organization, don't show selector
  if (organizations.length === 1 && !showLabel) {
    return null;
  }

  const styles = StyleSheet.create({
    container: {
      flexDirection: compact ? 'row' : 'column',
      alignItems: compact ? 'center' : 'flex-start',
    },
    label: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: compact ? 0 : 4,
      marginRight: compact ? 8 : 0,
    },
    selector: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: compact ? 6 : 8,
      borderWidth: 1,
      borderColor: colors.border,
      minWidth: compact ? 120 : 200,
    },
    selectorText: {
      flex: 1,
      fontSize: compact ? 14 : 16,
      color: colors.text,
      fontWeight: '500',
    },
    icon: {
      marginLeft: 8,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.background,
      borderRadius: 12,
      padding: 16,
      width: '80%',
      maxHeight: '60%',
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    organizationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 4,
    },
    selectedItem: {
      backgroundColor: colors.primary + '20',
    },
    organizationIcon: {
      marginRight: 12,
    },
    organizationInfo: {
      flex: 1,
    },
    organizationName: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    organizationDescription: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    checkIcon: {
      marginLeft: 8,
    },
    closeButton: {
      marginTop: 16,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    closeButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '500',
    },
  });

  const renderOrganizationItem = ({ item }: { item: Organization }) => {
    const isSelected = currentOrganization?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.organizationItem, isSelected && styles.selectedItem]}
        onPress={() => handleSelectOrganization(item)}
      >
        <Building2
          size={20}
          color={isSelected ? colors.primary : colors.textSecondary}
          style={styles.organizationIcon}
        />
        <View style={styles.organizationInfo}>
          <Text style={styles.organizationName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.organizationDescription}>
              {item.description}
            </Text>
          )}
        </View>
        {isSelected && (
          <Check size={20} color={colors.primary} style={styles.checkIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {showLabel && <Text style={styles.label}>Organization</Text>}
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setIsModalVisible(true)}
      >
        <Building2
          size={16}
          color={colors.textSecondary}
          style={{ marginRight: 8 }}
        />
        <Text style={styles.selectorText} numberOfLines={1}>
          {currentOrganization?.name || 'Select Organization'}
        </Text>
        <ChevronDown
          size={16}
          color={colors.textSecondary}
          style={styles.icon}
        />
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modal}
          activeOpacity={1}
          onPress={() => setIsModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Select Organization</Text>
            <FlatList
              data={organizations}
              keyExtractor={(item) => item.id}
              renderItem={renderOrganizationItem}
              showsVerticalScrollIndicator={false}
            />
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
