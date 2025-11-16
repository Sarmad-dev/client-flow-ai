import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { Mail, Trash2, Plus, AlertCircle } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import {
  useSuppressionList,
  useAddToSuppressionList,
  useRemoveFromSuppressionList,
  SuppressionListEntry,
} from '@/hooks/useSuppressionList';

export default function SuppressionListView() {
  const { colors } = useTheme();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState('');

  const { data: suppressionList, isLoading } = useSuppressionList();
  const addMutation = useAddToSuppressionList();
  const removeMutation = useRemoveFromSuppressionList();

  const handleAdd = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    try {
      await addMutation.mutateAsync({
        email: newEmail.trim(),
        reason: newReason.trim() || 'manual',
      });
      setNewEmail('');
      setNewReason('');
      setShowAddForm(false);
      Alert.alert('Success', 'Email added to suppression list');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add email');
    }
  };

  const handleRemove = (entry: SuppressionListEntry) => {
    Alert.alert(
      'Remove from Suppression List',
      `Are you sure you want to remove ${entry.email} from the suppression list? You will be able to send emails to this address again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMutation.mutateAsync(entry.id);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove email');
            }
          },
        },
      ]
    );
  };

  const renderEntry = ({ item }: { item: SuppressionListEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: colors.surface }]}>
      <View style={styles.entryContent}>
        <View style={styles.entryHeader}>
          <Mail size={16} color={colors.textSecondary} />
          <Text style={[styles.entryEmail, { color: colors.text }]}>
            {item.email}
          </Text>
        </View>
        <View style={styles.entryDetails}>
          <View
            style={[
              styles.reasonBadge,
              { backgroundColor: `${colors.warning}15` },
            ]}
          >
            <Text style={[styles.reasonText, { color: colors.warning }]}>
              {item.reason || 'manual'}
            </Text>
          </View>
          <Text style={[styles.entryDate, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => handleRemove(item)}
        style={styles.removeButton}
        disabled={removeMutation.isPending}
      >
        <Trash2 size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading suppression list...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Suppression List
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {suppressionList?.length || 0} suppressed email
            {suppressionList?.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddForm(!showAddForm)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View
        style={[styles.infoBanner, { backgroundColor: `${colors.primary}15` }]}
      >
        <AlertCircle size={16} color={colors.primary} />
        <Text style={[styles.infoText, { color: colors.primary }]}>
          Emails in this list will not receive any messages from you
        </Text>
      </View>

      {/* Add Form */}
      {showAddForm && (
        <View style={[styles.addForm, { backgroundColor: colors.surface }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            Add Email to Suppression List
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Email address"
            placeholderTextColor={colors.textSecondary}
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Reason (optional)"
            placeholderTextColor={colors.textSecondary}
            value={newReason}
            onChangeText={setNewReason}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              onPress={() => {
                setShowAddForm(false);
                setNewEmail('');
                setNewReason('');
              }}
              style={[
                styles.formButton,
                { backgroundColor: colors.background },
              ]}
            >
              <Text style={[styles.formButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={[
                styles.formButton,
                styles.formButtonPrimary,
                { backgroundColor: colors.primary },
              ]}
              disabled={addMutation.isPending}
            >
              <Text style={[styles.formButtonText, { color: '#fff' }]}>
                {addMutation.isPending ? 'Adding...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* List */}
      {!suppressionList || suppressionList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Mail size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No suppressed emails
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Emails added here will not receive messages
          </Text>
        </View>
      ) : (
        <FlatList
          data={suppressionList}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
  },
  addForm: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  formButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formButtonPrimary: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  entryEmail: {
    fontSize: 14,
    fontWeight: '600',
  },
  entryDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  entryDate: {
    fontSize: 12,
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
