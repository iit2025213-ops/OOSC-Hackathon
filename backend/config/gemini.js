import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI SDK once
let genAIInstance = null;

export const getGenAI = () => {
  if (!genAIInstance) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in the environment.');
    }
    genAIInstance = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAIInstance;
};

/**
 * Returns a configured Gemini model instance.
 * @param {Object} options Options object
 * @param {string} [options.model] Specific model override
 * @param {Array} [options.tools] Array of tools (e.g. googleSearchRetrieval)
 * @returns {Object} Configured GenerativeModel
 */
export const getGeminiModel = (options = {}) => {
  const genAI = getGenAI();
  
  // Use explicitly provided model, or fallback to the centralized environment variable, 
  // or use the sensible default for general tasks.
  const modelName = options.model || process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  
  const config = { model: modelName };
  
  if (options.tools) {
    config.tools = options.tools;
  }
  
  return genAI.getGenerativeModel(config);
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Robustly handles Gemini AI calls, catching unsupported model (404) errors cleanly
 * and applying exponential backoff for 429 and 503 errors.
 * @param {Object} model The configured GenerativeModel
 * @param {string} prompt The prompt string
 * @param {number} maxRetries Maximum number of retries for rate limits
 * @returns {Promise<string>} The response text
 */
export const generateContentSafe = async (model, prompt, maxRetries = 3) => {
  let attempt = 0;
  const backoffDelays = [1000, 2000, 4000]; // 1s, 2s, 4s

  while (attempt <= maxRetries) {
    try {
      const aiRes = await model.generateContent(prompt);
      return aiRes.response.text().trim();
    } catch (error) {
      const is404 = error.status === 404 || (error.message && error.message.includes('404 Not Found'));
      const is429 = error.status === 429 || (error.message && error.message.includes('429 Too Many Requests'));
      const is503 = error.status === 503 || (error.message && error.message.includes('503 Service Unavailable'));
      const isQuotaExceeded = error.message && error.message.includes('quota');

      if (is404) {
        console.error(`[Gemini] Model unavailable: ${model.model}. Please check if the model is supported in your SDK version.`);
        const customErr = new Error('AI Model currently unavailable.');
        customErr.code = 'AI_MODEL_UNAVAILABLE';
        customErr.status = 404;
        throw customErr;
      }

      if ((is429 || is503 || isQuotaExceeded) && attempt < maxRetries) {
        const delayMs = backoffDelays[attempt] || 4000;
        console.warn(`[Gemini] Temporary failure (${is429 ? '429' : '503'}). Retrying in ${delayMs}ms (Attempt ${attempt + 1} of ${maxRetries})...`);
        await delay(delayMs);
        attempt++;
        continue;
      }

      console.error(`[Gemini] Persistent failure after ${attempt} attempts:`, error.message || error);
      const customErr = new Error('AI service temporarily unavailable. Please try again in a moment.');
      customErr.code = 'AI_SERVICE_UNAVAILABLE';
      customErr.status = (is429 || isQuotaExceeded) ? 429 : (is503 ? 503 : 500);
      throw customErr;
    }
  }
};
