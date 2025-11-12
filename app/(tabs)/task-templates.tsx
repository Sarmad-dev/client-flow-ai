import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Copy,
  Edit3,
  Star,
  Users,
  Clock,
  Tag,
  FileText,
  Bookmark,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useTaskTemplates } from '@/hooks/useTaskTemplates';
import { TaskTemplate } from '@/components/TaskTemplate';
import type { TaskTemplate as TaskTemplateType } from '@/types/task-management';

interface TemplateFilters {
  search_query: string;
  category: string | null;
  is_public: boolean | null;
  created_by_me: boolean | null;
}

const TEMPLATE_CATEGORIES = [
  'All',
  'Sales',
  'Marketing',
  'Development',
  'Support',
  'Operations',
  'Personal',
  'Other',
];

export default function TaskTemplatesScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<TaskTemplateType | null>(null);
  const [templateMode, setTemplateMode] = useState<'create' | 'edit' | 'use'>(
    'create'
  );

  const [filters, setFilters] = useState<TemplateFilters>({
    search_query: '',
    category: null,
    is_public: null,
    created_by_me: null,
  });

  // Hooks
  const templatesQuery = useTaskTemplates();
  const templates = templatesQuery.data ?? [];

  // Get template category (mock implementation)
  const getTemplateCategory = useCallback(
    (template: TaskTemplateType): string => {
      const name = template.name.toLowerCase();
      if (
        name.includes('sales') ||
        name.includes('lead') ||
        name.includes('client')
      )
        return 'Sales';
      if (name.includes('marketing') || name.includes('campaign'))
        return 'Marketing';
      if (name.includes('dev') || name.includes('code') || name.includes('bug'))
        return 'Development';
      if (name.includes('support') || name.includes('help')) return 'Support';
      if (name.includes('ops') || name.includes('deploy')) return 'Operations';
      if (name.includes('personal') || name.includes('todo')) return 'Personal';
      return 'Other';
    },
    []
  );

  // Apply filters
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search query
      const query = searchQuery.toLowerCase();
      if (query) {
        const matchesName = template.name.toLowerCase().includes(query);
        const matchesDescription = template.description
          ?.toLowerCase()
          .includes(query);
        if (!matchesName && !matchesDescription) return false;
      }

      // Category filter
      if (filters.category && filters.category !== 'All') {
        // Assuming templates have a category field or we derive it from name/description
        const templateCategory = getTemplateCategory(template);
        if (templateCategory !== filters.category) return false;
      }

      // Public/Private filter
      if (filters.is_public !== null) {
        if (template.is_public !== filters.is_public) return false;
      }

      // Created by me filter
      if (filters.created_by_me !== null) {
        // This would need to check against current user ID
        // For now, we'll assume all templates are created by the current user
        if (filters.created_by_me && !template.user_id) return false;
      }

      return true;
    });
  }, [templates, searchQuery, filters, getTemplateCategory]);

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, TaskTemplateType[]> = {};

    filteredTemplates.forEach((template) => {
      const category = getTemplateCategory(template);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });

    return grouped;
  }, [filteredTemplates, getTemplateCategory]);

  // Handle template actions
  const handleUseTemplate = useCallback((template: TaskTemplateType) => {
    setSelectedTemplate(template);
    setTemplateMode('use');
    setShowTemplateModal(true);
  }, []);

  const handleEditTemplate = useCallback((template: TaskTemplateType) => {
    setSelectedTemplate(template);
    setTemplateMode('edit');
    setShowTemplateModal(true);
  }, []);

  const handleDeleteTemplate = useCallback((template: TaskTemplateType) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // templatesQuery.deleteTemplate(template.id);
            console.log('Delete template:', template.id);
          },
        },
      ]
    );
  }, []);

  const handleDuplicateTemplate = useCallback((template: TaskTemplateType) => {
    const duplicatedTemplate = {
      ...template,
      id: undefined, // Will be generated
      name: `${template.name} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // templatesQuery.createTemplate(duplicatedTemplate);
    console.log('Duplicate template:', duplicatedTemplate);
  }, []);

  const handleCreateTemplate = useCallback(() => {
    setSelectedTemplate(null);
    setTemplateMode('create');
    setShowTemplateModal(true);
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof TemplateFilters, value: any) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Render template card
  const renderTemplateCard = (template: TaskTemplateType) => (
    <View
      key={template.id}
      style={[styles.templateCard, { backgroundColor: colors.surface }]}
    >
      <View style={styles.templateHeader}>
        <View style={styles.templateInfo}>
          <Text
            style={[styles.templateName, { color: colors.text }]}
            numberOfLines={1}
          >
            {template.name}
          </Text>
          {template.description && (
            <Text
              style={[
                styles.templateDescription,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {template.description}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.templateMoreButton}
          onPress={() => {
            // Show action menu
            Alert.alert(template.name, 'Choose an action', [
              {
                text: 'Use Template',
                onPress: () => handleUseTemplate(template),
              },
              { text: 'Edit', onPress: () => handleEditTemplate(template) },
              {
                text: 'Duplicate',
                onPress: () => handleDuplicateTemplate(template),
              },
              {
                text: 'Delete',
                onPress: () => handleDeleteTemplate(template),
                style: 'destructive',
              },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
        >
          <MoreVertical
            size={20}
            color={colors.textSecondary}
            strokeWidth={2}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.templateMetadata}>
        <View style={styles.templateMetaItem}>
          <Tag size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text
            style={[styles.templateMetaText, { color: colors.textSecondary }]}
          >
            {getTemplateCategory(template)}
          </Text>
        </View>

        <View style={styles.templateMetaItem}>
          <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
          <Text
            style={[styles.templateMetaText, { color: colors.textSecondary }]}
          >
            {new Date(template.created_at).toLocaleDateString()}
          </Text>
        </View>

        {template.is_public && (
          <View style={styles.templateMetaItem}>
            <Users size={14} color={colors.secondary} strokeWidth={2} />
            <Text
              style={[styles.templateMetaText, { color: colors.secondary }]}
            >
              Public
            </Text>
          </View>
        )}

        <View style={styles.templateMetaItem}>
          <Star size={14} color={colors.warning} strokeWidth={2} />
          <Text
            style={[styles.templateMetaText, { color: colors.textSecondary }]}
          >
            {template.usage_count || 0}
          </Text>
        </View>
      </View>

      <View style={styles.templateActions}>
        <TouchableOpacity
          style={[
            styles.templateActionButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => handleUseTemplate(template)}
        >
          <Copy size={16} color="white" strokeWidth={2} />
          <Text style={styles.templateActionText}>Use</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.templateActionButton,
            { backgroundColor: colors.background },
          ]}
          onPress={() => handleEditTemplate(template)}
        >
          <Edit3 size={16} color={colors.text} strokeWidth={2} />
          <Text style={[styles.templateActionText, { color: colors.text }]}>
            Edit
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Task Templates
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.headerButton,
              { backgroundColor: colors.background },
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={20} color={colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.primary }]}
            onPress={handleCreateTemplate}
          >
            <Plus size={20} color="white" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Search size={20} color={colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search templates..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      {/* Filters */}
      {showFilters && (
        <View
          style={[styles.filtersContainer, { backgroundColor: colors.surface }]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {TEMPLATE_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    { borderColor: colors.border },
                    (filters.category === category ||
                      (category === 'All' && !filters.category)) && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() =>
                    handleFilterChange(
                      'category',
                      category === 'All' ? null : category
                    )
                  }
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: colors.text },
                      (filters.category === category ||
                        (category === 'All' && !filters.category)) && {
                        color: 'white',
                      },
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.filterToggles}>
            <TouchableOpacity
              style={[
                styles.filterToggle,
                { borderColor: colors.border },
                filters.is_public === true && {
                  backgroundColor: colors.secondary,
                },
              ]}
              onPress={() =>
                handleFilterChange(
                  'is_public',
                  filters.is_public === true ? null : true
                )
              }
            >
              <Users
                size={16}
                color={
                  filters.is_public === true ? 'white' : colors.textSecondary
                }
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.filterToggleText,
                  {
                    color:
                      filters.is_public === true
                        ? 'white'
                        : colors.textSecondary,
                  },
                ]}
              >
                Public
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterToggle,
                { borderColor: colors.border },
                filters.created_by_me === true && {
                  backgroundColor: colors.accent,
                },
              ]}
              onPress={() =>
                handleFilterChange(
                  'created_by_me',
                  filters.created_by_me === true ? null : true
                )
              }
            >
              <Bookmark
                size={16}
                color={
                  filters.created_by_me === true
                    ? 'white'
                    : colors.textSecondary
                }
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.filterToggleText,
                  {
                    color:
                      filters.created_by_me === true
                        ? 'white'
                        : colors.textSecondary,
                  },
                ]}
              >
                My Templates
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Templates List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {Object.keys(templatesByCategory).length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={colors.textSecondary} strokeWidth={1} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No Templates Found
            </Text>
            <Text
              style={[
                styles.emptyStateDescription,
                { color: colors.textSecondary },
              ]}
            >
              {searchQuery ||
              Object.values(filters).some((f) => f !== null && f !== '')
                ? 'Try adjusting your search or filters'
                : 'Create your first template to get started'}
            </Text>
            {!searchQuery &&
              Object.values(filters).every((f) => f === null || f === '') && (
                <TouchableOpacity
                  style={[
                    styles.emptyStateButton,
                    { backgroundColor: colors.primary },
                  ]}
                  onPress={handleCreateTemplate}
                >
                  <Plus size={20} color="white" strokeWidth={2} />
                  <Text style={styles.emptyStateButtonText}>
                    Create Template
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        ) : (
          Object.entries(templatesByCategory).map(
            ([category, categoryTemplates]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={[styles.categoryTitle, { color: colors.text }]}>
                  {category} ({categoryTemplates.length})
                </Text>
                <View style={styles.templatesGrid}>
                  {categoryTemplates.map(renderTemplateCard)}
                </View>
              </View>
            )
          )
        )}
      </ScrollView>

      {/* Template Modal */}
      <TaskTemplate
        visible={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        mode={
          templateMode === 'create' ||
          templateMode === 'edit' ||
          templateMode === 'use'
            ? templateMode
            : 'browse'
        }
        template={selectedTemplate || undefined}
        onTemplateUsed={(taskId: string) => {
          // Handle template usage
          console.log('Template used, created task:', taskId);
          setShowTemplateModal(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterToggles: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  filterToggleText: {
    fontSize: 12,
    fontWeight: '500',
  },

  content: {
    flex: 1,
  },
  categorySection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  templatesGrid: {
    gap: 12,
  },

  templateCard: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  templateInfo: {
    flex: 1,
    marginRight: 12,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  templateMoreButton: {
    padding: 4,
  },

  templateMetadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  templateMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },

  templateActions: {
    flexDirection: 'row',
    gap: 8,
  },
  templateActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  templateActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    gap: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
