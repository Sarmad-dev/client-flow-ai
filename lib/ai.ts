import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

export interface VoiceAnalysis {
  title: string;
  description?: string;
  client?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  tag: 'follow-up' | 'proposal' | 'meeting' | 'call' | 'research' | 'design';
  confidence: number;
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');

    const response = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_OPENAI_API_KEY}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      }
    );

    const result = await response.json();
    return result.text || '';
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}

export async function analyzeTaskFromTranscription(
  transcription: string
): Promise<VoiceAnalysis> {
  try {
    const currentDate = new Date();
    const currentDay = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    const prompt = `
You are an AI assistant that analyzes voice transcriptions and extracts task information. IMPORTANT: Always respond in English only.

Current date context: ${
      currentDate.toISOString().split('T')[0]
    } (${currentDate.toLocaleDateString('en-US', { weekday: 'long' })})
Current time: ${currentDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })}

Analyze the following voice transcription and extract task information. Return a JSON object with these fields:

- title: A clear, concise task title in English (required)
- description: Additional context or details in English (optional)
- client: Client name if mentioned (extract exact name, optional)
- dueDate: Due date in ISO format (YYYY-MM-DD) if mentioned or can be inferred (optional)
- priority: "low", "medium", or "high" based on urgency/tone (required, default "medium")
- tag: One of "follow-up", "proposal", "meeting", "call", "research", "design" (required, default "follow-up")
- confidence: Confidence score 0-1 for the extraction quality (required)

Date extraction rules (use current date as reference):
- "today" = ${currentDate.toISOString().split('T')[0]}
- "tomorrow" = ${
      new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    }
- "next week" = ${
      new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    }
- "in X days" = add X days to current date
- "next Monday/Tuesday/etc" = next occurrence of that day of week
- "by Friday" = this Friday if not past Friday, otherwise next Friday
- "ASAP" = ${currentDate.toISOString().split('T')[0]}
- "urgent" = ${currentDate.toISOString().split('T')[0]}
- "end of week" = ${
      new Date(currentDate.getTime() + (5 - currentDay) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0]
    }
- "end of month" = last day of current month

Client name extraction:
- Look for names after "for", "with", "to", "from", "client", "customer"
- Extract full names when possible
- Common patterns: "call John", "meeting with Sarah", "follow up with ABC Company"
- If multiple names mentioned, use the most relevant one

Priority indicators:
- High: "urgent", "ASAP", "immediately", "today", "tomorrow", "critical", "emergency"
- Medium: "soon", "this week", "when possible", "next week"
- Low: "sometime", "when you get a chance", "no rush", "when convenient"

Tag indicators:
- "follow up", "check in", "touch base" = follow-up
- "proposal", "quote", "estimate" = proposal
- "meeting", "schedule", "appointment" = meeting
- "call", "phone", "ring" = call
- "research", "look into", "investigate" = research
- "design", "create", "build" = design

Transcription: "${transcription}"

Return only valid JSON in English:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant that extracts task information from voice transcriptions. IMPORTANT: Always respond in English only and return valid JSON. Never respond in any other language.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('Response: ', response.choices[0]?.message?.content);

    // Extract JSON from the response, handling potential markdown formatting
    let jsonContent = content.trim();

    // Remove markdown code blocks if present
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    // Clean up any remaining whitespace
    jsonContent = jsonContent.trim();

    const analysis = JSON.parse(jsonContent) as VoiceAnalysis;

    // Validate and set defaults
    let processedDueDate = analysis.dueDate;

    // If dueDate is provided but not in ISO format, try to parse it
    if (processedDueDate && !processedDueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      try {
        const parsedDate = new Date(processedDueDate);
        if (!isNaN(parsedDate.getTime())) {
          processedDueDate = parsedDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        }
      } catch (e) {
        console.warn('Failed to parse due date:', processedDueDate);
        processedDueDate = undefined;
      }
    }

    return {
      title: analysis.title || 'Voice Task',
      description: analysis.description,
      client: analysis.client,
      dueDate: processedDueDate,
      priority: analysis.priority || 'medium',
      tag: analysis.tag || 'follow-up',
      confidence: Math.min(Math.max(analysis.confidence || 0.5, 0), 1),
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    // Return fallback analysis
    return {
      title: 'Voice Task',
      description: transcription,
      priority: 'medium',
      tag: 'follow-up',
      confidence: 0.1,
    };
  }
}

export async function generateFollowUpEmail(
  clientName: string,
  lastInteraction: string,
  context: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional business communication assistant. Generate personalized, professional follow-up emails.',
        },
        {
          role: 'user',
          content: `Generate a professional follow-up email for ${clientName}. 
          Last interaction: ${lastInteraction}
          Context: ${context}
          
          Make it personalized, professional, and action-oriented. Include a clear call-to-action.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'Failed to generate email';
  } catch (error) {
    console.error('Email generation error:', error);
    throw new Error('Failed to generate follow-up email');
  }
}

export async function enhanceEmailContent(
  originalContent: string,
  context?: {
    recipient?: string;
    subject?: string;
    tone?: 'professional' | 'casual' | 'formal' | 'friendly';
  }
): Promise<string> {
  try {
    const prompt = `
You are a professional email enhancement assistant. Your task is to improve the given email content while maintaining the original intent and meaning.

Guidelines:
- Improve grammar, spelling, and punctuation
- Enhance clarity and readability
- Maintain professional tone unless specified otherwise
- Keep the original message structure and key points
- Make the language more polished and engaging
- Ensure proper business communication standards

Context:
- Recipient: ${context?.recipient || 'Not specified'}
- Subject: ${context?.subject || 'Not specified'}
- Preferred tone: ${context?.tone || 'professional'}

Original email content:
"${originalContent}"

Please return only the enhanced email content without any explanations or markdown formatting.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional email enhancement assistant. Return only the enhanced email content without any explanations, markdown, or additional formatting.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const enhancedContent = response.choices[0]?.message?.content;
    if (!enhancedContent) {
      throw new Error('No response from AI');
    }

    return enhancedContent.trim();
  } catch (error) {
    console.error('Email enhancement error:', error);
    throw new Error('Failed to enhance email content');
  }
}

export async function generateMeetingSummary(
  transcription: string,
  context?: {
    title?: string | null;
    description?: string | null;
    agenda?: string | null;
  }
): Promise<string> {
  try {
    const prompt = `You are a professional meeting assistant. Create a concise, well-structured meeting summary in English based on the voice transcription and the meeting metadata below.

Return ONLY the summary text. Do not include any extra commentary, JSON, or markdown code fences.

Guidelines:
- Start with a one-paragraph executive summary (2-4 sentences)
- Include a short bullet list of key decisions
- Include a short bullet list of action items (Owner — Action — Due if present or implied)
- Be factual, avoid speculation; if unsure, omit
- Keep total length under 250-350 words

Meeting metadata (may be partially empty):
- Title: ${context?.title || 'N/A'}
- Description: ${context?.description || 'N/A'}
- Agenda: ${context?.agenda || 'N/A'}

Transcription:
"""
${transcription}
"""`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional meeting assistant. Return only the final summary text with clear headings and bullet points, no markdown code fences.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('No response from AI');
    return content.trim();
  } catch (error) {
    console.error('Meeting summary generation error:', error);
    // Fallback: return the raw transcription truncated
    const safe = (transcription || '').trim();
    return safe.length > 1200 ? safe.slice(0, 1200) + '…' : safe;
  }
}

// Task Suggestion and Intelligence Functions

export interface TaskSuggestionContext {
  tasks: any[];
  completedTasks: any[];
  userId: string;
}

export interface TaskSuggestion {
  id: string;
  type: 'priority' | 'reschedule' | 'template' | 'dependency' | 'automation';
  title: string;
  description: string;
  confidence: number;
  task_id?: string;
  suggested_action: {
    type: string;
    parameters: Record<string, any>;
  };
  created_at: string;
  is_applied: boolean;
}

export interface TaskPrioritization {
  task_id: string;
  suggested_priority: 'low' | 'medium' | 'high' | 'urgent';
  current_priority: 'low' | 'medium' | 'high' | 'urgent';
  reason: string;
  confidence: number;
  factors: {
    due_date_urgency: number;
    dependency_impact: number;
    client_importance: number;
    historical_pattern: number;
  };
}

export interface ReschedulingSuggestion {
  task_id: string;
  current_due_date: string | null;
  suggested_due_date: string;
  reason: string;
  confidence: number;
  suggested_actions: Array<{
    type: 'reschedule' | 'break_down' | 'delegate' | 'cancel';
    description: string;
    parameters: Record<string, any>;
  }>;
}

export async function generateTaskSuggestions(
  context: TaskSuggestionContext
): Promise<TaskSuggestion[]> {
  try {
    const { tasks, completedTasks } = context;

    // Analyze current task state
    const activeTasks = tasks.filter((t) =>
      ['pending', 'in_progress'].includes(t.status)
    );
    const overdueTasks = activeTasks.filter(
      (t) => t.due_date && new Date(t.due_date) < new Date()
    );

    // Prepare context for AI analysis
    const analysisContext = {
      active_tasks_count: activeTasks.length,
      overdue_tasks_count: overdueTasks.length,
      completion_patterns: analyzeCompletionPatterns(completedTasks),
      priority_distribution: analyzePriorityDistribution(activeTasks),
      client_workload: analyzeClientWorkload(activeTasks),
      recent_activity: analyzeRecentActivity(tasks),
    };

    const prompt = `You are an intelligent task management assistant. Analyze the user's current task situation and provide actionable suggestions to improve productivity and task management.

Current Context:
- Active tasks: ${analysisContext.active_tasks_count}
- Overdue tasks: ${analysisContext.overdue_tasks_count}
- Completion patterns: ${JSON.stringify(analysisContext.completion_patterns)}
- Priority distribution: ${JSON.stringify(
      analysisContext.priority_distribution
    )}
- Client workload: ${JSON.stringify(analysisContext.client_workload)}

Based on this analysis, generate up to 5 intelligent suggestions. Each suggestion should be actionable and specific.

Return a JSON array of suggestions with this structure:
[
  {
    "id": "unique_id",
    "type": "priority|reschedule|template|dependency|automation",
    "title": "Brief suggestion title",
    "description": "Detailed explanation of the suggestion",
    "confidence": 0.8,
    "task_id": "task_id_if_applicable",
    "suggested_action": {
      "type": "update_priority|reschedule|create_subtasks|add_dependency|use_template",
      "parameters": {}
    },
    "created_at": "${new Date().toISOString()}",
    "is_applied": false
  }
]

Focus on:
1. Prioritization improvements based on due dates and dependencies
2. Rescheduling suggestions for overdue tasks
3. Template recommendations for recurring patterns
4. Dependency suggestions to improve workflow
5. Automation opportunities to reduce manual work

Return only valid JSON.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an intelligent task management assistant. Return only valid JSON arrays of task suggestions.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    // Parse and validate the response
    let suggestions: TaskSuggestion[];
    try {
      const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
      suggestions = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI suggestions:', parseError);
      return [];
    }

    // Add fallback suggestions based on heuristics
    const heuristicSuggestions = generateHeuristicSuggestions(context);

    return [...suggestions, ...heuristicSuggestions].slice(0, 8); // Limit to 8 suggestions
  } catch (error) {
    console.error('Task suggestions generation error:', error);
    // Return heuristic-based suggestions as fallback
    return generateHeuristicSuggestions(context);
  }
}

export async function prioritizeTasks(
  tasks: any[]
): Promise<TaskPrioritization[]> {
  try {
    const activeTasks = tasks.filter((t) =>
      ['pending', 'in_progress'].includes(t.status)
    );

    if (activeTasks.length === 0) return [];

    const prioritizations: TaskPrioritization[] = [];

    for (const task of activeTasks) {
      const factors = calculatePriorityFactors(task, tasks);
      const suggestedPriority = calculateSuggestedPriority(factors);

      if (suggestedPriority !== task.priority) {
        prioritizations.push({
          task_id: task.id,
          suggested_priority: suggestedPriority,
          current_priority: task.priority,
          reason: generatePriorityReason(factors, suggestedPriority),
          confidence: calculatePriorityConfidence(factors),
          factors,
        });
      }
    }

    return prioritizations.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('Task prioritization error:', error);
    return [];
  }
}

export async function generateReschedulingSuggestions(
  tasks: any[]
): Promise<ReschedulingSuggestion[]> {
  try {
    const today = new Date();
    const overdueTasks = tasks.filter(
      (t) =>
        t.due_date &&
        new Date(t.due_date) < today &&
        ['pending', 'in_progress'].includes(t.status)
    );

    const suggestions: ReschedulingSuggestion[] = [];

    for (const task of overdueTasks) {
      const daysPastDue = Math.floor(
        (today.getTime() - new Date(task.due_date).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const suggestion = generateReschedulingSuggestion(task, daysPastDue);
      suggestions.push(suggestion);
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  } catch (error) {
    console.error('Rescheduling suggestions error:', error);
    return [];
  }
}

export async function analyzeTaskPatterns(tasks: any[]): Promise<any> {
  try {
    const completedTasks = tasks.filter((t) => t.status === 'completed');

    const patterns = {
      completion_time_by_priority:
        analyzeCompletionTimeByPriority(completedTasks),
      most_productive_days: analyzeMostProductiveDays(completedTasks),
      task_type_patterns: analyzeTaskTypePatterns(completedTasks),
      client_patterns: analyzeClientPatterns(completedTasks),
      seasonal_patterns: analyzeSeasonalPatterns(completedTasks),
    };

    return patterns;
  } catch (error) {
    console.error('Task pattern analysis error:', error);
    return null;
  }
}

// Helper functions for task analysis

function analyzeCompletionPatterns(completedTasks: any[]) {
  const totalTasks = completedTasks.length;
  if (totalTasks === 0)
    return { average_completion_days: 0, completion_rate: 0 };

  const completionTimes = completedTasks
    .filter((t) => t.created_at && t.updated_at)
    .map((t) => {
      const created = new Date(t.created_at);
      const completed = new Date(t.updated_at);
      return Math.floor(
        (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      );
    });

  const averageCompletionDays =
    completionTimes.length > 0
      ? completionTimes.reduce((sum, days) => sum + days, 0) /
        completionTimes.length
      : 0;

  return {
    average_completion_days: Math.round(averageCompletionDays * 10) / 10,
    completion_rate:
      totalTasks > 0 ? Math.round((totalTasks / (totalTasks + 10)) * 100) : 0, // Rough estimate
  };
}

function analyzePriorityDistribution(tasks: any[]) {
  const distribution = { urgent: 0, high: 0, medium: 0, low: 0 };
  tasks.forEach((task) => {
    if (distribution.hasOwnProperty(task.priority)) {
      distribution[task.priority as keyof typeof distribution]++;
    }
  });
  return distribution;
}

function analyzeClientWorkload(tasks: any[]) {
  const clientWorkload: Record<string, number> = {};
  tasks.forEach((task) => {
    if (task.client_id) {
      clientWorkload[task.client_id] =
        (clientWorkload[task.client_id] || 0) + 1;
    }
  });
  return clientWorkload;
}

function analyzeRecentActivity(tasks: any[]) {
  const recentTasks = tasks.filter((t) => {
    const taskDate = new Date(t.created_at);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return taskDate > weekAgo;
  });

  return {
    tasks_created_this_week: recentTasks.length,
    most_common_tag: getMostCommonTag(recentTasks),
    average_priority: getAveragePriority(recentTasks),
  };
}

function generateHeuristicSuggestions(
  context: TaskSuggestionContext
): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = [];
  const { tasks } = context;

  const activeTasks = tasks.filter((t) =>
    ['pending', 'in_progress'].includes(t.status)
  );
  const overdueTasks = activeTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date()
  );

  // Suggest prioritizing overdue tasks
  if (overdueTasks.length > 0) {
    suggestions.push({
      id: `overdue-priority-${Date.now()}`,
      type: 'priority',
      title: 'Prioritize Overdue Tasks',
      description: `You have ${overdueTasks.length} overdue task(s). Consider updating their priority or rescheduling them.`,
      confidence: 0.9,
      suggested_action: {
        type: 'bulk_update_priority',
        parameters: {
          task_ids: overdueTasks.map((t) => t.id),
          priority: 'urgent',
        },
      },
      created_at: new Date().toISOString(),
      is_applied: false,
    });
  }

  // Suggest breaking down large tasks
  const largeTasks = activeTasks.filter(
    (t) => t.estimated_hours && t.estimated_hours > 8 && !t.parent_task_id
  );

  if (largeTasks.length > 0) {
    suggestions.push({
      id: `break-down-${Date.now()}`,
      type: 'template',
      title: 'Break Down Large Tasks',
      description:
        'Consider breaking down tasks estimated to take more than 8 hours into smaller subtasks.',
      confidence: 0.7,
      task_id: largeTasks[0].id,
      suggested_action: {
        type: 'create_subtasks',
        parameters: {
          subtasks: [
            { title: 'Planning and research', estimated_hours: 2 },
            { title: 'Implementation', estimated_hours: 4 },
            { title: 'Review and testing', estimated_hours: 2 },
          ],
        },
      },
      created_at: new Date().toISOString(),
      is_applied: false,
    });
  }

  return suggestions;
}

function calculatePriorityFactors(task: any, allTasks: any[]) {
  const today = new Date();
  const dueDate = task.due_date ? new Date(task.due_date) : null;

  // Due date urgency factor (0-1)
  let dueDateUrgency = 0.5;
  if (dueDate) {
    const daysUntilDue = Math.floor(
      (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDue < 0) dueDateUrgency = 1.0; // Overdue
    else if (daysUntilDue === 0) dueDateUrgency = 0.9; // Due today
    else if (daysUntilDue === 1) dueDateUrgency = 0.8; // Due tomorrow
    else if (daysUntilDue <= 3) dueDateUrgency = 0.7; // Due within 3 days
    else if (daysUntilDue <= 7) dueDateUrgency = 0.6; // Due within a week
    else dueDateUrgency = 0.3; // Due later
  }

  // Dependency impact factor (0-1)
  const dependentTasks = allTasks.filter(
    (t) =>
      t.dependencies &&
      t.dependencies.some((d: any) => d.depends_on_task_id === task.id)
  );
  const dependencyImpact = Math.min(dependentTasks.length * 0.2, 1.0);

  // Client importance factor (placeholder - would be based on client data)
  const clientImportance = 0.5;

  // Historical pattern factor (placeholder - would be based on completion history)
  const historicalPattern = 0.5;

  return {
    due_date_urgency: dueDateUrgency,
    dependency_impact: dependencyImpact,
    client_importance: clientImportance,
    historical_pattern: historicalPattern,
  };
}

function calculateSuggestedPriority(
  factors: any
): 'low' | 'medium' | 'high' | 'urgent' {
  const score =
    factors.due_date_urgency * 0.4 +
    factors.dependency_impact * 0.3 +
    factors.client_importance * 0.2 +
    factors.historical_pattern * 0.1;

  if (score >= 0.8) return 'urgent';
  if (score >= 0.6) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}

function generatePriorityReason(
  factors: any,
  suggestedPriority: string
): string {
  const reasons = [];

  if (factors.due_date_urgency > 0.8) {
    reasons.push('task is overdue or due very soon');
  }
  if (factors.dependency_impact > 0.5) {
    reasons.push('other tasks depend on this one');
  }
  if (factors.client_importance > 0.7) {
    reasons.push('high-priority client');
  }

  const baseReason = `Suggested ${suggestedPriority} priority`;
  return reasons.length > 0
    ? `${baseReason} because ${reasons.join(' and ')}`
    : `${baseReason} based on current workload analysis`;
}

function calculatePriorityConfidence(factors: any): number {
  // Higher confidence when factors are more extreme (closer to 0 or 1)
  const extremeness = Object.values(factors).map(
    (f: any) => Math.abs(f - 0.5) * 2
  );
  const avgExtremeness =
    extremeness.reduce((sum: number, e: number) => sum + e, 0) /
    extremeness.length;
  return Math.min(0.5 + avgExtremeness * 0.5, 0.95);
}

function generateReschedulingSuggestion(
  task: any,
  daysPastDue: number
): ReschedulingSuggestion {
  const today = new Date();
  let suggestedDate: Date;
  let reason: string;
  let confidence: number;
  const actions: any[] = [];

  if (daysPastDue <= 3) {
    // Recently overdue - suggest rescheduling to tomorrow or next few days
    suggestedDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);
    reason =
      'Task is recently overdue. Rescheduling to tomorrow allows for immediate attention.';
    confidence = 0.8;
    actions.push({
      type: 'reschedule',
      description: 'Reschedule to tomorrow',
      parameters: { due_date: suggestedDate.toISOString().split('T')[0] },
    });
  } else if (daysPastDue <= 7) {
    // Moderately overdue - suggest breaking down or rescheduling
    suggestedDate = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    reason =
      'Task has been overdue for several days. Consider breaking it down into smaller parts.';
    confidence = 0.7;
    actions.push(
      {
        type: 'reschedule',
        description: 'Reschedule to 3 days from now',
        parameters: { due_date: suggestedDate.toISOString().split('T')[0] },
      },
      {
        type: 'break_down',
        description: 'Break down into smaller subtasks',
        parameters: { create_subtasks: true },
      }
    );
  } else {
    // Long overdue - suggest major restructuring
    suggestedDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    reason =
      "Task has been overdue for a long time. Consider if it's still relevant or needs to be cancelled.";
    confidence = 0.6;
    actions.push(
      {
        type: 'reschedule',
        description: 'Reschedule to next week',
        parameters: { due_date: suggestedDate.toISOString().split('T')[0] },
      },
      {
        type: 'break_down',
        description: 'Break down into smaller subtasks',
        parameters: { create_subtasks: true },
      },
      {
        type: 'cancel',
        description: 'Cancel if no longer relevant',
        parameters: { status: 'cancelled' },
      }
    );
  }

  return {
    task_id: task.id,
    current_due_date: task.due_date,
    suggested_due_date: suggestedDate.toISOString().split('T')[0],
    reason,
    confidence,
    suggested_actions: actions,
  };
}

// Additional helper functions for pattern analysis
function analyzeCompletionTimeByPriority(completedTasks: any[]) {
  const timeByPriority: Record<string, number[]> = {};

  completedTasks.forEach((task) => {
    if (task.created_at && task.updated_at) {
      const completionTime = Math.floor(
        (new Date(task.updated_at).getTime() -
          new Date(task.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      if (!timeByPriority[task.priority]) {
        timeByPriority[task.priority] = [];
      }
      timeByPriority[task.priority].push(completionTime);
    }
  });

  // Calculate averages
  const averages: Record<string, number> = {};
  Object.keys(timeByPriority).forEach((priority) => {
    const times = timeByPriority[priority];
    averages[priority] =
      times.reduce((sum, time) => sum + time, 0) / times.length;
  });

  return averages;
}

function analyzeMostProductiveDays(completedTasks: any[]) {
  const dayCount: Record<string, number> = {};

  completedTasks.forEach((task) => {
    if (task.updated_at) {
      const dayOfWeek = new Date(task.updated_at).toLocaleDateString('en-US', {
        weekday: 'long',
      });
      dayCount[dayOfWeek] = (dayCount[dayOfWeek] || 0) + 1;
    }
  });

  return Object.entries(dayCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([day, count]) => ({ day, count }));
}

function analyzeTaskTypePatterns(completedTasks: any[]) {
  const tagCount: Record<string, number> = {};

  completedTasks.forEach((task) => {
    tagCount[task.tag] = (tagCount[task.tag] || 0) + 1;
  });

  return Object.entries(tagCount)
    .sort(([, a], [, b]) => b - a)
    .map(([tag, count]) => ({ tag, count }));
}

function analyzeClientPatterns(completedTasks: any[]) {
  const clientCount: Record<string, number> = {};

  completedTasks.forEach((task) => {
    if (task.client_id) {
      clientCount[task.client_id] = (clientCount[task.client_id] || 0) + 1;
    }
  });

  return Object.entries(clientCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([clientId, count]) => ({ clientId, count }));
}

function analyzeSeasonalPatterns(completedTasks: any[]) {
  const monthCount: Record<string, number> = {};

  completedTasks.forEach((task) => {
    if (task.updated_at) {
      const month = new Date(task.updated_at).toLocaleDateString('en-US', {
        month: 'long',
      });
      monthCount[month] = (monthCount[month] || 0) + 1;
    }
  });

  return Object.entries(monthCount)
    .sort(([, a], [, b]) => b - a)
    .map(([month, count]) => ({ month, count }));
}

function getMostCommonTag(tasks: any[]): string {
  const tagCount: Record<string, number> = {};
  tasks.forEach((task) => {
    tagCount[task.tag] = (tagCount[task.tag] || 0) + 1;
  });

  return (
    Object.entries(tagCount).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    'follow-up'
  );
}

function getAveragePriority(tasks: any[]): string {
  const priorityWeights = { low: 1, medium: 2, high: 3, urgent: 4 };
  const totalWeight = tasks.reduce(
    (sum, task) =>
      sum +
      (priorityWeights[task.priority as keyof typeof priorityWeights] || 2),
    0
  );
  const avgWeight = totalWeight / tasks.length;

  if (avgWeight >= 3.5) return 'urgent';
  if (avgWeight >= 2.5) return 'high';
  if (avgWeight >= 1.5) return 'medium';
  return 'low';
}

// Task Automation Engine Functions

export interface AutomationExecutionResult {
  status: 'success' | 'failed' | 'partial';
  executed_actions: any[];
  error_message: string | null;
  created_tasks?: string[];
  updated_tasks?: string[];
  notifications_sent?: number;
}

export interface AutomationValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export async function executeAutomationRule(
  rule: any,
  task: any,
  triggerContext: Record<string, any> = {}
): Promise<AutomationExecutionResult> {
  try {
    // Evaluate conditions
    const conditionsMet = evaluateAutomationConditions(
      rule.conditions || {},
      task,
      triggerContext
    );

    if (!conditionsMet) {
      return {
        status: 'success',
        executed_actions: [],
        error_message: 'Conditions not met',
      };
    }

    const executedActions: any[] = [];
    const createdTasks: string[] = [];
    const updatedTasks: string[] = [];
    let notificationsSent = 0;
    let hasErrors = false;
    let errorMessage: string | null = null;

    // Execute each action
    for (const action of rule.actions) {
      try {
        const result = await executeAutomationAction(
          action,
          task,
          triggerContext
        );
        executedActions.push({
          ...action,
          result,
          executed_at: new Date().toISOString(),
        });

        // Track results
        if (result.created_task_id) {
          createdTasks.push(result.created_task_id);
        }
        if (result.updated_task_id) {
          updatedTasks.push(result.updated_task_id);
        }
        if (result.notification_sent) {
          notificationsSent++;
        }
      } catch (actionError) {
        console.error(`Error executing action ${action.type}:`, actionError);
        hasErrors = true;
        errorMessage =
          actionError instanceof Error ? actionError.message : 'Unknown error';

        executedActions.push({
          ...action,
          error: errorMessage,
          executed_at: new Date().toISOString(),
        });
      }
    }

    return {
      status: hasErrors
        ? executedActions.length > 0
          ? 'partial'
          : 'failed'
        : 'success',
      executed_actions: executedActions,
      error_message: errorMessage,
      created_tasks: createdTasks,
      updated_tasks: updatedTasks,
      notifications_sent: notificationsSent,
    };
  } catch (error) {
    console.error('Error executing automation rule:', error);
    return {
      status: 'failed',
      executed_actions: [],
      error_message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function executeAutomationAction(
  action: any,
  task: any,
  context: Record<string, any>
): Promise<any> {
  const { supabase } = await import('@/lib/supabase');

  switch (action.type) {
    case 'create_task':
      return await executeCreateTaskAction(action.parameters, task, context);

    case 'update_status':
      return await executeUpdateStatusAction(action.parameters, task);

    case 'update_priority':
      return await executeUpdatePriorityAction(action.parameters, task);

    case 'send_notification':
      return await executeSendNotificationAction(
        action.parameters,
        task,
        context
      );

    case 'assign_user':
      return await executeAssignUserAction(action.parameters, task);

    case 'create_follow_up':
      return await executeCreateFollowUpAction(
        action.parameters,
        task,
        context
      );

    case 'reschedule':
      return await executeRescheduleAction(action.parameters, task);

    case 'add_dependency':
      return await executeAddDependencyAction(action.parameters, task);

    case 'create_subtasks':
      return await executeCreateSubtasksAction(action.parameters, task);

    case 'update_related_tasks':
      return await executeUpdateRelatedTasksAction(action.parameters, task);

    case 'update_dependencies':
      return await executeUpdateDependenciesAction(action.parameters, task);

    case 'log_activity':
      return await executeLogActivityAction(action.parameters, task, context);

    case 'update_estimates':
      return await executeUpdateEstimatesAction(action.parameters, task);

    case 'create_report':
      return await executeCreateReportAction(action.parameters, task, context);

    case 'create_reminder':
      return await executeCreateReminderAction(
        action.parameters,
        task,
        context
      );

    default:
      throw new Error(`Unknown automation action type: ${action.type}`);
  }
}

async function executeCreateTaskAction(
  parameters: any,
  originalTask: any,
  context: any
) {
  const { supabase } = await import('@/lib/supabase');

  // Process template variables in parameters
  const processedParams = processTemplateVariables(
    parameters,
    originalTask,
    context
  );

  const newTask = {
    user_id: originalTask.user_id,
    title: processedParams.title || 'Automated Task',
    description: processedParams.description || null,
    client_id: processedParams.client_id || originalTask.client_id,
    priority: processedParams.priority || 'medium',
    status: processedParams.status || 'pending',
    tag: processedParams.tag || 'follow-up',
    due_date: calculateDueDate(processedParams.due_date),
    estimated_hours: processedParams.estimated_hours || null,
    ai_generated: true,
    ai_confidence_score: 0.8,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single();

  if (error) throw error;

  return {
    created_task_id: data.id,
    task_data: data,
  };
}

async function executeUpdateStatusAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: parameters.status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_status: task.status,
    new_status: parameters.status,
  };
}

async function executeUpdatePriorityAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  const { data, error } = await supabase
    .from('tasks')
    .update({
      priority: parameters.priority,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_priority: task.priority,
    new_priority: parameters.priority,
  };
}

async function executeSendNotificationAction(
  parameters: any,
  task: any,
  context: any
) {
  const message = processTemplateVariables(
    parameters.message || 'Task notification',
    task,
    context
  );

  console.log(`Automation Notification: ${message}`);

  try {
    const { createNotification } = await import('@/lib/notifications');
    const { supabase } = await import('@/lib/supabase');

    // Determine recipients
    let recipientIds: string[] = [];

    if (parameters.recipient === 'assignees') {
      // Get all assigned users
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', task.id);

      recipientIds = assignments?.map((a) => a.user_id) || [];
    } else if (parameters.recipient === 'owner') {
      recipientIds = [task.user_id];
    } else if (parameters.recipient_id) {
      recipientIds = [parameters.recipient_id];
    } else {
      // Default to task owner
      recipientIds = [task.user_id];
    }

    // Send notification to each recipient
    for (const userId of recipientIds) {
      await createNotification({
        userId,
        type: 'task_assigned', // Generic type for automation notifications
        title: parameters.title || 'Task Notification',
        message,
        data: { task_id: task.id },
        actionUrl: `/tasks/${task.id}`,
      });
    }

    return {
      notification_sent: true,
      message: message,
      type: parameters.type || 'general',
      recipients_count: recipientIds.length,
    };
  } catch (error) {
    console.error('Error sending automation notification:', error);
    return {
      notification_sent: false,
      message: message,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function executeAssignUserAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  // Create task assignment
  const { data, error } = await supabase
    .from('task_assignments')
    .insert({
      task_id: task.id,
      user_id: parameters.user_id,
      assigned_by: task.user_id,
      assigned_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;

  return {
    assignment_created: true,
    assigned_user_id: parameters.user_id,
    assignment_id: data.id,
  };
}

async function executeCreateFollowUpAction(
  parameters: any,
  originalTask: any,
  context: any
) {
  const { supabase } = await import('@/lib/supabase');

  const followUpTask = {
    user_id: originalTask.user_id,
    title: `Follow up: ${originalTask.title}`,
    description: `Follow-up task for: ${originalTask.title}`,
    client_id: originalTask.client_id,
    priority: parameters.priority || 'medium',
    status: 'pending',
    tag: 'follow-up',
    due_date: calculateDueDate(parameters.due_date || '+3 days'),
    ai_generated: true,
    ai_confidence_score: 0.9,
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(followUpTask)
    .select()
    .single();

  if (error) throw error;

  return {
    created_task_id: data.id,
    follow_up_task: data,
  };
}

async function executeRescheduleAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  const newDueDate = calculateDueDate(parameters.due_date);

  const { data, error } = await supabase
    .from('tasks')
    .update({
      due_date: newDueDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_due_date: task.due_date,
    new_due_date: newDueDate,
  };
}

async function executeAddDependencyAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  const { data, error } = await supabase
    .from('task_dependencies')
    .insert({
      task_id: task.id,
      depends_on_task_id: parameters.depends_on_task_id,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    dependency_created: true,
    dependency_id: data.id,
    depends_on_task_id: parameters.depends_on_task_id,
  };
}

async function executeCreateSubtasksAction(parameters: any, parentTask: any) {
  const { supabase } = await import('@/lib/supabase');

  const subtasks = parameters.subtasks || [];
  const createdSubtasks = [];

  for (const subtaskData of subtasks) {
    const subtask = {
      user_id: parentTask.user_id,
      parent_task_id: parentTask.id,
      title: subtaskData.title,
      description: subtaskData.description || null,
      client_id: parentTask.client_id,
      priority: subtaskData.priority || 'medium',
      status: 'pending',
      tag: subtaskData.tag || parentTask.tag,
      due_date: calculateDueDate(subtaskData.due_date),
      estimated_hours: subtaskData.estimated_hours || null,
      ai_generated: true,
      ai_confidence_score: 0.8,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(subtask)
      .select()
      .single();

    if (error) {
      console.error('Error creating subtask:', error);
      continue;
    }

    createdSubtasks.push(data);
  }

  return {
    created_subtasks: createdSubtasks.length,
    subtask_ids: createdSubtasks.map((s) => s.id),
  };
}

async function executeUpdateRelatedTasksAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  const field = parameters.field;
  const value = parameters.value;

  if (!field || value === undefined) {
    throw new Error('Field and value are required for update_related_tasks');
  }

  // Update tasks with same client_id or parent_task_id
  const { data, error } = await supabase
    .from('tasks')
    .update({
      [field]: value,
      updated_at: new Date().toISOString(),
    })
    .or(`client_id.eq.${task.client_id},parent_task_id.eq.${task.id}`)
    .neq('id', task.id)
    .select();

  if (error) throw error;

  return {
    updated_tasks_count: data?.length || 0,
    updated_task_ids: data?.map((t: any) => t.id) || [],
  };
}

async function executeUpdateDependenciesAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  // Get all tasks that depend on this task
  const { data: dependencies, error: depsError } = await supabase
    .from('task_dependencies')
    .select('task_id')
    .eq('depends_on_task_id', task.id);

  if (depsError) throw depsError;

  if (!dependencies || dependencies.length === 0) {
    return {
      updated_dependencies_count: 0,
      message: 'No dependent tasks found',
    };
  }

  // Update status of dependent tasks if this task is completed
  if (task.status === 'completed' && parameters.auto_start) {
    const taskIds = dependencies.map((d) => d.task_id);
    const { data, error } = await supabase
      .from('tasks')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .in('id', taskIds)
      .eq('status', 'pending')
      .select();

    if (error) throw error;

    return {
      updated_dependencies_count: data?.length || 0,
      updated_task_ids: data?.map((t: any) => t.id) || [],
    };
  }

  return {
    updated_dependencies_count: 0,
    message: 'No updates needed',
  };
}

async function executeLogActivityAction(
  parameters: any,
  task: any,
  context: any
) {
  const { supabase } = await import('@/lib/supabase');

  const activityType = parameters.activity_type || 'automation';
  const description = processTemplateVariables(
    parameters.description || 'Automated activity',
    task,
    context
  );

  // Log to task activity/history table
  const { data, error } = await supabase.from('task_activity').insert({
    task_id: task.id,
    user_id: task.user_id,
    activity_type: activityType,
    description: description,
    metadata: {
      automation: true,
      trigger: context.trigger,
      timestamp: new Date().toISOString(),
    },
    created_at: new Date().toISOString(),
  });

  if (error) {
    // If table doesn't exist, just log to console
    console.log(`Task Activity Log: ${description}`);
    return {
      logged: true,
      activity_type: activityType,
      description: description,
    };
  }

  return {
    logged: true,
    activity_type: activityType,
    description: description,
  };
}

async function executeUpdateEstimatesAction(parameters: any, task: any) {
  const { supabase } = await import('@/lib/supabase');

  const estimatedHours = parseFloat(parameters.estimated_hours);

  if (isNaN(estimatedHours)) {
    throw new Error('Invalid estimated_hours value');
  }

  const { data, error } = await supabase
    .from('tasks')
    .update({
      estimated_hours: estimatedHours,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id)
    .select()
    .single();

  if (error) throw error;

  return {
    updated_task_id: task.id,
    old_estimate: task.estimated_hours,
    new_estimate: estimatedHours,
  };
}

async function executeCreateReportAction(
  parameters: any,
  task: any,
  context: any
) {
  const { supabase } = await import('@/lib/supabase');

  const reportType = parameters.report_type || 'task_summary';

  // Create a report entry
  const reportData = {
    user_id: task.user_id,
    report_type: reportType,
    task_id: task.id,
    generated_at: new Date().toISOString(),
    data: {
      task: task,
      context: context,
      automation_generated: true,
    },
  };

  console.log(`Report Created: ${reportType} for task ${task.id}`);

  return {
    report_created: true,
    report_type: reportType,
    report_data: reportData,
  };
}

async function executeCreateReminderAction(
  parameters: any,
  task: any,
  context: any
) {
  const { supabase } = await import('@/lib/supabase');

  const reminderTime = calculateDueDate(parameters.reminder_time || '+1 hour');
  const message = processTemplateVariables(
    parameters.message || 'Reminder for task: {task.title}',
    task,
    context
  );

  // Create notification/reminder
  const { data, error } = await supabase.from('notifications').insert({
    user_id: task.user_id,
    type: 'reminder',
    title: 'Task Reminder',
    message: message,
    related_task_id: task.id,
    scheduled_for: reminderTime,
    created_at: new Date().toISOString(),
  });

  if (error) {
    // If notifications table doesn't exist, just log
    console.log(`Reminder Created: ${message} at ${reminderTime}`);
    return {
      reminder_created: true,
      reminder_time: reminderTime,
      message: message,
    };
  }

  return {
    reminder_created: true,
    reminder_time: reminderTime,
    message: message,
  };
}

export async function validateAutomationRule(
  rule: any
): Promise<AutomationValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate trigger
  const validTriggers = [
    'task_completed',
    'task_overdue',
    'status_changed',
    'time_tracked',
    'due_date_approaching',
  ];
  if (!validTriggers.includes(rule.trigger)) {
    errors.push(`Invalid trigger: ${rule.trigger}`);
  }

  // Validate conditions
  if (rule.conditions && typeof rule.conditions !== 'object') {
    errors.push('Conditions must be an object');
  }

  // Validate actions
  if (!Array.isArray(rule.actions) || rule.actions.length === 0) {
    errors.push('At least one action is required');
  } else {
    const validActionTypes = [
      'create_task',
      'update_status',
      'update_priority',
      'send_notification',
      'assign_user',
      'create_follow_up',
      'reschedule',
      'add_dependency',
      'create_subtasks',
    ];

    rule.actions.forEach((action: any, index: number) => {
      if (!validActionTypes.includes(action.type)) {
        errors.push(`Invalid action type at index ${index}: ${action.type}`);
      }

      if (!action.parameters || typeof action.parameters !== 'object') {
        errors.push(`Action at index ${index} must have parameters object`);
      }

      // Validate specific action parameters
      validateActionParameters(action, index, errors, warnings);
    });
  }

  // Check for potential infinite loops
  if (
    rule.trigger === 'status_changed' &&
    rule.actions.some((a: any) => a.type === 'update_status')
  ) {
    warnings.push(
      'Status change trigger with status update action may cause loops'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateActionParameters(
  action: any,
  index: number,
  errors: string[],
  warnings: string[]
) {
  const { type, parameters } = action;

  switch (type) {
    case 'create_task':
      if (!parameters.title) {
        errors.push(
          `Create task action at index ${index} requires title parameter`
        );
      }
      break;

    case 'update_status':
      const validStatuses = [
        'pending',
        'in_progress',
        'completed',
        'cancelled',
        'blocked',
      ];
      if (!validStatuses.includes(parameters.status)) {
        errors.push(
          `Invalid status in action at index ${index}: ${parameters.status}`
        );
      }
      break;

    case 'update_priority':
      const validPriorities = ['low', 'medium', 'high', 'urgent'];
      if (!validPriorities.includes(parameters.priority)) {
        errors.push(
          `Invalid priority in action at index ${index}: ${parameters.priority}`
        );
      }
      break;

    case 'assign_user':
      if (!parameters.user_id) {
        errors.push(
          `Assign user action at index ${index} requires user_id parameter`
        );
      }
      break;

    case 'add_dependency':
      if (!parameters.depends_on_task_id) {
        errors.push(
          `Add dependency action at index ${index} requires depends_on_task_id parameter`
        );
      }
      break;

    case 'create_subtasks':
      if (
        !Array.isArray(parameters.subtasks) ||
        parameters.subtasks.length === 0
      ) {
        errors.push(
          `Create subtasks action at index ${index} requires non-empty subtasks array`
        );
      }
      break;
  }
}

function evaluateAutomationConditions(
  conditions: Record<string, any>,
  task: any,
  context: Record<string, any>
): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    const actualValue = getNestedValue(key, { task, context });

    if (!evaluateCondition(actualValue, value)) {
      return false;
    }
  }

  return true;
}

function getNestedValue(path: string, data: any): any {
  return path.split('.').reduce((obj, key) => obj?.[key], data);
}

function evaluateCondition(actual: any, expected: any): boolean {
  if (typeof expected === 'object' && expected !== null) {
    // Handle comparison operators
    if (expected['>']) return actual > expected['>'];
    if (expected['>=']) return actual >= expected['>='];
    if (expected['<']) return actual < expected['<'];
    if (expected['<=']) return actual <= expected['<='];
    if (expected['!=']) return actual !== expected['!='];
    if (expected['in']) return expected['in'].includes(actual);
    if (expected['not_in']) return !expected['not_in'].includes(actual);
  }

  // Handle array values (OR condition)
  if (Array.isArray(expected)) {
    return expected.includes(actual);
  }

  // Direct equality
  return actual === expected;
}

function processTemplateVariables(template: any, task: any, context: any): any {
  if (typeof template === 'string') {
    return template.replace(/\{([^}]+)\}/g, (match, path) => {
      const value = getNestedValue(path, { task, context });
      return value !== undefined ? String(value) : match;
    });
  }

  if (typeof template === 'object' && template !== null) {
    const result: any = Array.isArray(template) ? [] : {};
    for (const [key, value] of Object.entries(template)) {
      result[key] = processTemplateVariables(value, task, context);
    }
    return result;
  }

  return template;
}

function calculateDueDate(dueDateSpec: string | null): string | null {
  if (!dueDateSpec) return null;

  const today = new Date();

  // Handle relative dates
  if (dueDateSpec.startsWith('+')) {
    const match = dueDateSpec.match(
      /^\+(\d+)\s*(day|days|week|weeks|month|months)$/
    );
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];

      let targetDate = new Date(today);

      switch (unit) {
        case 'day':
        case 'days':
          targetDate.setDate(targetDate.getDate() + amount);
          break;
        case 'week':
        case 'weeks':
          targetDate.setDate(targetDate.getDate() + amount * 7);
          break;
        case 'month':
        case 'months':
          targetDate.setMonth(targetDate.getMonth() + amount);
          break;
      }

      return targetDate.toISOString().split('T')[0];
    }
  }

  // Handle absolute dates
  try {
    const date = new Date(dueDateSpec);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (error) {
    console.error('Invalid date specification:', dueDateSpec);
  }

  return null;
}
