import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polygon, Defs, Marker, Path, Circle } from 'react-native-svg';
import { useTheme } from '@/hooks/useTheme';
import { useDependencyGraph } from '@/hooks/useTaskDependencies';
import type { DependencyGraphNode } from '@/hooks/useTaskDependencies';

interface DependencyGraphProps {
  onNodePress?: (nodeId: string) => void;
  compact?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');

export default function DependencyGraph({
  onNodePress,
  compact = false,
}: DependencyGraphProps) {
  const theme = useTheme();
  const { data: graphData, isLoading, error } = useDependencyGraph();

  const { nodes = [], edges = [], levels = [] } = graphData || {};

  // Calculate layout positions
  const layout = useMemo(() => {
    if (levels.length === 0)
      return {
        nodes: [],
        edges: [],
        connections: [],
        width: 0,
        height: 0,
        nodeWidth: 160,
        nodeHeight: 80,
      };

    const nodeWidth = compact ? 120 : 160;
    const nodeHeight = compact ? 60 : 80;
    const levelHeight = compact ? 100 : 120;
    const nodeSpacing = compact ? 20 : 30;

    const maxNodesInLevel = Math.max(...levels.map((level) => level.length));
    const graphWidth = Math.max(
      screenWidth - 40,
      maxNodesInLevel * (nodeWidth + nodeSpacing)
    );
    const graphHeight = levels.length * levelHeight;

    const positionedNodes: (DependencyGraphNode & { x: number; y: number })[] =
      [];

    levels.forEach((level, levelIndex) => {
      const levelWidth =
        level.length * nodeWidth + (level.length - 1) * nodeSpacing;
      const startX = (graphWidth - levelWidth) / 2;

      level.forEach((node, nodeIndex) => {
        const x = startX + nodeIndex * (nodeWidth + nodeSpacing);
        const y = levelIndex * levelHeight + 20;

        positionedNodes.push({
          ...node,
          x: x + nodeWidth / 2, // Center point
          y: y + nodeHeight / 2, // Center point
        });
      });
    });

    // Calculate connection lines between nodes
    const connections = edges
      .map((edge) => {
        const fromNode = positionedNodes.find((n) => n.id === edge.from);
        const toNode = positionedNodes.find((n) => n.id === edge.to);

        if (!fromNode || !toNode) return null;

        // Calculate connection points (bottom of from node to top of to node)
        const fromX = fromNode.x;
        const fromY = fromNode.y + nodeHeight / 2;
        const toX = toNode.x;
        const toY = toNode.y - nodeHeight / 2;

        return {
          id: `${edge.from}-${edge.to}`,
          fromX,
          fromY,
          toX,
          toY,
          fromNodeId: edge.from,
          toNodeId: edge.to,
        };
      })
      .filter(Boolean);

    return {
      nodes: positionedNodes,
      edges,
      connections,
      width: graphWidth,
      height: graphHeight,
      nodeWidth,
      nodeHeight,
    };
  }, [levels, edges, compact]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return '#3B82F6';
      case 'low':
        return '#6B7280';
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'blocked':
        return '#EF4444';
      case 'pending':
        return '#6B7280';
      default:
        return theme.colors.textSecondary;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollContainer: {
      backgroundColor: theme.colors.background,
    },
    graphContainer: {
      position: 'relative',
      backgroundColor: theme.colors.background,
    },
    svgContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      zIndex: 1,
    },
    nodesContainer: {
      position: 'relative',
      zIndex: 2,
    },
    node: {
      position: 'absolute',
      borderRadius: 8,
      padding: 8,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    nodeContent: {
      flex: 1,
      justifyContent: 'space-between',
    },
    nodeTitle: {
      fontSize: compact ? 12 : 14,
      fontWeight: '600',
      lineHeight: compact ? 16 : 18,
    },
    nodeFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 4,
    },
    nodeBadges: {
      flexDirection: 'row',
      gap: 4,
    },
    statusBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    priorityBadge: {
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: 'white',
      fontSize: 10,
      fontWeight: 'bold',
    },
    dueDate: {
      fontSize: 10,
      fontWeight: '500',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    loadingText: {
      fontSize: 16,
      fontWeight: '500',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    errorText: {
      fontSize: 16,
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
      gap: 12,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    emptyText: {
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 20,
      paddingHorizontal: 20,
    },
    legend: {
      position: 'absolute',
      top: 10,
      right: 10,
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      zIndex: 3,
    },
    legendTitle: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      gap: 8,
    },
    legendLine: {
      width: 20,
      height: 2,
    },
    legendText: {
      fontSize: 10,
      color: theme.colors.textSecondary,
    },
  });

  const renderNode = (node: DependencyGraphNode & { x: number; y: number }) => {
    const nodeStyle = [
      styles.node,
      {
        left: node.x - layout.nodeWidth / 2,
        top: node.y - layout.nodeHeight / 2,
        width: layout.nodeWidth,
        height: layout.nodeHeight,
        backgroundColor: theme.colors.surface,
        borderColor: getPriorityColor(node.priority),
        borderWidth: 2,
      },
    ];

    return (
      <TouchableOpacity
        key={node.id}
        style={nodeStyle}
        onPress={() => onNodePress?.(node.id)}
        activeOpacity={0.7}
      >
        <View style={styles.nodeContent}>
          <Text
            style={[styles.nodeTitle, { color: theme.colors.text }]}
            numberOfLines={compact ? 2 : 3}
          >
            {node.title}
          </Text>

          <View style={styles.nodeFooter}>
            <View style={styles.nodeBadges}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(node.status) },
                ]}
              >
                <Text style={styles.badgeText}>
                  {node.status.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(node.priority) },
                ]}
              >
                <Text style={styles.badgeText}>
                  {node.priority.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>

            {node.due_date && (
              <Text
                style={[styles.dueDate, { color: theme.colors.textSecondary }]}
              >
                {new Date(node.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConnections = () => {
    if (layout.connections.length === 0) return null;

    return (
      <Svg
        width={layout.width}
        height={layout.height}
        style={styles.svgContainer}
      >
        <Defs>
          <Marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <Polygon points="0 0, 10 3.5, 0 7" fill={theme.colors.primary} />
          </Marker>
        </Defs>

        {layout.connections.map((connection) => {
          if (!connection) return null;

          const { fromX, fromY, toX, toY } = connection;

          // Create a smooth curved path
          const deltaY = toY - fromY;
          const controlOffset = Math.max(30, Math.abs(deltaY) * 0.4);

          // Control points for bezier curve
          const controlY1 = fromY + controlOffset;
          const controlY2 = toY - controlOffset;

          // Create SVG path for curved line
          const pathData = `M ${fromX} ${fromY} C ${fromX} ${controlY1}, ${toX} ${controlY2}, ${toX} ${
            toY - 8
          }`;

          return (
            <React.Fragment key={connection.id}>
              {/* Curved connection line */}
              <Path
                d={pathData}
                stroke={theme.colors.primary}
                strokeWidth="2"
                fill="none"
                markerEnd="url(#arrowhead)"
                opacity={0.8}
              />

              {/* Connection points */}
              <Circle
                cx={fromX}
                cy={fromY}
                r="4"
                fill={theme.colors.primary}
                opacity={0.9}
              />
              <Circle
                cx={toX}
                cy={toY}
                r="4"
                fill={theme.colors.success}
                opacity={0.9}
              />
            </React.Fragment>
          );
        })}
      </Svg>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons
          name="hourglass-outline"
          size={32}
          color={theme.colors.textSecondary}
        />
        <Text
          style={[styles.loadingText, { color: theme.colors.textSecondary }]}
        >
          Loading dependency graph...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={32}
          color={theme.colors.error}
        />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Failed to load dependency graph
        </Text>
      </View>
    );
  }

  if (nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="git-network-outline"
          size={48}
          color={theme.colors.textSecondary}
        />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No Task Dependencies
        </Text>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          Create task dependencies to see the dependency graph visualization.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        horizontal
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
        >
          <View
            style={[
              styles.graphContainer,
              {
                width: layout.width,
                height: layout.height,
              },
            ]}
          >
            {/* Render connection lines */}
            {renderConnections()}

            {/* Render nodes */}
            <View style={styles.nodesContainer}>
              {layout.nodes.map(renderNode)}
            </View>

            {/* Legend */}
            {layout.connections.length > 0 && (
              <View style={styles.legend}>
                <Text style={styles.legendTitle}>Dependencies</Text>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLine,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                  <Text style={styles.legendText}>Completed</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLine,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <Text style={styles.legendText}>In Progress</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendLine,
                      { backgroundColor: theme.colors.error },
                    ]}
                  />
                  <Text style={styles.legendText}>Blocked</Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}
