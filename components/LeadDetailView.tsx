import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Send,
  ExternalLink,
  Star,
  ArrowRight,
  MessageCircle,
  Calendar,
  FileText,
  Target,
  TrendingUp,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface LeadDetailViewProps {
  visible: boolean;
  onClose: () => void;
  leadId: string;
  onConvertToClient: () => void;
  onLeadUpdated: () => void;
}

export function LeadDetailView({
  visible,
  onClose,
  leadId,
  onConvertToClient,
  onLeadUpdated,
}: LeadDetailViewProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [lead, setLead] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible && leadId) {
      loadLeadDetails();
      loadInteractions();
    }
  }, [visible, leadId]);

  const loadLeadDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error) throw error;
      setLead(data);
    } catch (error) {
      console.error('Error loading lead details:', error);
      Alert.alert('Error', 'Failed to load lead details');
    } finally {
      setLoading(false);
    }
  };

  const loadInteractions = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
    }
  };

  const handleCall = () => {
    if (lead?.phone) {
      Linking.openURL(`tel:${lead.phone}`);
      logInteraction('call', 'Phone call initiated');
    }
  };

  const handleWhatsAppCall = () => {
    if (lead?.phone) {
      const phoneNumber = lead.phone.replace(/[^\d]/g, '');
      Linking.openURL(`https://wa.me/${phoneNumber}`);
      logInteraction('whatsapp', 'WhatsApp call initiated');
    }
  };

  const handleWhatsAppMessage = () => {
    if (lead?.phone) {
      const phoneNumber = lead.phone.replace(/[^\d]/g, '');
      Linking.openURL(
        `https://wa.me/${phoneNumber}?text=Hi! I'd like to discuss potential collaboration opportunities.`
      );
      logInteraction('whatsapp', 'WhatsApp message sent');
    }
  };

  const handleEmail = () => {
    if (lead?.email) {
      Linking.openURL(
        `mailto:${lead.email}?subject=Business Opportunity&body=Hi ${lead.name},\n\nI hope this email finds you well. I'd like to discuss potential collaboration opportunities.\n\nBest regards`
      );
      logInteraction('email', 'Email initiated');
    }
  };

  const handleWebsite = () => {
    if (lead?.website) {
      let url = lead.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
    }
  };

  const handleWhatsAppMessageQuick = () => {
    if (lead?.phone) {
      const phoneNumber = lead.phone.replace(/[^\d+]/g, '');
      const text = encodeURIComponent(
        "Hi! I'd like to discuss potential collaboration opportunities."
      );
      Linking.openURL(`https://wa.me/${phoneNumber}?text=${text}`);
      logInteraction('whatsapp', 'WhatsApp message sent (quick action)');
    }
  };

  const handleOpenWebsite = () => {
    if (lead?.website) {
      let url = lead.website;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      Linking.openURL(url);
      logInteraction('website', 'Opened website from quick action');
    }
  };

  const handleMaps = () => {
    if (lead?.address) {
      const query = encodeURIComponent(lead.address);
      Linking.openURL(`https://maps.google.com/?q=${query}`);
    }
  };

  const logInteraction = async (type: string, content: string) => {
    try {
      await supabase.from('lead_interactions').insert({
        user_id: user?.id,
        lead_id: leadId,
        interaction_type: type,
        content,
      });

      // Update last contact date
      await supabase
        .from('leads')
        .update({ last_contact_date: new Date().toISOString() })
        .eq('id', leadId);

      loadInteractions();
      onLeadUpdated();
    } catch (error) {
      console.error('Error logging interaction:', error);
    }
  };

  const updateLeadStatus = async (status: string) => {
    try {
      await supabase.from('leads').update({ status }).eq('id', leadId);

      setLead({ ...lead, status });
      onLeadUpdated();
      Alert.alert('Success', `Lead status updated to ${status}`);
    } catch (error) {
      console.error('Error updating lead status:', error);
      Alert.alert('Error', 'Failed to update lead status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return colors.primary;
      case 'contacted':
        return colors.warning;
      case 'qualified':
        return colors.secondary;
      case 'converted':
        return colors.success;
      case 'rejected':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading lead details...
          </Text>
        </View>
      </Modal>
    );
  }

  if (!lead) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <X size={24} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            Lead Details
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Lead Header */}
          <View
            style={[styles.leadHeader, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Building size={32} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.leadInfo}>
              <Text style={[styles.leadName, { color: colors.text }]}>
                {lead.name}
              </Text>
              <Text
                style={[styles.leadCompany, { color: colors.textSecondary }]}
              >
                {lead.company}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(lead.status)}15` },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(lead.status) },
                  ]}
                >
                  {lead.status.toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Contact Actions */}
          <View
            style={[styles.actionsGrid, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={handleCall}
            >
              <Phone size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsAppCall}
            >
              <Phone size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.secondary },
              ]}
              onPress={handleEmail}
            >
              <Mail size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.accent }]}
              onPress={handleMaps}
            >
              <MapPin size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>
          </View>

          {/* Extra Quick Actions */}
          <View
            style={[styles.actionsGrid, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#25D366' }]}
              onPress={handleWhatsAppMessageQuick}
            >
              <Send size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>WhatsApp Msg</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.secondary },
              ]}
              onPress={handleOpenWebsite}
            >
              <ExternalLink size={20} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.actionText}>Open Site</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Information */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Contact Information
            </Text>

            {lead.email && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={handleEmail}
              >
                <Mail size={20} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {lead.email}
                </Text>
              </TouchableOpacity>
            )}

            {lead.phone && (
              <TouchableOpacity style={styles.contactItem} onPress={handleCall}>
                <Phone size={20} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {lead.phone}
                </Text>
              </TouchableOpacity>
            )}

            {lead.website && (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={handleWebsite}
              >
                <Globe size={20} color={colors.textSecondary} strokeWidth={2} />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {lead.website}
                </Text>
              </TouchableOpacity>
            )}

            {lead.address && (
              <TouchableOpacity style={styles.contactItem} onPress={handleMaps}>
                <MapPin
                  size={20}
                  color={colors.textSecondary}
                  strokeWidth={2}
                />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  {lead.address}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Business Details */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Business Details
            </Text>

            {lead.business_type && (
              <View style={styles.detailItem}>
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  Type
                </Text>
                <Text style={[styles.detailValue, { color: colors.text }]}>
                  {lead.business_type}
                </Text>
              </View>
            )}

            {lead.rating > 0 && (
              <View style={styles.detailItem}>
                <Text
                  style={[styles.detailLabel, { color: colors.textSecondary }]}
                >
                  Rating
                </Text>
                <View style={styles.ratingContainer}>
                  <Star
                    size={16}
                    color={colors.warning}
                    strokeWidth={2}
                    fill={colors.warning}
                  />
                  <Text style={[styles.detailValue, { color: colors.text }]}>
                    {lead.rating.toFixed(1)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.detailItem}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Source
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {lead.source.replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Text
                style={[styles.detailLabel, { color: colors.textSecondary }]}
              >
                Added
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>
                {new Date(lead.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Status Actions */}
          {lead.status !== 'converted' && lead.status !== 'rejected' && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Lead Actions
              </Text>

              <View style={styles.statusActions}>
                {lead.status === 'new' && (
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: colors.warning },
                    ]}
                    onPress={() => updateLeadStatus('contacted')}
                  >
                    <MessageCircle size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.statusButtonText}>
                      Mark as Contacted
                    </Text>
                  </TouchableOpacity>
                )}

                {lead.status === 'contacted' && (
                  <TouchableOpacity
                    style={[
                      styles.statusButton,
                      { backgroundColor: colors.secondary },
                    ]}
                    onPress={() => updateLeadStatus('qualified')}
                  >
                    <TrendingUp size={16} color="#FFFFFF" strokeWidth={2} />
                    <Text style={styles.statusButtonText}>
                      Mark as Qualified
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.convertButton,
                    { backgroundColor: colors.success },
                  ]}
                  onPress={onConvertToClient}
                >
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2} />
                  <Text style={styles.convertButtonText}>
                    Convert to Client
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Notes */}
          {lead.notes && (
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Notes
              </Text>
              <Text style={[styles.notesText, { color: colors.text }]}>
                {lead.notes}
              </Text>
            </View>
          )}

          {/* Interaction History */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Interaction History ({interactions.length})
            </Text>

            {interactions.length > 0 ? (
              interactions.map((interaction) => (
                <View
                  key={interaction.id}
                  style={[
                    styles.interactionItem,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View style={styles.interactionHeader}>
                    <Text
                      style={[
                        styles.interactionType,
                        { color: colors.primary },
                      ]}
                    >
                      {interaction.interaction_type.toUpperCase()}
                    </Text>
                    <Text
                      style={[
                        styles.interactionDate,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {new Date(interaction.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text
                    style={[styles.interactionContent, { color: colors.text }]}
                  >
                    {interaction.content}
                  </Text>
                </View>
              ))
            ) : (
              <Text
                style={[styles.noInteractions, { color: colors.textSecondary }]}
              >
                No interactions yet. Start by calling or emailing this lead.
              </Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leadInfo: {
    marginLeft: 16,
    flex: 1,
  },
  leadName: {
    fontSize: 24,
    fontWeight: '700',
  },
  leadCompany: {
    fontSize: 16,
    fontWeight: '400',
    marginTop: 4,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  contactText: {
    fontSize: 16,
    fontWeight: '400',
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusActions: {
    gap: 12,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  convertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  convertButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  interactionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  interactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  interactionType: {
    fontSize: 12,
    fontWeight: '700',
  },
  interactionDate: {
    fontSize: 12,
    fontWeight: '400',
  },
  interactionContent: {
    fontSize: 14,
    fontWeight: '400',
  },
  noInteractions: {
    fontSize: 14,
    fontWeight: '400',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
