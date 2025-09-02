import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { EmailRecord, useRecentEmails } from '@/hooks/useEmails';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageContent } from './MessageContent';

interface EmailDetailProps {
  emailId: string | null;
  onClose: () => void;
}

export default function EmailDetail({ emailId, onClose }: EmailDetailProps) {
  const { colors } = useTheme();
  const { data } = useRecentEmails(200);
  const email = (data || []).find((e) => e.id === emailId) as
    | EmailRecord
    | undefined;

  if (!email) return null;
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          style={[styles.subject, { color: colors.text }]}
          numberOfLines={2}
        >
          {email.subject || '(No subject)'}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: colors.primary, fontWeight: '700' }}>
            Close
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>
          From: {email.sender_email} To: {email.recipient_email}
        </Text>
        {email.body_html ? (
          <MessageContent html={email.body_html} text={email.body_text} />
        ) : email.body_text ? (
          <Text style={{ color: colors.text }}>{email.body_text}</Text>
        ) : (
          <Text style={{ color: colors.textSecondary }}>(No body)</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', top: 20, left: 0, right: 0, bottom: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  subject: { fontSize: 18, fontWeight: '700', flex: 1, paddingRight: 12 },
});
