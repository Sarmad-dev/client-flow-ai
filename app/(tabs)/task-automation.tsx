import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import {
  useAutomationRules,
  useAutomationTriggers,
  useAutomationSuggestions,
  AutomationRuleWithMetadata,
} from '@/hooks/useTaskAutomation';
import AutomationRuleCard from '@/components/AutomationRuleCard';
import AutomationRuleModal from '@/components/AutomationRuleModal';

export default function TaskAutomationScreen() {
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState<
    AutomationRuleWithMetadata | undefined
  >(undefined);

  const {
    data: rules = [],
    isLoading: rulesLoading,
    refetch: refetchRules,
  } = useAutomationRules();

  const { data: triggers = [], isLoading: triggersLoading } =
    useAutomationTriggers();

  const { data: suggestions = [] } = useAutomationSuggestions();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchRules();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateRule = () => {
    setEditingRule(undefined);
    setModalVisible(true);
  };

  const handleEditRule = (ruleId: string) => {
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      setEditingRule(rule);
      setModalVisible(true);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    setEditingRule(undefined);
  };

  const handleModalSave = () => {
    // Refresh the rules list after saving
    refetchRules();
  };

  const handleApplySuggestion = async (suggestion: any) => {
    Alert.alert(
      'Apply Suggestion',
      `Do you want to create this automation rule: "${suggestion.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: async () => {
            try {
              // Convert suggestion to automation rule format
              const rule = {
                name: suggestion.title,
                description: suggestion.description,
                trigger: suggestion.suggested_rule.trigger,
                conditions: suggestion.suggested_rule.conditions,
                actions: suggestion.suggested_rule.actions,
                is_active: true,
              };

              // For now, show the rule details - in a real implementation, this would create the rule
              Alert.alert(
                'Automation Rule',
                `Would create rule: ${rule.name}\nTrigger: ${rule.trigger}\nActions: ${rule.actions.length}`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Error applying suggestion:', error);
              Alert.alert('Error', 'Failed to apply suggestion');
            }
          },
        },
      ]
    );
  };

  const activeRules = rules.filter((rule) => rule.is_active);
  const inactiveRules = rules.filter((rule) => !rule.is_active);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    createButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    createButtonText: {
      color: 'white',
      fontWeight: '600',
      marginLeft: 4,
    },
    scrollContent: {
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 8,
    },
    sectionSubtitle: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyStateIcon: {
      marginBottom: 12,
    },
    emptyStateTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    suggestionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme.colors.warning + '30',
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.warning,
    },
    suggestionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    suggestionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      marginRight: 12,
    },
    suggestionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    suggestionActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    suggestionButton: {
      backgroundColor: theme.colors.warning,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
    },
    suggestionButtonText: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
    },
    confidenceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    confidenceText: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginLeft: 4,
    },
    statsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
  });

  if (rulesLoading || triggersLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Task Automation</Text>
        </View>
        <View
          style={[styles.emptyState, { flex: 1, justifyContent: 'center' }]}
        >
          <Ionicons
            name="hourglass-outline"
            size={48}
            color={theme.colors.textSecondary}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateTitle}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Task Automation</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRule}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Rule</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Statistics */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeRules.length}</Text>
            <Text style={styles.statLabel}>Active Rules</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {rules.reduce((sum, rule) => sum + rule.execution_count, 0)}
            </Text>
            <Text style={styles.statLabel}>Total Executions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{triggers.length}</Text>
            <Text style={styles.statLabel}>Available Triggers</Text>
          </View>
        </View>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="bulb-outline"
                size={20}
                color={theme.colors.warning}
              />
              <Text style={styles.sectionTitle}>Suggested Automations</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Based on your task patterns, we recommend these automation rules
              to improve your productivity.
            </Text>

            {suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionCard}>
                <View style={styles.suggestionHeader}>
                  <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                  <View style={styles.confidenceContainer}>
                    <Ionicons
                      name="analytics-outline"
                      size={14}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.confidenceText}>
                      {Math.round(suggestion.confidence * 100)}%
                    </Text>
                  </View>
                </View>
                <Text style={styles.suggestionDescription}>
                  {suggestion.description}
                </Text>
                <View style={styles.suggestionActions}>
                  <TouchableOpacity
                    style={styles.suggestionButton}
                    onPress={() => handleApplySuggestion(suggestion)}
                  >
                    <Text style={styles.suggestionButtonText}>Create Rule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active Rules */}
        {activeRules.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={20} color={theme.colors.success} />
              <Text style={styles.sectionTitle}>Active Rules</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              These automation rules are currently active and will execute when
              their conditions are met.
            </Text>

            {activeRules.map((rule) => (
              <AutomationRuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => handleEditRule(rule.id)}
              />
            ))}
          </View>
        )}

        {/* Inactive Rules */}
        {inactiveRules.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="pause-circle-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.sectionTitle}>Inactive Rules</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              These automation rules are currently disabled and will not
              execute.
            </Text>

            {inactiveRules.map((rule) => (
              <AutomationRuleCard
                key={rule.id}
                rule={rule}
                onEdit={() => handleEditRule(rule.id)}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {rules.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="construct-outline"
              size={64}
              color={theme.colors.textSecondary}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateTitle}>No Automation Rules</Text>
            <Text style={styles.emptyStateText}>
              Create your first automation rule to streamline your task
              management workflow. Automation rules can help you automatically
              create follow-up tasks, update priorities, and manage overdue
              items.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Automation Rule Modal */}
      <AutomationRuleModal
        visible={modalVisible}
        rule={editingRule}
        onClose={handleModalClose}
        onSave={handleModalSave}
      />
    </SafeAreaView>
  );
}
