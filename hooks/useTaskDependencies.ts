import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TaskDependency, TaskRecord } from '@/types/task-management';

const dependenciesKeys = {
  all: ['task-dependencies'] as const,
  byTask: (taskId: string) =>
    [...dependenciesKeys.all, 'task', taskId] as const,
  graph: (userId?: string) =>
    [...dependenciesKeys.all, 'graph', userId] as const,
};

// Interface for dependency graph visualization
export interface DependencyGraphNode {
  id: string;
  title: string;
  status: TaskRecord['status'];
  priority: TaskRecord['priority'];
  due_date: string | null;
  x?: number;
  y?: number;
  level?: number;
}

export interface DependencyGraphEdge {
  from: string;
  to: string;
  type: 'dependency';
}

export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  edges: DependencyGraphEdge[];
  levels: DependencyGraphNode[][];
}

// Hook to get dependencies for a specific task
export function useTaskDependencies(taskId: string) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: dependenciesKeys.byTask(taskId),
    queryFn: async (): Promise<{
      dependencies: TaskDependency[];
      dependents: TaskDependency[];
      prerequisiteTasks: TaskRecord[];
      dependentTasks: TaskRecord[];
    }> => {
      if (!userId || !taskId) {
        return {
          dependencies: [],
          dependents: [],
          prerequisiteTasks: [],
          dependentTasks: [],
        };
      }

      // Get tasks that this task depends on (prerequisites)
      const { data: dependencies, error: depsError } = await supabase
        .from('task_dependencies')
        .select(
          `
          *,
          depends_on_task:tasks!depends_on_task_id(
            id, title, status, priority, due_date, user_id
          )
        `
        )
        .eq('task_id', taskId);

      if (depsError) throw depsError;

      // Get tasks that depend on this task (dependents)
      const { data: dependents, error: dependentsError } = await supabase
        .from('task_dependencies')
        .select(
          `
          *,
          task:tasks!task_id(
            id, title, status, priority, due_date, user_id
          )
        `
        )
        .eq('depends_on_task_id', taskId);

      if (dependentsError) throw dependentsError;

      return {
        dependencies: dependencies ?? [],
        dependents: dependents ?? [],
        prerequisiteTasks: (dependencies ?? [])
          .map((dep: any) => dep.depends_on_task)
          .filter(Boolean),
        dependentTasks: (dependents ?? [])
          .map((dep: any) => dep.task)
          .filter(Boolean),
      };
    },
    enabled: !!userId && !!taskId,
  });
}

// Hook to get the complete dependency graph for visualization
export function useDependencyGraph() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: dependenciesKeys.graph(userId),
    queryFn: async (): Promise<DependencyGraph> => {
      if (!userId) {
        return { nodes: [], edges: [], levels: [] };
      }

      // Get all tasks and their dependencies
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, status, priority, due_date')
        .eq('user_id', userId)
        .is('parent_task_id', null); // Only parent tasks for cleaner graph

      if (tasksError) throw tasksError;

      const { data: dependencies, error: depsError } = await supabase
        .from('task_dependencies')
        .select('task_id, depends_on_task_id')
        .in(
          'task_id',
          (tasks ?? []).map((t) => t.id)
        )
        .in(
          'depends_on_task_id',
          (tasks ?? []).map((t) => t.id)
        );

      if (depsError) throw depsError;

      // Create nodes
      const nodes: DependencyGraphNode[] = (tasks ?? []).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
      }));

      // Create edges
      const edges: DependencyGraphEdge[] = (dependencies ?? []).map((dep) => ({
        from: dep.depends_on_task_id,
        to: dep.task_id,
        type: 'dependency' as const,
      }));

      // Calculate levels for hierarchical layout
      const levels = calculateDependencyLevels(nodes, edges);

      return { nodes, edges, levels };
    },
    enabled: !!userId,
  });
}

// Create a new task dependency with circular dependency detection
export function useCreateTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      depends_on_task_id: string;
    }): Promise<TaskDependency> => {
      // Check for circular dependencies
      const isCircular = await checkCircularDependency(
        payload.task_id,
        payload.depends_on_task_id
      );

      if (isCircular) {
        throw new Error(
          'Circular dependency detected. This dependency would create a loop in the task chain.'
        );
      }

      // Check if dependency already exists
      const { data: existing } = await supabase
        .from('task_dependencies')
        .select('id')
        .eq('task_id', payload.task_id)
        .eq('depends_on_task_id', payload.depends_on_task_id)
        .single();

      if (existing) {
        throw new Error('This dependency already exists.');
      }

      const { data, error } = await supabase
        .from('task_dependencies')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return data as TaskDependency;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: dependenciesKeys.byTask(variables.task_id),
      });
      queryClient.invalidateQueries({
        queryKey: dependenciesKeys.byTask(variables.depends_on_task_id),
      });
      queryClient.invalidateQueries({ queryKey: dependenciesKeys.graph() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Remove a task dependency
export function useDeleteTaskDependency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      task_id: string;
      depends_on_task_id: string;
    }) => {
      const { error } = await supabase
        .from('task_dependencies')
        .delete()
        .eq('task_id', payload.task_id)
        .eq('depends_on_task_id', payload.depends_on_task_id);

      if (error) throw error;
      return payload;
    },
    onSuccess: (variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: dependenciesKeys.byTask(variables.task_id),
      });
      queryClient.invalidateQueries({
        queryKey: dependenciesKeys.byTask(variables.depends_on_task_id),
      });
      queryClient.invalidateQueries({ queryKey: dependenciesKeys.graph() });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Validate if a task can be started based on its dependencies
export function useValidateTaskStart() {
  return useMutation({
    mutationFn: async (
      taskId: string
    ): Promise<{
      canStart: boolean;
      blockedBy: TaskRecord[];
      message: string;
    }> => {
      const { data: dependencies, error } = await supabase
        .from('task_dependencies')
        .select(
          `
          depends_on_task:tasks!depends_on_task_id(
            id, title, status, priority, due_date
          )
        `
        )
        .eq('task_id', taskId);

      if (error) throw error;

      if (!dependencies || dependencies.length === 0) {
        return {
          canStart: true,
          blockedBy: [],
          message: 'Task has no dependencies and can be started.',
        };
      }

      const blockedBy = (dependencies as any[])
        .map((dep) => dep.depends_on_task)
        .filter((task) => task && task.status !== 'completed');

      const canStart = blockedBy.length === 0;
      const message = canStart
        ? 'All dependencies are completed. Task can be started.'
        : `Task is blocked by ${blockedBy.length} incomplete dependencies.`;

      return { canStart, blockedBy, message };
    },
  });
}

// Get tasks that are ready to start (no blocking dependencies)
export function useReadyTasks() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: [...dependenciesKeys.all, 'ready', userId] as const,
    queryFn: async (): Promise<TaskRecord[]> => {
      if (!userId) return [];

      // Get all pending tasks
      const { data: pendingTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (tasksError) throw tasksError;
      if (!pendingTasks || pendingTasks.length === 0) return [];

      // Get all dependencies for these tasks
      const { data: dependencies, error: depsError } = await supabase
        .from('task_dependencies')
        .select(
          `
          task_id,
          depends_on_task:tasks!depends_on_task_id(id, status)
        `
        )
        .in(
          'task_id',
          pendingTasks.map((t) => t.id)
        );

      if (depsError) throw depsError;

      // Filter tasks that have no incomplete dependencies
      const readyTasks = pendingTasks.filter((task) => {
        const taskDeps = (dependencies ?? []).filter(
          (dep: any) => dep.task_id === task.id
        );

        if (taskDeps.length === 0) return true; // No dependencies

        return taskDeps.every(
          (dep: any) => dep.depends_on_task?.status === 'completed'
        );
      });

      return readyTasks as TaskRecord[];
    },
    enabled: !!userId,
  });
}

// Bulk dependency operations
export function useBulkCreateDependencies() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      dependencies: Array<{
        task_id: string;
        depends_on_task_id: string;
      }>
    ) => {
      const results = [];
      const errors = [];

      for (const dep of dependencies) {
        try {
          // Check for circular dependency
          const isCircular = await checkCircularDependency(
            dep.task_id,
            dep.depends_on_task_id
          );

          if (isCircular) {
            errors.push({
              dependency: dep,
              error: 'Circular dependency detected',
            });
            continue;
          }

          const { data, error } = await supabase
            .from('task_dependencies')
            .insert(dep)
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        } catch (error) {
          errors.push({
            dependency: dep,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return { results, errors };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dependenciesKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

// Utility functions
async function checkCircularDependency(
  taskId: string,
  dependsOnTaskId: string
): Promise<boolean> {
  try {
    // Use depth-first search to detect cycles
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    async function hasCycle(currentTaskId: string): Promise<boolean> {
      if (recursionStack.has(currentTaskId)) {
        return true; // Cycle detected
      }

      if (visited.has(currentTaskId)) {
        return false; // Already processed
      }

      visited.add(currentTaskId);
      recursionStack.add(currentTaskId);

      // Get all tasks that the current task depends on
      const { data: dependencies } = await supabase
        .from('task_dependencies')
        .select('depends_on_task_id')
        .eq('task_id', currentTaskId);

      if (dependencies) {
        for (const dep of dependencies) {
          if (await hasCycle(dep.depends_on_task_id)) {
            return true;
          }
        }
      }

      recursionStack.delete(currentTaskId);
      return false;
    }

    // Check if adding this dependency would create a cycle
    // We simulate the new dependency by checking if dependsOnTaskId
    // eventually leads back to taskId
    return await hasCycle(dependsOnTaskId);
  } catch (error) {
    console.error('Error checking circular dependency:', error);
    return false; // Assume no cycle on error to be safe
  }
}

function calculateDependencyLevels(
  nodes: DependencyGraphNode[],
  edges: DependencyGraphEdge[]
): DependencyGraphNode[][] {
  const levels: DependencyGraphNode[][] = [];
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  // Initialize in-degree and adjacency list
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  });

  edges.forEach((edge) => {
    const currentInDegree = inDegree.get(edge.to) || 0;
    inDegree.set(edge.to, currentInDegree + 1);

    const currentAdjList = adjList.get(edge.from) || [];
    currentAdjList.push(edge.to);
    adjList.set(edge.from, currentAdjList);
  });

  // Topological sort with level tracking
  const queue: string[] = [];
  const levelMap = new Map<string, number>();

  // Start with nodes that have no dependencies
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
      levelMap.set(nodeId, 0);
    }
  });

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    const currentLevel = levelMap.get(currentNodeId) || 0;
    const currentNode = nodeMap.get(currentNodeId);

    if (currentNode) {
      // Ensure levels array has enough sub-arrays
      while (levels.length <= currentLevel) {
        levels.push([]);
      }

      currentNode.level = currentLevel;
      levels[currentLevel].push(currentNode);
    }

    // Process adjacent nodes
    const adjacentNodes = adjList.get(currentNodeId) || [];
    adjacentNodes.forEach((adjacentNodeId) => {
      const currentInDegree = inDegree.get(adjacentNodeId) || 0;
      inDegree.set(adjacentNodeId, currentInDegree - 1);

      if (inDegree.get(adjacentNodeId) === 0) {
        queue.push(adjacentNodeId);
        levelMap.set(adjacentNodeId, currentLevel + 1);
      }
    });
  }

  return levels;
}

// Hook to get dependency path between two tasks
export function useDependencyPath() {
  return useMutation({
    mutationFn: async (payload: {
      fromTaskId: string;
      toTaskId: string;
    }): Promise<{
      hasPath: boolean;
      path: TaskRecord[];
      length: number;
    }> => {
      const { fromTaskId, toTaskId } = payload;

      if (fromTaskId === toTaskId) {
        return { hasPath: true, path: [], length: 0 };
      }

      // Use BFS to find shortest path
      const queue: Array<{ taskId: string; path: string[] }> = [
        { taskId: fromTaskId, path: [fromTaskId] },
      ];
      const visited = new Set<string>([fromTaskId]);

      while (queue.length > 0) {
        const { taskId, path } = queue.shift()!;

        // Get tasks that depend on the current task
        const { data: dependents } = await supabase
          .from('task_dependencies')
          .select('task_id')
          .eq('depends_on_task_id', taskId);

        if (dependents) {
          for (const dep of dependents) {
            if (dep.task_id === toTaskId) {
              // Found path
              const fullPath = [...path, toTaskId];
              const { data: pathTasks } = await supabase
                .from('tasks')
                .select('*')
                .in('id', fullPath);

              return {
                hasPath: true,
                path: (pathTasks ?? []) as TaskRecord[],
                length: fullPath.length - 1,
              };
            }

            if (!visited.has(dep.task_id)) {
              visited.add(dep.task_id);
              queue.push({
                taskId: dep.task_id,
                path: [...path, dep.task_id],
              });
            }
          }
        }
      }

      return { hasPath: false, path: [], length: -1 };
    },
  });
}
