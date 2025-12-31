/**
 * Server-Decrypted Email List Component
 *
 * Displays emails with server-side decryption for better compatibility
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useServerDecryptedEmails } from '@/hooks/useServerDecryptedEmails';
import {
  Mail,
  MailOpen,
  AlertCircle,
  RefreshCw,
  Shield,
  ShieldCheck,
} from 'lucide-react-native';

interface ServerDecryptedEmailListProps {
  clientId?: string;
  leadId?: string;
  direction?: 'sent' | 'received';
  onEmailPress?: (email: any) => void;
  limit?: number;
}

interface EmailItemProps {
  email: any;
  onPress: () => void;
  colors: any;
}

function EmailItem({ email, onPress, colors }: EmailItemProps) {
  const isRead = email.status === 'opened' || email.status === 'clicked';
  const isSent = email.direction === 'sent';
  const isDecrypted = email._decrypted;
  const hasDecryptionError = email._decryption_error;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getStatusColor = () => {
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

  return (
    <TouchableOpacity
      style={[
        styles.emailItem,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: hasDecryptionError
            ? colors.error
            : isDecrypted
            ? colors.success
            : colors.border,
          borderLeftWidth: 3,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.emailHeader}>
        <View style={styles.emailMeta}>
          {isSent ? (
            <Mail size={16} color={getStatusColor()} />
          ) : (
            <MailOpen
              size={16}
              color={isRead ? colors.success : colors.primary}
            />
          )}

          <Text style={[styles.emailAddress, { color: colors.text }]}>
            {isSent ? email.recipient_email : email.sender_email}
          </Text>

          {/* Encryption status indicator */}
          {hasDecryptionError ? (
            <AlertCircle size={14} color={colors.error} />
          ) : isDecrypted ? (
            <ShieldCheck size={14} color={colors.success} />
          ) : (
            <Shield size={14} color={colors.textSecondary} />
          )}
        </View>

        <Text style={[styles.emailDate, { color: colors.textSecondary }]}>
          {formatDate(email.created_at)}
        </Text>
      </View>

      <Text
        style={[
          styles.emailSubject,
          {
            color: hasDecryptionError ? colors.error : colors.text,
            fontWeight: isRead ? '400' : '600',
          },
        ]}
        numberOfLines={1}
      >
        {email.subject || '(No Subject)'}
      </Text>

      <Text
        style={[
          styles.emailPreview,
          {
            color: hasDecryptionError ? colors.error : colors.textSecondary,
          },
        ]}
        numberOfLines={2}
      >
        {email.body_text?.substring(0, 100) || '(No Content)'}
      </Text>

      <View style={styles.emailFooter}>
        <Text style={[styles.emailStatus, { color: getStatusColor() }]}>
          {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
        </Text>

        <View style={styles.emailIndicators}>
          {email.attachment_count > 0 && (
            <Text
              style={[styles.attachmentCount, { color: colors.textSecondary }]}
            >
              📎 {email.attachment_count}
            </Text>
          )}

          {/* Decryption status */}
          {hasDecryptionError && (
            <Text style={[styles.decryptionStatus, { color: colors.error }]}>
              Decryption Error
            </Text>
          )}
          {isDecrypted && !hasDecryptionError && (
            <Text style={[styles.decryptionStatus, { color: colors.success }]}>
              Decrypted
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ServerDecryptedEmailList({
  clientId,
  leadId,
  direction,
  onEmailPress,
  limit = 50,
}: ServerDecryptedEmailListProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const {
    data: emails,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useServerDecryptedEmails({
    client_id: clientId,
    lead_id: leadId,
    direction,
    limit,
  });

  const handleEmailPress = (email: any) => {
    if (email._decryption_error) {
      Alert.alert(
        'Decryption Error',
        'This email could not be decrypted. Please try refreshing or contact support if the issue persists.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => refetch() },
        ]
      );
      return;
    }
    onEmailPress?.(email);
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
          Decrypting emails...
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
          Failed to load emails
        </Text>
        <Text style={[styles.errorSubtext, { color: colors.textSecondary }]}>
          {error.message}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => refetch()}
        >
          <RefreshCw size={16} color={colors.background} />
          <Text style={[styles.retryButtonText, { color: colors.background }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!emails || emails.length === 0) {
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
          No emails found
        </Text>
      </View>
    );
  }

  const decryptedCount = emails.filter((e) => e._decrypted).length;
  const errorCount = emails.filter((e) => e._decryption_error).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Server Decryption Status Header */}
      <View
        style={[
          styles.decryptionHeader,
          { backgroundColor: colors.success + '20' },
        ]}
      >
        <ShieldCheck size={16} color={colors.success} />
        <Text style={[styles.decryptionHeaderText, { color: colors.success }]}>
          🔒 Server-side decryption ({decryptedCount} decrypted
          {errorCount > 0 && `, ${errorCount} errors`})
        </Text>
      </View>

      <FlatList
        data={emails}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EmailItem
            email={item}
            onPress={() => handleEmailPress(item)}
            colors={colors}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  decryptionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  decryptionHeaderText: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
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
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  retryButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  listContent: {
    padding: 16,
  },
  emailItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  emailHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  emailMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flex: 1,
  },
  emailAddress: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  emailDate: {
    fontSize: 12,
  },
  emailSubject: {
    fontSize: 16,
    marginBottom: 4,
  },
  emailPreview: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  emailFooter: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
  },
  emailStatus: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  emailIndicators: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
  },
  attachmentCount: {
    fontSize: 12,
  },
  decryptionStatus: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
};
