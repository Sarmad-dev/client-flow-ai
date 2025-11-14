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
    const currentHour = currentDate.getHours();

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
