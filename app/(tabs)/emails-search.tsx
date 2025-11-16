import React, { useState } from 'react';
import { View, StyleSheet, Modal, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import EmailSearchAndFilter from '@/components/EmailSearchAndFilter';
import EmailDetail from '@/components/EmailDetail';
import { EmailRecord } from '@/hooks/useEmails';

export default function EmailsSearchScreen() {
  const { colors } = useTheme();
  const [selectedEmail, setSelectedEmail] = useState<EmailRecord | null>(null);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <EmailSearchAndFilter onSelectEmail={setSelectedEmail} />

      {/* Email Detail Modal */}
      {selectedEmail && (
        <Modal
          visible={!!selectedEmail}
          animationType="slide"
          onRequestClose={() => setSelectedEmail(null)}
        >
          <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Email Details
              </Text>
              <TouchableOpacity onPress={() => setSelectedEmail(null)}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
            <EmailDetail
              emailId={selectedEmail.id}
              onClose={() => setSelectedEmail(null)}
            />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
});
