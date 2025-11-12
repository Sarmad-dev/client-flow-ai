import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { AutomationRuleWithMetadata } from '@/hooks/useTaskAutomation';
import AutomationRuleForm from './AutomationRuleForm';

interface AutomationRuleModalProps {
  visible: boolean;
  rule?: AutomationRuleWithMetadata;
  onClose: () => void;
  onSave: () => void;
}

export default function AutomationRuleModal({
  visible,
  rule,
  onClose,
  onSave,
}: AutomationRuleModalProps) {
  const theme = useTheme();

  const handleSave = () => {
    onSave();
    onClose();
  };

  const styles = StyleSheet.create({
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      marginTop: 50,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
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
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 8,
    },
    content: {
      flex: 1,
    },
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.modal}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {rule ? 'Edit Automation Rule' : 'Create Automation Rule'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <AutomationRuleForm
              rule={rule}
              onSave={handleSave}
              onCancel={onClose}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
