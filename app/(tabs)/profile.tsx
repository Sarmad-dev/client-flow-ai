import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  User,
  Mail,
  Phone,
  Building,
  MapPin,
  Globe,
  Briefcase,
  ArrowLeft,
  Save,
  Linkedin,
  Clock,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomAlert } from '@/components/CustomAlert';
import { profileSchema, ProfileFormData } from '@/lib/validation';

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
];

const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time' },
  { value: 'America/Chicago', label: 'Central Time' },
  { value: 'America/Denver', label: 'Mountain Time' },
  { value: 'America/Los_Angeles', label: 'Pacific Time' },
  { value: 'Europe/London', label: 'GMT' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
];

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [showTonePicker, setShowTonePicker] = useState(false);
  const [showTimezonePicker, setShowTimezonePicker] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      company: '',
      job_title: '',
      website: '',
      industry: '',
      linkedin_url: '',
      address: '',
      timezone: 'UTC',
      email_signature: '',
      preferred_tone: 'professional',
    },
  });

  const selectedTone = watch('preferred_tone');
  const selectedTimezone = watch('timezone');

  useEffect(() => {
    if (profile) {
      setValue('full_name', profile.full_name || '');
      setValue('email', profile.email || '');
      setValue('phone', profile.phone || '');
      setValue('company', profile.company || '');
      setValue('job_title', profile.job_title || '');
      setValue('website', profile.website || '');
      setValue('industry', profile.industry || '');
      setValue('linkedin_url', profile.linkedin_url || '');
      setValue('address', profile.address || '');
      setValue('timezone', profile.timezone || 'UTC');
      setValue('email_signature', profile.email_signature || '');
      setValue(
        'preferred_tone',
        (profile.preferred_tone as any) || 'professional'
      );
    }
  }, [profile, setValue]);

  const showAlert = (
    title: string,
    message: string,
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      onConfirm,
    });
  };

  const hideAlert = () => {
    setAlertConfig({
      visible: false,
      title: '',
      message: '',
    });
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await updateProfile.mutateAsync(data);
      showAlert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const selectedToneData = toneOptions.find((t) => t.value === selectedTone);
  const selectedTimezoneData = timezoneOptions.find(
    (t) => t.value === selectedTimezone
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity
          onPress={handleSubmit(onSubmit)}
          style={[
            styles.saveButton,
            { backgroundColor: isDirty ? colors.primary : colors.border },
          ]}
          disabled={!isDirty || updateProfile.isPending}
        >
          {updateProfile.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Save size={20} color="#FFFFFF" strokeWidth={2} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Basic Information
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Full Name *
            </Text>
            <Controller
              control={control}
              name="full_name"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <User
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
            {errors.full_name && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.full_name.message}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Email *</Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Mail
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              )}
            />
            {errors.email && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.email.message}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Phone</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Phone
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your phone number"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                    keyboardType="phone-pad"
                  />
                </View>
              )}
            />
          </View>
        </View>

        {/* Professional Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Professional Information
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Company</Text>
            <Controller
              control={control}
              name="company"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Building
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your company"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Job Title
            </Text>
            <Controller
              control={control}
              name="job_title"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Briefcase
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your job title"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Industry</Text>
            <Controller
              control={control}
              name="industry"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Building
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your industry"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Contact Information
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Website</Text>
            <Controller
              control={control}
              name="website"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Globe
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="https://yourwebsite.com"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              )}
            />
            {errors.website && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.website.message}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>LinkedIn</Text>
            <Controller
              control={control}
              name="linkedin_url"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Linkedin
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="https://linkedin.com/in/yourprofile"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                    keyboardType="url"
                    autoCapitalize="none"
                  />
                </View>
              )}
            />
            {errors.linkedin_url && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.linkedin_url.message}
              </Text>
            )}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Address</Text>
            <Controller
              control={control}
              name="address"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <MapPin
                    size={20}
                    color={colors.textSecondary}
                    strokeWidth={2}
                  />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    placeholder="Enter your address"
                    placeholderTextColor={colors.textSecondary}
                    value={value || ''}
                    onChangeText={onChange}
                    multiline
                  />
                </View>
              )}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Preferences
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>Timezone</Text>
            <TouchableOpacity
              style={[
                styles.picker,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowTimezonePicker(true)}
            >
              <Clock size={20} color={colors.textSecondary} strokeWidth={2} />
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {selectedTimezoneData?.label || 'Select timezone'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Preferred Communication Tone
            </Text>
            <TouchableOpacity
              style={[
                styles.picker,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={() => setShowTonePicker(true)}
            >
              <Text style={[styles.pickerText, { color: colors.text }]}>
                {selectedToneData?.label || 'Select tone'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.text }]}>
              Email Signature
            </Text>
            <Controller
              control={control}
              name="email_signature"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      color: colors.text,
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="Enter your email signature..."
                  placeholderTextColor={colors.textSecondary}
                  value={value || ''}
                  onChangeText={onChange}
                  multiline
                  numberOfLines={4}
                />
              )}
            />
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Tone Picker Modal */}
      {showTonePicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTonePicker(false)}
          />
          <View
            style={[styles.pickerModal, { backgroundColor: colors.background }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Select Communication Tone
              </Text>
            </View>
            <ScrollView style={styles.pickerList}>
              {toneOptions.map((tone) => (
                <TouchableOpacity
                  key={tone.value}
                  style={[
                    styles.pickerOption,
                    { backgroundColor: colors.surface },
                    selectedTone === tone.value && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setValue('preferred_tone', tone.value as any);
                    setShowTonePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      {
                        color:
                          selectedTone === tone.value ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {tone.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Timezone Picker Modal */}
      {showTimezonePicker && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTimezonePicker(false)}
          />
          <View
            style={[styles.pickerModal, { backgroundColor: colors.background }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                Select Timezone
              </Text>
            </View>
            <ScrollView style={styles.pickerList}>
              {timezoneOptions.map((timezone) => (
                <TouchableOpacity
                  key={timezone.value}
                  style={[
                    styles.pickerOption,
                    { backgroundColor: colors.surface },
                    selectedTimezone === timezone.value && {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={() => {
                    setValue('timezone', timezone.value);
                    setShowTimezonePicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      {
                        color:
                          selectedTimezone === timezone.value
                            ? '#FFFFFF'
                            : colors.text,
                      },
                    ]}
                  >
                    {timezone.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        onClose={hideAlert}
        onConfirm={alertConfig.onConfirm}
      />
    </SafeAreaView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  textArea: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '400',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '400',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerModal: {
    maxHeight: '60%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  pickerHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  pickerList: {
    paddingHorizontal: 24,
    maxHeight: 300,
  },
  pickerOption: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  pickerOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
