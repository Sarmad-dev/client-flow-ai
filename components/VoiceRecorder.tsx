import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Mic,
  Square,
  Play,
  Pause,
  Trash2,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useUpdateMeeting } from '@/hooks/useMeetings';
import { useCreateTask } from '@/hooks/useTasks';
import {
  transcribeAudio,
  analyzeTaskFromTranscription,
  VoiceAnalysis,
  generateMeetingSummary,
} from '@/lib/ai';
import { ClientSelectionModal } from './ClientSelectionModal';

interface VoiceRecorderProps {
  onTaskCreated?: (task: any) => void;
  mode?: 'task' | 'summary';
  meetingId?: string;
  onSummaryCreated?: (summary: string) => void;
}

export function VoiceRecorder({
  onTaskCreated,
  mode = 'task',
  meetingId,
  onSummaryCreated,
}: VoiceRecorderProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const updateMeeting = useUpdateMeeting();
  const createTask = useCreateTask();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [analysis, setAnalysis] = useState<VoiceAnalysis | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [pendingTaskData, setPendingTaskData] = useState<any>(null);

  const {
    isRecording,
    isPaused,
    recordingDuration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useVoiceRecording();

  // Animation values
  const pulseScale = useSharedValue(1);
  const waveformScale = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Start pulsing animation
      pulseScale.value = withRepeat(
        withTiming(1.2, { duration: 1000 }),
        -1,
        true
      );
      waveformScale.value = withRepeat(
        withTiming(1, { duration: 500 }),
        -1,
        true
      );
    } else {
      // Stop animations
      cancelAnimation(pulseScale);
      cancelAnimation(waveformScale);
      pulseScale.value = withSpring(1);
      waveformScale.value = withTiming(0);
    }
  }, [isRecording, isPaused]);

  const loadClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, company')
        .eq('user_id', user?.id);

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const waveformAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: waveformScale.value }],
    opacity: interpolate(waveformScale.value, [0, 1], [0.3, 1]),
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      buttonScale.value = withSpring(0.9);
      await startRecording();
      buttonScale.value = withSpring(1);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert(
        'Recording Error',
        'Failed to start recording. Please check microphone permissions.'
      );
      buttonScale.value = withSpring(1);
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsProcessing(true);
      const audioUri = await stopRecording();

      if (audioUri && mode === 'task') {
        await processVoiceToTask(audioUri);
      } else if (audioUri && mode === 'summary') {
        await processVoiceToMeetingSummary(audioUri);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
      Alert.alert('Error', 'Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const processVoiceToTask = async (audioUri: string) => {
    try {
      // Step 1: Transcribe audio
      const transcriptionText = await transcribeAudio(audioUri);
      setTranscription(transcriptionText);

      if (!transcriptionText.trim()) {
        Alert.alert(
          'No Speech Detected',
          'Please try recording again with clear speech.'
        );
        return;
      }

      // Step 2: Analyze transcription for task details
      const taskAnalysis = await analyzeTaskFromTranscription(
        transcriptionText
      );
      setAnalysis(taskAnalysis);

      // Step 3: Prepare task data and show client selection modal
      const taskData = {
        user_id: user?.id,
        title: taskAnalysis.title,
        description: taskAnalysis.description || transcriptionText,
        priority: taskAnalysis.priority,
        tag: taskAnalysis.tag,
        due_date: taskAnalysis.dueDate
          ? new Date(taskAnalysis.dueDate).toISOString()
          : null,
        ai_generated: true,
        ai_confidence_score: taskAnalysis.confidence,
        status: 'pending',
        // Store additional data separately for voice recordings
        audio_uri: audioUri,
        transcription: transcriptionText,
        ai_analysis: taskAnalysis,
      };

      setPendingTaskData(taskData);
      setShowClientModal(true);
    } catch (error) {
      console.error('Voice processing error:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process voice recording. Please try again.'
      );
    }
  };

  const processVoiceToMeetingSummary = async (audioUri: string) => {
    try {
      const transcriptionText = await transcribeAudio(audioUri);
      setTranscription(transcriptionText);

      if (!transcriptionText.trim()) {
        Alert.alert(
          'No Speech Detected',
          'Please try recording again with clear speech.'
        );
        return;
      }

      // Fetch meeting metadata if available
      let meetingMeta: {
        title?: string | null;
        description?: string | null;
        agenda?: string | null;
      } = {};
      if (meetingId) {
        const { data: meetingRow, error: meetingError } = await supabase
          .from('meetings')
          .select('id, title, description, agenda, user_id')
          .eq('id', meetingId)
          .single();
        if (!meetingError && meetingRow && meetingRow.user_id === user?.id) {
          meetingMeta = {
            title: meetingRow.title ?? null,
            description: meetingRow.description ?? null,
            agenda: meetingRow.agenda ?? null,
          };
        }
      }

      // Generate comprehensive summary via AI using transcription and metadata
      const finalSummary = await generateMeetingSummary(
        transcriptionText,
        meetingMeta
      );

      // Only save to database if meetingId is provided
      if (meetingId) {
        // Store voice recording metadata and get the ID
        const { data: voiceRecording, error: voiceError } = await supabase
          .from('voice_recordings')
          .insert({
            user_id: user?.id,
            file_path: audioUri,
            transcription: transcriptionText,
            recording_type: 'meeting_summary',
            processed: true,
          })
          .select()
          .single();

        if (voiceError) {
          console.error('Error creating voice recording:', voiceError);
          throw voiceError;
        }

        // Update meeting with summary and voice recording ID using the hook
        await updateMeeting.mutateAsync({
          id: meetingId,
          summary: finalSummary,
          voice_recording_id: voiceRecording.id,
        });
      }

      onSummaryCreated?.(finalSummary);

      Alert.alert(
        'Summary Ready',
        meetingId
          ? 'Meeting summary has been generated and saved.'
          : 'Meeting summary has been generated.',
        [{ text: 'OK' }]
      );

      // Reset state
      setTranscription('');
      setAnalysis(null);
    } catch (error) {
      console.error('Voice processing error:', error);
      Alert.alert(
        'Processing Error',
        'Failed to process voice recording. Please try again.'
      );
    }
  };

  const handleCancel = async () => {
    await cancelRecording();
    setTranscription('');
    setAnalysis(null);
  };

  const handleClientSelected = async (client: any, dueDate: Date) => {
    try {
      if (!pendingTaskData) return;

      // Store voice recording metadata first and get the ID
      const { data: voiceRecording, error: voiceError } = await supabase
        .from('voice_recordings')
        .insert({
          user_id: user?.id,
          file_path: pendingTaskData.audio_uri,
          transcription: pendingTaskData.transcription,
          ai_analysis: JSON.stringify(pendingTaskData.ai_analysis),
          recording_type: 'task',
          processed: true,
        })
        .select()
        .single();

      if (voiceError) {
        console.error('Error creating voice recording:', voiceError);
        throw voiceError;
      }

      // Create task using the hook with voice recording ID
      const task = await createTask.mutateAsync({
        client_id: client.id,
        title: pendingTaskData.title,
        description: pendingTaskData.description,
        priority: pendingTaskData.priority,
        tag: pendingTaskData.tag,
        due_date: dueDate.toISOString(),
        ai_generated: pendingTaskData.ai_generated,
        ai_confidence_score: pendingTaskData.ai_confidence_score,
        status: pendingTaskData.status,
        voice_recording_id: voiceRecording.id,
      });

      Alert.alert(
        'Task Created!',
        `Created task: "${pendingTaskData.title}" for ${client.name}`,
        [{ text: 'OK', onPress: () => onTaskCreated?.(task) }]
      );

      // Reset state
      setTranscription('');
      setAnalysis(null);
      setPendingTaskData(null);
      setShowClientModal(false);
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setPendingTaskData(null);
    setTranscription('');
    setAnalysis(null);
  };

  if (isProcessing) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.text }]}>
            Processing your voice...
          </Text>
          <Text
            style={[styles.processingSubtext, { color: colors.textSecondary }]}
          >
            AI is analyzing and creating your task
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {mode === 'task' ? 'Voice to Task' : 'Meeting Summary'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {mode === 'task'
            ? 'Speak your task and let AI handle the details'
            : 'Record your meeting summary'}
        </Text>
      </View>

      <View style={styles.recordingArea}>
        {/* Waveform Visualization */}
        {(isRecording || isPaused) && (
          <View style={styles.waveformContainer}>
            {[...Array(5)].map((_, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.waveformBar,
                  { backgroundColor: colors.primary },
                  waveformAnimatedStyle,
                  {
                    animationDelay: `${index * 100}ms`,
                    height: 20 + (index % 3) * 10,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Recording Button */}
        <Animated.View
          style={[styles.recordButtonContainer, pulseAnimatedStyle]}
        >
          <TouchableOpacity
            style={[
              styles.recordButton,
              { backgroundColor: isRecording ? colors.error : colors.primary },
            ]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isRecording
                  ? [colors.error, '#DC2626']
                  : [colors.primary, colors.secondary]
              }
              style={styles.recordButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isRecording ? (
                <Square size={32} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Mic size={32} color="#FFFFFF" strokeWidth={2} />
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Recording Controls */}
        {(isRecording || isPaused) && (
          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: colors.textSecondary },
              ]}
              onPress={handleCancel}
            >
              <Trash2 size={20} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>

            <View style={styles.durationContainer}>
              <Text style={[styles.duration, { color: colors.text }]}>
                {formatDuration(recordingDuration)}
              </Text>
              <Text style={[styles.status, { color: colors.textSecondary }]}>
                {isPaused ? 'Paused' : 'Recording...'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.controlButton,
                { backgroundColor: colors.warning },
              ]}
              onPress={isPaused ? resumeRecording : pauseRecording}
            >
              {isPaused ? (
                <Play size={20} color="#FFFFFF" strokeWidth={2} />
              ) : (
                <Pause size={20} color="#FFFFFF" strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        {!isRecording && !isPaused && (
          <Text style={[styles.instructions, { color: colors.textSecondary }]}>
            {mode === 'task'
              ? 'Tap the microphone and describe your task. Include client name, due date, and priority for best results.'
              : 'Tap to record your meeting summary and key takeaways.'}
          </Text>
        )}
      </View>

      {/* Transcription Preview */}
      {transcription && (
        <View
          style={[
            styles.transcriptionContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.transcriptionTitle, { color: colors.text }]}>
            Transcription:
          </Text>
          <Text
            style={[styles.transcriptionText, { color: colors.textSecondary }]}
          >
            {transcription}
          </Text>
        </View>
      )}

      {/* Analysis Preview */}
      {analysis && (
        <View
          style={[
            styles.analysisContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.analysisHeader}>
            <CheckCircle size={20} color={colors.success} strokeWidth={2} />
            <Text style={[styles.analysisTitle, { color: colors.text }]}>
              AI Analysis
            </Text>
          </View>
          <Text style={[styles.analysisText, { color: colors.text }]}>
            Task: {analysis.title}
          </Text>
          {analysis.client && (
            <Text style={[styles.analysisText, { color: colors.text }]}>
              Client: {analysis.client}
            </Text>
          )}
          {analysis.dueDate && (
            <Text style={[styles.analysisText, { color: colors.text }]}>
              Due: {new Date(analysis.dueDate).toLocaleDateString()}
            </Text>
          )}
          <Text style={[styles.analysisText, { color: colors.text }]}>
            Priority: {analysis.priority} • Tag: {analysis.tag}
          </Text>
        </View>
      )}

      {/* Client Selection Modal */}
      <ClientSelectionModal
        visible={showClientModal}
        onClose={handleCloseClientModal}
        onClientSelected={handleClientSelected}
        suggestedClientName={analysis?.client}
        suggestedDueDate={analysis?.dueDate}
        taskTitle={analysis?.title || 'Voice Task'}
        taskDescription={analysis?.description}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  recordingArea: {
    alignItems: 'center',
    minHeight: 200,
    justifyContent: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 32,
    height: 40,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  recordButtonContainer: {
    marginBottom: 24,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  recordButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  duration: {
    fontSize: 18,
    fontWeight: '700',
  },
  status: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  instructions: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  processingText: {
    fontSize: 18,
    fontWeight: '600',
  },
  processingSubtext: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  transcriptionContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  analysisContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  analysisTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  analysisText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 4,
  },
});
