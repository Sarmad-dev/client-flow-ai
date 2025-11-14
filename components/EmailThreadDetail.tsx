import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useThreadMessages, EmailRecord } from '@/hooks/useEmails';
import {
  Mail,
  ChevronDown,
  ChevronUp,
  Paperclip,
  ArrowLeft,
  Send,
  X,
} from 'lucide-react-native';
import { MessageContent } from './MessageContent';
import InlineReplyComposer from './InlineReplyComposer';

interface EmailThreadDetailProps {
  counterpartyEmail: string;
  displayName: string | null;
  onBack: () => void;
  onReply?: (email: EmailRecord) => void;
}

export default function EmailThreadDetail({
  counterpartyEmail,
  displayName,
  onBack,
  onReply,
}: EmailThreadDetailProps) {
  const { colors } = useTheme();
  const {
    data: messages = [],
    isLoading,
    error,
  } = useThreadMessages(counterpartyEmail);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(
    new Set()
  );
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<EmailRecord | null>(
    null
  );

  // Auto-expand the most recent message
  React.useEffect(() => {
    if (messages.length > 0 && expandedMessages.size === 0) {
      setExpandedMessages(new Set([messages[messages.length - 1].id]));
    }
  }, [messages]);

  const toggleExpanded = (messageId: string) => {
    setExpandedMessages((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const handleStartReply = (message: EmailRecord) => {
    setReplyToMessage(message);
    setShowReplyComposer(true);
  };

  const handleCancelReply = () => {
    setShowReplyComposer(false);
    setReplyToMessage(null);
  };

  const handleReplySent = () => {
    handleCancelReply();
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) {
      return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (diffDays < 7) {
      return date.toLocaleDateString(undefined, {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  };

  const renderMessage = (message: EmailRecord, index: number) => {
    const isSent = message.direction === 'sent';
    const isExpanded = expandedMessages.has(message.id);
    const hasAttachments = (message as any).attachment_count > 0;

    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          {
            backgroundColor: isSent ? colors.primary + '08' : colors.surface,
            borderLeftWidth: 3,
            borderLeftColor: isSent ? colors.primary : colors.border,
          },
        ]}
      >
        {/* Message Header */}
        <TouchableOpacity
          onPress={() => toggleExpanded(message.id)}
          style={styles.messageHeader}
          activeOpacity={0.7}
        >
          <View style={styles.messageHeaderLeft}>
            {/* Direction Indicator */}
            <View
              style={[
                styles.directionBadge,
                {
                  backgroundColor: isSent
                    ? colors.primary + '20'
                    : colors.surface,
                },
              ]}
            >
              <Mail
                size={16}
                color={isSent ? colors.primary : colors.textSecondary}
              />
            </View>

            {/* Sender/Recipient Info */}
            <View style={styles.messageInfo}>
              <Text
                style={[
                  styles.messageSender,
                  {
                    color: colors.text,
                    fontWeight: isSent ? '600' : '700',
                  },
                ]}
                numberOfLines={1}
              >
                {isSent
                  ? `You → ${displayName || counterpartyEmail}`
                  : displayName || counterpartyEmail}
              </Text>
              <Text
                style={[styles.messageTime, { color: colors.textSecondary }]}
              >
                {formatDateTime(message.created_at)}
              </Text>
            </View>
          </View>

          {/* Expand/Collapse Icon */}
          <View style={styles.messageHeaderRight}>
            {hasAttachments && (
              <View style={styles.attachmentIndicator}>
                <Paperclip size={14} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.attachmentCount,
                    { color: colors.textSecondary },
                  ]}
                >
                  {(message as any).attachment_count}
                </Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronUp size={20} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={20} color={colors.textSecondary} />
            )}
          </View>
        </TouchableOpacity>

        {/* Collapsed Preview */}
        {!isExpanded && (
          <View style={styles.messagePreview}>
            <Text
              style={[
                styles.messageSubject,
                {
                  color: colors.text,
                  fontWeight: '600',
                },
              ]}
              numberOfLines={1}
            >
              {message.subject || '(No subject)'}
            </Text>
            <Text
              style={[
                styles.messagePreviewText,
                { color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {message.body_text || '(No content)'}
            </Text>
          </View>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.messageContent}>
            {/* Subject */}
            {message.subject && (
              <View style={styles.subjectContainer}>
                <Text
                  style={[styles.subjectLabel, { color: colors.textSecondary }]}
                >
                  Subject:
                </Text>
                <Text style={[styles.subjectText, { color: colors.text }]}>
                  {message.subject}
                </Text>
              </View>
            )}

            {/* Email Addresses */}
            <View style={styles.emailAddresses}>
              <View style={styles.emailAddressRow}>
                <Text
                  style={[styles.emailLabel, { color: colors.textSecondary }]}
                >
                  From:
                </Text>
                <Text
                  style={[styles.emailAddress, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {message.sender_email || 'Unknown'}
                </Text>
              </View>
              <View style={styles.emailAddressRow}>
                <Text
                  style={[styles.emailLabel, { color: colors.textSecondary }]}
                >
                  To:
                </Text>
                <Text
                  style={[styles.emailAddress, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {message.recipient_email || 'Unknown'}
                </Text>
              </View>
            </View>

            {/* Message Body */}
            <View style={styles.bodyContainer}>
              {message.body_html ? (
                <MessageContent
                  html={message.body_html}
                  text={message.body_text}
                />
              ) : message.body_text ? (
                <Text style={[styles.bodyText, { color: colors.text }]}>
                  {message.body_text}
                </Text>
              ) : (
                <Text
                  style={[
                    styles.bodyPlaceholder,
                    { color: colors.textSecondary },
                  ]}
                >
                  (No content)
                </Text>
              )}
            </View>

            {/* Attachment Details */}
            {hasAttachments && (
              <View
                style={[
                  styles.attachmentDetails,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Paperclip size={16} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.attachmentDetailsText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {(message as any).attachment_count} attachment
                  {(message as any).attachment_count !== 1 ? 's' : ''}
                  {(message as any).total_attachment_size && (
                    <Text>
                      {' '}
                      (
                      {(
                        (message as any).total_attachment_size /
                        1024 /
                        1024
                      ).toFixed(2)}{' '}
                      MB)
                    </Text>
                  )}
                </Text>
              </View>
            )}

            {/* Status Indicators */}
            <View style={styles.statusContainer}>
              {message.status && (
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        message.status === 'delivered' ||
                        message.status === 'opened'
                          ? colors.primary + '15'
                          : colors.surface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          message.status === 'delivered' ||
                          message.status === 'opened'
                            ? colors.primary
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    {message.status}
                  </Text>
                </View>
              )}
              {message.opened_at && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.primary }]}>
                    Opened {formatDateTime(message.opened_at)}
                  </Text>
                </View>
              )}
              {message.clicked_at && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.primary }]}>
                    Clicked {formatDateTime(message.clicked_at)}
                  </Text>
                </View>
              )}
              {message.replied_at && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: colors.primary + '15' },
                  ]}
                >
                  <Text style={[styles.statusText, { color: colors.primary }]}>
                    Replied {formatDateTime(message.replied_at)}
                  </Text>
                </View>
              )}
            </View>

            {/* Reply Button */}
            <TouchableOpacity
              onPress={() => handleStartReply(message)}
              style={[
                styles.replyButton,
                {
                  backgroundColor: colors.primary,
                },
              ]}
            >
              <Mail size={16} color="#fff" />
              <Text style={styles.replyButtonText}>Reply</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading conversation...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[styles.centerContainer, { backgroundColor: colors.background }]}
      >
        <Mail size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          Failed to load messages
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'Please try again later'}
        </Text>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButtonHeader}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]}>
            {displayName || counterpartyEmail}
          </Text>
          {displayName && (
            <Text
              style={[styles.headerEmail, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {counterpartyEmail}
            </Text>
          )}
        </View>
        <View style={styles.headerStats}>
          <Text
            style={[styles.headerStatsText, { color: colors.textSecondary }]}
          >
            {messages.length} message{messages.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Messages List */}
      {messages.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Mail size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No messages in this conversation
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => renderMessage(message, index))}
        </ScrollView>
      )}

      {/* Inline Reply Composer */}
      {showReplyComposer && replyToMessage && (
        <InlineReplyComposer
          counterpartyEmail={counterpartyEmail}
          displayName={displayName}
          defaultSubject={
            (replyToMessage.subject || '(no subject)')
              .toLowerCase()
              .startsWith('re:')
              ? replyToMessage.subject || '(no subject)'
              : `Re: ${replyToMessage.subject || '(no subject)'}`
          }
          clientId={replyToMessage.client_id}
          leadId={replyToMessage.lead_id}
          inReplyToMessageId={replyToMessage.sendgrid_message_id}
          references={
            replyToMessage.sendgrid_message_id
              ? [
                  ...(replyToMessage.references || []),
                  ...(replyToMessage.references?.includes(
                    replyToMessage.sendgrid_message_id
                  )
                    ? []
                    : [replyToMessage.sendgrid_message_id]),
                ]
              : replyToMessage.references || null
          }
          onSent={handleReplySent}
          onCancel={handleCancelReply}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 8,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  backButtonHeader: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  headerStats: {
    alignItems: 'flex-end',
  },
  headerStatsText: {
    fontSize: 12,
  },
  messagesContainer: {
    padding: 16,
    gap: 12,
  },
  messageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 12,
  },
  messageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  directionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageInfo: {
    flex: 1,
  },
  messageSender: {
    fontSize: 15,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 2,
  },
  messageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attachmentCount: {
    fontSize: 12,
  },
  messagePreview: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingLeft: 60,
    gap: 4,
  },
  messageSubject: {
    fontSize: 14,
  },
  messagePreviewText: {
    fontSize: 13,
    lineHeight: 18,
  },
  messageContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingLeft: 60,
    gap: 12,
  },
  subjectContainer: {
    gap: 4,
  },
  subjectLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  subjectText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emailAddresses: {
    gap: 6,
  },
  emailAddressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emailLabel: {
    fontSize: 13,
    fontWeight: '600',
    width: 50,
  },
  emailAddress: {
    fontSize: 13,
    flex: 1,
  },
  bodyContainer: {
    marginTop: 4,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bodyPlaceholder: {
    fontSize: 15,
    fontStyle: 'italic',
  },
  attachmentDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachmentDetailsText: {
    fontSize: 13,
  },
  statusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  replyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 4,
  },
  replyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
});
