import Anthropic from '@anthropic-ai/sdk';

// Initialize the Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Type for LLM result
export interface LLMResult {
  content: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
}

/**
 * Call Claude API with a prompt and return the response
 * @param prompt - The user prompt to send to Claude
 * @param options - Optional configuration for the API call
 */
export async function callClaude(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<LLMResult> {
  const {
    model = 'claude-sonnet-4-20250514',
    maxTokens = 4096,
    temperature = 1.0,
    systemPrompt,
  } = options || {};

  try {
    console.log('Calling Claude API...');

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    const requestParams: Anthropic.MessageCreateParams = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages,
    };

    // Add system prompt if provided
    if (systemPrompt) {
      requestParams.system = systemPrompt;
    }

    const response = await client.messages.create(requestParams);

    // Extract text content from the response
    const textContent = response.content.find((c) => c.type === 'text');

    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Claude response');
    }

    const result: LLMResult = {
      content: textContent.text,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
    };

    console.log(
      `✓ Claude API call successful (${result.tokensUsed.total} tokens)`
    );

    return result;
  } catch (error: any) {
    console.error('Error calling Claude API:', error.message);
    throw new Error(`Claude API error: ${error.message}`);
  }
}

/**
 * Stream Claude API responses (for future implementation)
 * This is a placeholder for streaming support
 */
export async function callClaudeStream(
  prompt: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  // TODO: Implement streaming for real-time response updates
  // For POC, we'll use the non-streaming version
  const result = await callClaude(prompt);
  onChunk(result.content);
}

/**
 * Estimate token count for cost calculation
 * This is a rough estimate (4 chars ≈ 1 token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate estimated cost for a Claude API call
 * Prices are approximate based on Claude Sonnet 4 pricing
 */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const INPUT_COST_PER_MILLION = 3.0; // $3 per million input tokens
  const OUTPUT_COST_PER_MILLION = 15.0; // $15 per million output tokens

  const inputCost = (inputTokens / 1_000_000) * INPUT_COST_PER_MILLION;
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_COST_PER_MILLION;

  return inputCost + outputCost;
}

/**
 * Get LLM call function - returns real or mock based on environment
 */
export async function getLLMResponse(
  prompt: string,
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }
): Promise<LLMResult> {
  const useMock = process.env.USE_MOCK_LLM === 'true';

  if (useMock) {
    console.log('🧪 Using mock LLM service');
    const { callClaudeMock } = await import('./llm-mock.js');
    return callClaudeMock(prompt);
  }

  return callClaude(prompt, options);
}
