/**
 * Server-Decrypted Email Detail Component
 *
 * Displays a single email with server-side decryption
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useServerDecryptedEmail } from '@/hooks/useServerDecryptedEmails';
import {
  ArrowLeft,
  Mail,
  Calendar,
  User,
  AlertCircle,
  ShieldCheck,
  Shield,
  Paperclip,
} from 'lucide-react-native';

interface ServerDecryptedEmailDetailProps {
  emailId: string;
  onBack?: () => void;
  onReply?: (email: any) => void;
}

export default function ServerDecryptedEmailDetail({
  emailId,
  onBack,
  onReply,
}: ServerDecryptedEmailDetailProps) {
  const { colors } = useTheme();
  const {
    data: email,
    isLoading,
    error,
    refetch,
  } = useServerDecryptedEmail(emailId);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    if (!email) return colors.textSecondary;

    switch (email.status) {
      case 'sent':
        return colors.primary;
      case 'delivered':
        return colors.success;
      case 'opened':
      case 'clicked':
        return colors.success;
      case 'failed':
        return colors.error;
      case 'spam':
        return colors.warning;
      default:
        return colors.textSecondary;
    }
  };

  const handleRetryDecryption = () => {
    Alert.alert(
      'Retry Decryption',
      'Would you like to retry decrypting this email?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Retry', onPress: () => refetch() },
      ]
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Decrypting email...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <AlertCircle size={48} color={colors.error} />
        <Text style={[styles.errorText, { color: colors.error }]}>
          Failed to load email
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {error.message}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <Text style={[styles.retryButtonText, { color: colors.background }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!email) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Mail size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Email not found
        </Text>
      </View>
    );
  }

  const hasDecryptionError = email._decryption_error;
  const isDecrypted = email._decrypted;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Email Details
        </Text>
        <View style={styles.headerActions}>
          {/* Encryption status */}
          {hasDecryptionError ? (
            <TouchableOpacity onPress={handleRetryDecryption}>
              <AlertCircle size={24} color={colors.error} />
            </TouchableOpacity>
          ) : isDecrypted ? (
            <ShieldCheck size={24} color={colors.success} />
          ) : (
            <Shield size={24} color={colors.textSecondary} />
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Email Header Info */}
        <View style={[styles.emailHeader, { backgroundColor: colors.surface }]}>
          {/* Subject */}
          <Text
            style={[
              styles.subject,
              {
                color: hasDecryptionError ? colors.error : colors.text,
              },
            ]}
          >
            {email.subject || '(No Subject)'}
          </Text>

          {/* From/To */}
          <View style={styles.participants}>
            <View style={styles.participantRow}>
              <User size={16} color={colors.textSecondary} />
              <Text
                style={[
                  styles.participantLabel,
                  { color: colors.textSecondary },
                ]}
              >
                {email.direction === 'sent' ? 'To:' : 'From:'}
              </Text>
              <Text style={[styles.participantEmail, { color: colors.text }]}>
                {email.direction === 'sent'
                  ? email.recipient_email
                  : email.sender_email}
              </Text>
            </View>
          </View>

          {/* Date and Status */}
          <View style={styles.metadata}>
            <View style={styles.metadataRow}>
              <Calendar size={16} color={colors.textSecondary} />
              <Text
                style={[styles.metadataText, { color: colors.textSecondary }]}
              >
                {formatDate(email.created_at)}
              </Text>
            </View>
            <View style={styles.statusContainer}>
              <Text style={[styles.status, { color: getStatusColor() }]}>
                {email.status &&
                  email.status?.charAt(0).toUpperCase() +
                    email.status?.slice(1)}
              </Text>
            </View>
          </View>

          {/* Attachments */}
          {email.attachment_count && email.attachment_count > 0 && (
            <View style={styles.attachments}>
              <Paperclip size={16} color={colors.textSecondary} />
              <Text
                style={[styles.attachmentText, { color: colors.textSecondary }]}
              >
                {email.attachment_count} attachment
                {email.attachment_count > 1 ? 's' : ''}
                {email.total_attachment_size &&
                  email.total_attachment_size > 0 &&
                  ` (${(email.total_attachment_size / 1024).toFixed(1)} KB)`}
              </Text>
            </View>
          )}

          {/* Decryption Status */}
          <View style={styles.decryptionStatus}>
            {hasDecryptionError ? (
              <View
                style={[
                  styles.decryptionBadge,
                  { backgroundColor: colors.error + '20' },
                ]}
              >
                <AlertCircle size={14} color={colors.error} />
                <Text style={[styles.decryptionText, { color: colors.error }]}>
                  Decryption Error
                </Text>
                <TouchableOpacity onPress={handleRetryDecryption}>
                  <Text style={[styles.retryLink, { color: colors.error }]}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : isDecrypted ? (
              <View
                style={[
                  styles.decryptionBadge,
                  { backgroundColor: colors.success + '20' },
                ]}
              >
                <ShieldCheck size={14} color={colors.success} />
                <Text
                  style={[styles.decryptionText, { color: colors.success }]}
                >
                  Server Decrypted
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.decryptionBadge,
                  { backgroundColor: colors.textSecondary + '20' },
                ]}
              >
                <Shield size={14} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.decryptionText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Not Encrypted
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Email Body */}
        <View style={[styles.emailBody, { backgroundColor: colors.surface }]}>
          {hasDecryptionError ? (
            <View style={styles.errorContent}>
              <AlertCircle size={32} color={colors.error} />
              <Text style={[styles.errorContentText, { color: colors.error }]}>
                This email could not be decrypted
              </Text>
              <Text
                style={[
                  styles.errorContentSubtext,
                  { color: colors.textSecondary },
                ]}
              >
                The email content is encrypted and cannot be displayed. Please
                try refreshing or contact support.
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, { backgroundColor: colors.error }]}
                onPress={handleRetryDecryption}
              >
                <Text
                  style={[styles.retryButtonText, { color: colors.background }]}
                >
                  Retry Decryption
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {email.body_html ? (
                <View style={styles.htmlContent}>
                  <Text style={[styles.bodyText, { color: colors.text }]}>
                    {/* For now, display HTML as text. In a real app, you'd use a WebView or HTML renderer */}
                    {email.body_html.replace(/<[^>]*>/g, '')}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.bodyText, { color: colors.text }]}>
                  {email.body_text || '(No content)'}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Actions */}
        {!hasDecryptionError && onReply && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.replyButton, { backgroundColor: colors.primary }]}
              onPress={() => onReply(email)}
            >
              <Mail size={16} color={colors.background} />
              <Text
                style={[styles.replyButtonText, { color: colors.background }]}
              >
                Reply
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  content: {
    flex: 1,
  },
  emailHeader: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  subject: {
    fontSize: 20,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  participants: {
    marginBottom: 12,
  },
  participantRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 4,
  },
  participantLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  participantEmail: {
    fontSize: 14,
    flex: 1,
  },
  metadata: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  metadataText: {
    fontSize: 14,
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  status: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  attachments: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    marginBottom: 12,
  },
  attachmentText: {
    fontSize: 14,
  },
  decryptionStatus: {
    marginTop: 8,
  },
  decryptionBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start' as const,
  },
  decryptionText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  retryLink: {
    fontSize: 12,
    fontWeight: '600' as const,
    textDecorationLine: 'underline' as const,
  },
  emailBody: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    minHeight: 200,
  },
  bodyText: {
    fontSize: 16,
    lineHeight: 24,
  },
  htmlContent: {
    // Add styles for HTML content if needed
  },
  errorContent: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 20,
  },
  errorContentText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  errorContentSubtext: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  actions: {
    padding: 16,
  },
  replyButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    padding: 16,
    borderRadius: 8,
  },
  replyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500' as const,
    textAlign: 'center' as const,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center' as const,
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center' as const,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
};
