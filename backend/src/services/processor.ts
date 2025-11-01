import { getLLMResponse, estimateCost } from './llm.js';
import { noteQueries } from '../database.js';
import { randomUUID } from 'crypto';

// Supported process types
export type ProcessType = 'research' | 'summarize' | 'expand' | 'actionplan';

// Prompt templates for different process types
const PROCESS_PROMPTS: Record<ProcessType, (content: string) => string> = {
  research: (noteContent: string) => `
You are a research assistant helping a user understand a topic better.

The user has saved this note:

${noteContent}

Your task is to research this topic and create a comprehensive summary. Include:

1. **Key Concepts**: Explain the main ideas in simple terms
2. **Important Context**: Provide relevant background information
3. **Recent Developments**: Mention any recent advancements or changes (if applicable)
4. **Related Topics**: Suggest 2-3 related areas worth exploring
5. **Reliable Sources**: List 3-5 credible sources for further reading

Format your response using clear markdown with headers, bullet points, and emphasis where appropriate.
Keep your response informative but concise (aim for 300-500 words).
  `.trim(),

  summarize: (noteContent: string) => `
You are a summarization expert.

The user has provided this content to summarize:

${noteContent}

Create a concise summary that:
- Captures the main points and key takeaways
- Is written in clear, accessible language
- Maintains the original intent and important details
- Is structured with bullet points or short paragraphs

Aim for 2-3 paragraphs or 5-7 bullet points maximum.
  `.trim(),

  expand: (noteContent: string) => `
You are a creative thinking assistant.

The user wrote this brief note:

${noteContent}

Your task is to expand on this idea by providing:

1. **Deeper Explanation**: Elaborate on the concept in more detail
2. **Examples & Use Cases**: Provide concrete examples or scenarios
3. **Different Perspectives**: Consider alternative viewpoints or approaches
4. **Implications**: Discuss potential outcomes or consequences
5. **Questions to Consider**: Pose 3-5 thought-provoking questions

Use clear markdown formatting with headers and lists.
Aim for 400-600 words with substantive insights.
  `.trim(),

  actionplan: (noteContent: string) => `
You are a productivity coach helping to turn ideas into action.

The user has this note:

${noteContent}

Create a practical, actionable plan that includes:

1. **Goal Clarification**: Clearly state what the user wants to achieve
2. **Action Steps**: List 5-8 specific, concrete steps in order
   - Each step should be actionable and clear
   - Include estimated time/effort (e.g., "30 min", "2 hours", "1 week")
3. **Prerequisites**: List any required resources, skills, or dependencies
4. **Success Criteria**: Define what "done" looks like
5. **Potential Obstacles**: Identify 2-3 challenges and how to overcome them

Format as markdown with numbered lists and clear sections.
Be specific and practical - avoid vague advice.
  `.trim(),
};

/**
 * Extract plain text content from Tiptap JSON structure
 */
function extractTextFromTiptap(doc: any): string {
  let text = '';

  function traverse(node: any): void {
    if (node.text) {
      text += node.text;
    }
    if (node.content) {
      node.content.forEach((child: any) => {
        traverse(child);
        // Add spacing between blocks
        if (child.type === 'paragraph' || child.type === 'heading') {
          text += '\n';
        }
      });
    }
  }

  traverse(doc);
  return text.trim();
}

/**
 * Convert markdown text to Tiptap JSON structure
 * This is a simplified converter - for production, use a proper markdown parser
 */
function markdownToTiptap(markdown: string): any {
  const lines = markdown.split('\n');
  const content: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip empty lines
    if (!line.trim()) {
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
      content.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: line.substring(2) }],
      });
    } else if (line.startsWith('## ')) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.substring(3) }],
      });
    } else if (line.startsWith('### ')) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.substring(4) }],
      });
    }
    // Bullet points
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Collect consecutive list items
      const listItems: any[] = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: lines[i].substring(2) }],
            },
          ],
        });
        i++;
      }
      i--; // Back up one line

      content.push({
        type: 'bulletList',
        content: listItems,
      });
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line)) {
      const listItems: any[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const text = lines[i].replace(/^\d+\.\s/, '');
        listItems.push({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text }],
            },
          ],
        });
        i++;
      }
      i--;

      content.push({
        type: 'orderedList',
        content: listItems,
      });
    }
    // Regular paragraphs
    else {
      content.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      });
    }
  }

  return {
    type: 'doc',
    content,
  };
}

/**
 * Process a note with AI using the specified process type
 * Creates a child note with the AI-generated content
 */
export async function processNote(
  noteId: string,
  processType: ProcessType
): Promise<string> {
  console.log(`Processing note ${noteId} with type: ${processType}`);

  // Validate process type
  if (!PROCESS_PROMPTS[processType]) {
    throw new Error(`Invalid process type: ${processType}`);
  }

  // Get the note from database
  const note = await noteQueries.getById(noteId);
  if (!note) {
    throw new Error(`Note not found: ${noteId}`);
  }

  // Extract text content from Tiptap JSON
  const textContent = extractTextFromTiptap(note.content);

  if (!textContent.trim()) {
    throw new Error('Note has no content to process');
  }

  console.log(`Extracted ${textContent.length} characters of text content`);

  // Generate the prompt
  const prompt = PROCESS_PROMPTS[processType](textContent);

  // Call LLM (real or mock based on environment)
  const result = await getLLMResponse(prompt, {
    maxTokens: 4096,
    temperature: 0.7,
  });

  console.log(`AI generated ${result.content.length} characters of content`);
  console.log(`Tokens used: ${result.tokensUsed.total}`);
  console.log(`Estimated cost: $${estimateCost(result.tokensUsed.input, result.tokensUsed.output).toFixed(4)}`);

  // Convert markdown response to Tiptap JSON
  const aiContent = markdownToTiptap(result.content);

  // Create a new child note with the AI response
  const childNote = await noteQueries.create(
    noteId, // parent_id
    'ai', // type
    aiContent, // content
    processType, // process_type
    'complete' // status
  );

  console.log(`✓ Created AI child note: ${childNote.id}`);

  return childNote.id;
}

/**
 * Get available process types
 */
export function getAvailableProcesses(): Array<{
  type: ProcessType;
  name: string;
  description: string;
}> {
  return [
    {
      type: 'research',
      name: 'Research & Expand',
      description: 'Get comprehensive research on this topic with key concepts, context, and sources',
    },
    {
      type: 'summarize',
      name: 'Summarize',
      description: 'Create a concise summary of the main points and key takeaways',
    },
    {
      type: 'expand',
      name: 'Expand Ideas',
      description: 'Elaborate on this idea with examples, perspectives, and implications',
    },
    {
      type: 'actionplan',
      name: 'Action Plan',
      description: 'Turn this into a practical action plan with specific steps',
    },
  ];
}
