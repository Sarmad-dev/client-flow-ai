import React from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { TaskCard } from './TaskCard';
import type { TaskRecord } from '@/hooks/useTasks';

interface DraggableTaskCardProps {
  task: TaskRecord;
  onToggleComplete: () => void;
  onPress: () => void;
  onDragStart: (taskId: string) => void;
  onDragMove: (taskId: string, x: number, y: number) => void;
  onDragEnd: (taskId: string, x: number, y: number) => void;
  showSubtasks?: boolean;
  showDependencies?: boolean;
}

export function DraggableTaskCard({
  task,
  onToggleComplete,
  onPress,
  onDragStart,
  onDragMove,
  onDragEnd,
  showSubtasks = true,
  showDependencies = true,
}: DraggableTaskCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIndex = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      isDragging.value = true;
      scale.value = withSpring(1.05, { damping: 15 });
      zIndex.value = 1000;
      runOnJS(onDragStart)(task.id);
    })
    .onUpdate((event) => {
      'worklet';
      translateX.value = event.translationX;
      translateY.value = event.translationY;

      // Notify parent about drag position for auto-scroll
      runOnJS(onDragMove)(task.id, event.absoluteX, event.absoluteY);
    })
    .onEnd((event) => {
      'worklet';
      const finalX = event.absoluteX;
      const finalY = event.absoluteY;

      runOnJS(onDragEnd)(task.id, finalX, finalY);

      // Reset position with animation
      translateX.value = withSpring(0, { damping: 20 });
      translateY.value = withSpring(0, { damping: 20 });
      scale.value = withSpring(1, { damping: 15 });
      isDragging.value = false;

      // Reset z-index after animation completes
      setTimeout(() => {
        zIndex.value = 0;
      }, 300);
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      'worklet';
      runOnJS(onPress)();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      zIndex: zIndex.value,
      opacity: isDragging.value
        ? withTiming(0.85, { duration: 150 })
        : withTiming(1, { duration: 150 }),
      shadowOpacity: isDragging.value
        ? withTiming(0.3, { duration: 150 })
        : withTiming(0.1, { duration: 150 }),
      shadowRadius: isDragging.value
        ? withTiming(12, { duration: 150 })
        : withTiming(4, { duration: 150 }),
    };
  });

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.container, animatedStyle]}>
        <TaskCard
          task={task}
          onToggleComplete={onToggleComplete}
          onPress={onPress}
          showSubtasks={showSubtasks}
          showDependencies={showDependencies}
          showTimeTracking={true}
          showCollaboration={true}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
