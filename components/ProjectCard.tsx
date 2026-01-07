import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import {
  Calendar,
  Clock,
  CheckCircle,
  MoreVertical,
  Folder,
  Target,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import type { ProjectRecord } from '@/types/task-management';

interface ProjectCardProps {
  project: ProjectRecord;
  onPress: () => void;
  onMorePress?: () => void;
  showClient?: boolean;
}

export function ProjectCard({
  project,
  onPress,
  onMorePress,
  showClient = true,
}: ProjectCardProps) {
  const { colors } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'active':
        return '#3B82F6';
      case 'on_hold':
        return '#F59E0B';
      case 'planning':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return colors.textSecondary;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#6B7280';
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const isOverdue =
    project.due_date &&
    new Date(project.due_date) < new Date() &&
    project.status !== 'completed';

  return (
    <Pressable
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: getStatusColor(project.status),
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Folder
            size={20}
            color={getStatusColor(project.status)}
            strokeWidth={2}
          />
          <View style={styles.titleContainer}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {project.name}
            </Text>
            {showClient && (project.client?.name || project.lead?.name) && (
              <Text
                style={[styles.clientName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {project.client?.name || project.lead?.name}
                {(project.client?.company || project.lead?.company) &&
                  ` • ${project.client?.company || project.lead?.company}`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: getPriorityColor(project.priority) + '20' },
            ]}
          >
            <Text
              style={[
                styles.priorityText,
                { color: getPriorityColor(project.priority) },
              ]}
            >
              {project.priority}
            </Text>
          </View>
          {onMorePress && (
            <TouchableOpacity
              style={styles.moreButton}
              onPress={onMorePress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MoreVertical
                size={16}
                color={colors.textSecondary}
                strokeWidth={2}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {project.description && (
        <Text
          style={[styles.description, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {project.description}
        </Text>
      )}

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressLabel, { color: colors.text }]}>
            Progress
          </Text>
          <Text style={[styles.progressValue, { color: colors.text }]}>
            {project.progress_percentage}%
          </Text>
        </View>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: getStatusColor(project.status),
                width: `${project.progress_percentage}%`,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.metadata}>
        <View style={styles.metadataRow}>
          <View style={styles.metadataItem}>
            <CheckCircle
              size={14}
              color={colors.textSecondary}
              strokeWidth={2}
            />
            <Text
              style={[styles.metadataText, { color: colors.textSecondary }]}
            >
              {project.completed_task_count || 0}/{project.task_count || 0}{' '}
              tasks
            </Text>
          </View>

          {project.due_date && (
            <View style={styles.metadataItem}>
              <Calendar
                size={14}
                color={isOverdue ? '#EF4444' : colors.textSecondary}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.metadataText,
                  {
                    color: isOverdue ? '#EF4444' : colors.textSecondary,
                  },
                ]}
              >
                {formatDate(project.due_date)}
              </Text>
            </View>
          )}
        </View>

        {(project.estimated_hours || project.actual_hours > 0) && (
          <View style={styles.metadataRow}>
            <View style={styles.metadataItem}>
              <Clock size={14} color={colors.textSecondary} strokeWidth={2} />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
              >
                {project.actual_hours}h
                {project.estimated_hours && ` / ${project.estimated_hours}h`}
              </Text>
            </View>

            {project.budget && (
              <View style={styles.metadataItem}>
                <Target
                  size={14}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text
                  style={[styles.metadataText, { color: colors.textSecondary }]}
                >
                  ${project.budget.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(project.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(project.status) },
            ]}
          >
            {project.status.replace('_', ' ')}
          </Text>
        </View>

        {project.tags && project.tags.length > 0 && (
          <View style={styles.tags}>
            {project.tags.slice(0, 2).map((tag, index) => (
              <View
                key={index}
                style={[styles.tag, { backgroundColor: colors.primary + '20' }]}
              >
                <Text
                  style={[styles.tagText, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {tag}
                </Text>
              </View>
            ))}
            {project.tags.length > 2 && (
              <Text
                style={[styles.moreTagsText, { color: colors.textSecondary }]}
              >
                +{project.tags.length - 2}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  clientName: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  moreButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  progressSection: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  metadata: {
    gap: 8,
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metadataText: {
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'flex-end',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 60,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 10,
    fontWeight: '500',
  },
});
