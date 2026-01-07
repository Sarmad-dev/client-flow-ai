import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Plus,
  Filter,
  Search,
  Edit3,
  Trash2,
  FolderPlus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { ProjectCard } from '@/components/ProjectCard';
import { ProjectCreateModal } from '@/components/projects/ProjectCreateModal';
import { useSubscriptionGuard } from '@/hooks/useSubscriptionGuard';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import type { ProjectRecord } from '@/types/task-management';

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(
    null
  );
  const [showActionModal, setShowActionModal] = useState(false);

  const projectsQuery = useProjects();
  const deleteProject = useDeleteProject();

  const {
    guardProjectCreation,
    showSubscriptionModal,
    setShowSubscriptionModal,
    modalFeatureName,
  } = useSubscriptionGuard();

  const projects = projectsQuery.data ?? [];

  const activeProjects = projects.filter(
    (p) => p.status === 'active' || p.status === 'planning'
  );
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const otherProjects = projects.filter(
    (p) =>
      p.status !== 'active' &&
      p.status !== 'planning' &&
      p.status !== 'completed'
  );

  const handleCreateProject = () => {
    if (guardProjectCreation()) {
      setShowCreateModal(true);
    }
  };

  const handleProjectPress = (project: ProjectRecord) => {
    router.push(`/project-detail?projectId=${project.id}` as any);
  };

  const handleProjectMorePress = (project: ProjectRecord) => {
    setSelectedProject(project);
    setShowActionModal(true);
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;

    Alert.alert(
      'Delete Project',
      `Are you sure you want to delete "${selectedProject.name}"? This will remove the project association from all tasks but won't delete the tasks themselves.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProject.mutate(selectedProject.id);
            setShowActionModal(false);
            setSelectedProject(null);
          },
        },
      ]
    );
  };

  const handleEditProject = () => {
    if (!selectedProject) return;
    // TODO: Implement edit project modal
    setShowActionModal(false);
    setSelectedProject(null);
  };

  return (
    <>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.text }]}>Projects</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {projects.length} total
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                { backgroundColor: colors.background },
              ]}
              onPress={() => {
                // TODO: Implement search/filter
              }}
            >
              <Search size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerButton,
                { backgroundColor: colors.background },
              ]}
              onPress={() => {
                // TODO: Implement filter
              }}
            >
              <Filter size={20} color={colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={handleCreateProject}
            >
              <Plus size={20} color="white" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {projects.length === 0 ? (
            <View style={styles.emptyState}>
              <FolderPlus
                size={64}
                color={colors.textSecondary}
                strokeWidth={1}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Projects Yet
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  { color: colors.textSecondary },
                ]}
              >
                Create your first project to organize tasks and track progress
              </Text>
              <TouchableOpacity
                style={[
                  styles.emptyButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleCreateProject}
              >
                <Plus size={16} color="white" strokeWidth={2} />
                <Text style={styles.emptyButtonText}>Create Project</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Active Projects */}
              {activeProjects.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Active Projects ({activeProjects.length})
                  </Text>
                  {activeProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onPress={() => handleProjectPress(project)}
                      onMorePress={() => handleProjectMorePress(project)}
                    />
                  ))}
                </View>
              )}

              {/* Completed Projects */}
              {completedProjects.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Completed Projects ({completedProjects.length})
                  </Text>
                  {completedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onPress={() => handleProjectPress(project)}
                      onMorePress={() => handleProjectMorePress(project)}
                    />
                  ))}
                </View>
              )}

              {/* Other Projects */}
              {otherProjects.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Other Projects ({otherProjects.length})
                  </Text>
                  {otherProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onPress={() => handleProjectPress(project)}
                      onMorePress={() => handleProjectMorePress(project)}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Create Project Modal */}
      <ProjectCreateModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        featureName={modalFeatureName}
      />

      {/* Project Actions Modal */}
      <Modal
        visible={showActionModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowActionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.actionModal,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.actionModalHeader}>
              <Text style={[styles.actionModalTitle, { color: colors.text }]}>
                {selectedProject?.name}
              </Text>
              <TouchableOpacity
                onPress={() => setShowActionModal(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={[styles.actionModalClose, { color: colors.primary }]}
                >
                  Close
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionList}>
              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleEditProject}
              >
                <Edit3 size={20} color={colors.text} strokeWidth={2} />
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Edit Project
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionItem}
                onPress={handleDeleteProject}
              >
                <Trash2 size={20} color={colors.error} strokeWidth={2} />
                <Text style={[styles.actionText, { color: colors.error }]}>
                  Delete Project
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  actionModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  actionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 16,
  },
  actionModalClose: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionList: {
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
