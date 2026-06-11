import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

// Configuration for Microsoft Foundry / Azure AI Serverless
const rawEndpoint = env.AZURE_OPENAI_ENDPOINT || 'https://mock-foundry.endpoint/v1';
let baseURL = rawEndpoint.endsWith('/') ? rawEndpoint.slice(0, -1) : rawEndpoint;

// Normalize Azure AI Foundry project endpoint to standard OpenAI-compatible endpoint
if (baseURL.includes('services.ai.azure.com')) {
    if (baseURL.includes('/api/projects/')) {
        baseURL = baseURL.replace(/\/api\/projects\/[^/]+/, '/openai/v1');
    } else if (!baseURL.endsWith('/openai/v1')) {
        baseURL = `${baseURL}/openai/v1`;
    }
}

// Automatically determine if we need Azure-specific parameters based on the URL
const isClassicAzure = baseURL.includes('openai.azure.com');
const isFoundryGateway = baseURL.includes('services.ai.azure.com');

const defaultQuery = {};
const defaultHeaders = {};

if (isClassicAzure) {
    // Azure OpenAI requires api-version and api-key
    defaultQuery['api-version'] = env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
    defaultHeaders['api-key'] = env.AZURE_OPENAI_KEY || 'mock-key';
} else if (isFoundryGateway) {
    // Azure AI Foundry project OpenAI gateway requires api-key but must not have api-version query parameter
    defaultHeaders['api-key'] = env.AZURE_OPENAI_KEY || 'mock-key';
}

const openai = new OpenAI({
    apiKey: env.AZURE_OPENAI_KEY || 'mock-key', // Standard SDK uses Authorization: Bearer
    baseURL: baseURL,
    defaultQuery: Object.keys(defaultQuery).length > 0 ? defaultQuery : undefined,
    defaultHeaders: Object.keys(defaultHeaders).length > 0 ? defaultHeaders : undefined
});

const DEPLOYMENT_NAME = env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4-turbo';

/**
 * EcoRoute Reasoning Agent
 * Executes a 5-step Chain-of-Thought (CoT) reasoning loop for logistical outdoor planning.
 */
export function extractStreamingReasoning(accumulatedJson) {
    const thinkingMatch = accumulatedJson.match(/"thinking"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/);
    if (thinkingMatch) {
        return thinkingMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    const disclaimerMatch = accumulatedJson.match(/"disclaimer"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/);
    if (disclaimerMatch) {
        return disclaimerMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
    if (accumulatedJson.trim().startsWith('{')) {
        return "Analyzing route parameters...";
    }
    return accumulatedJson;
}

export function parsePhi4Response(rawOutput) {
    const thinkMatch = rawOutput.match(/<think>([\s\S]*?)<\/think>/);
    let reasoningTrace = '';
    let jsonString = rawOutput;

    if (thinkMatch) {
        reasoningTrace = thinkMatch[1].trim();
        // Remove the <think> block to isolate the final payload
        jsonString = rawOutput.replace(/<think>[\s\S]*?<\/think>/, '').trim();
    }

    // Strip markdown formatting if the model wraps the JSON in ```json ... ```
    jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();

    let finalPayload = null;
    try {
        let parsed = JSON.parse(jsonString);
        
        // Find nested schema if it is wrapped in safety monologue keys
        const nestedSchema = findNestedSchema(parsed);
        if (nestedSchema) {
            parsed = nestedSchema;
        }

        if (parsed) {
            // Fallback for reasoning trace
            if (!reasoningTrace) {
                reasoningTrace = parsed.thinking || parsed.disclaimer || '';
            }

            // Normalize status
            if (parsed.status && parsed.status.toLowerCase() === 'ok') {
                parsed.status = 'success';
            }

            // Normalize environment
            if (parsed.environment && typeof parsed.environment === 'string') {
                parsed.environment = {
                    shadeCoverage: parsed.environment,
                    temperature: '75°F'
                };
            } else if (!parsed.environment) {
                parsed.environment = {
                    shadeCoverage: 'Shaded path',
                    temperature: '75°F'
                };
            }

            // Normalize pois
            if (Array.isArray(parsed.pois)) {
                parsed.pois = parsed.pois.map(poi => {
                    if (poi && typeof poi === 'object') {
                        if (!poi.desc && poi.name) {
                            poi.desc = poi.name;
                        }
                        if (!poi.type) {
                            poi.type = 'landmark';
                        }
                    }
                    return poi;
                });
            }

            finalPayload = parsed;
        }
    } catch (e) {
        console.error("Failed to parse Phi-4 JSON payload:", e);
    }

    return { reasoningTrace, finalPayload };
}

function findNestedSchema(obj) {
    if (!obj || typeof obj !== 'object') return null;
    if ('route' in obj && ('status' in obj || 'explanation' in obj)) {
        return obj;
    }
    for (const key of Object.keys(obj)) {
        const value = obj[key];
        if (value && typeof value === 'object') {
            const result = findNestedSchema(value);
            if (result) return result;
        }
    }
    return null;
}

const SYSTEM_MESSAGE = `
You are EcoRoute, an expert multi-variable logistical outdoor planner. 
You must solve interwoven constraints for local exploration tasks. 
For every user request, you must output ONLY a valid JSON object matching the exact structure below.
Do NOT wrap the response in markdown blocks, do NOT write \`\`\`json, and do NOT output any conversational text outside the JSON.

The JSON MUST match this exact schema structure:
{
  "disclaimer": "Your safety disclaimer or advisory note here.",
  "thinking": "Your short 2-3 sentence planning/reasoning trace.",
  "status": "success",
  "explanation": "A 2-paragraph natural language summary of why this route was chosen, including shade and POI reasoning.",
  "route": {
    "total_distance": number,
    "path": [
      {
        "lat": number,
        "lng": number,
        "desc": "Point description."
      }
    ]
  },
  "environment": {
    "shadeCoverage": "High/Medium/Low shade coverage",
    "temperature": "Temperature details"
  },
  "pois": [
    {
      "type": "landmark/wildlife/facility",
      "desc": "POI description",
      "lat": number,
      "lng": number
    }
  ]
}
`;

/**
 * EcoRoute Reasoning Agent powered by Phi-4
 */
export async function planEcoRoute(userPrompt, onStreamUpdate) {
    try {
        console.log("[PlanEcoRoute] Starting. BaseURL:", baseURL);
        console.log("[PlanEcoRoute] Deployment/Model:", DEPLOYMENT_NAME);
        console.log("[PlanEcoRoute] API Key Length:", openai.apiKey ? openai.apiKey.length : 0);
        console.log("[PlanEcoRoute] Prompt Preview:", userPrompt.slice(0, 100));

        const reinforcedPrompt = `${userPrompt}\n\nRespond using the exact JSON schema provided, containing disclaimer, thinking, status, explanation, route (with total_distance and path array of lat/lng/desc objects), environment, and pois fields. Do not omit any fields. All fields in the schema are mandatory.`;

        // Enable streaming in Netlify serverless environment to prevent gateway timeouts on long reasoning runs
        const useStreaming = typeof onStreamUpdate === 'function';

        if (useStreaming) {
            console.log("[PlanEcoRoute] Executing in STREAMING mode.");
            const stream = await openai.chat.completions.create({
                model: DEPLOYMENT_NAME,
                messages: [
                    { role: 'system', content: SYSTEM_MESSAGE },
                    { role: 'user', content: reinforcedPrompt }
                ],
                stream: true,
                response_format: { type: 'json_object' }
            });

            console.log("[PlanEcoRoute] Chat completion stream successfully initialized.");

            let rawOutput = '';
            let chunkCount = 0;
            for await (const chunk of stream) {
                chunkCount++;
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    rawOutput += content;
                    if (onStreamUpdate) {
                        const cleanStream = extractStreamingReasoning(rawOutput);
                        onStreamUpdate(cleanStream);
                    }
                }
            }
            
            console.log(`[PlanEcoRoute] Stream completed. Received ${chunkCount} chunks. Total length: ${rawOutput.length}`);
            const parsed = parsePhi4Response(rawOutput);
            console.log("[PlanEcoRoute] Parsing finished. Trace length:", parsed.reasoningTrace.length);
            return parsed;
        } else {
            console.log("[PlanEcoRoute] Executing in NON-STREAMING mode.");
            const completion = await openai.chat.completions.create({
                model: DEPLOYMENT_NAME,
                messages: [
                    { role: 'system', content: SYSTEM_MESSAGE },
                    { role: 'user', content: reinforcedPrompt }
                ],
                stream: false,
                response_format: { type: 'json_object' }
            });

            const rawOutput = completion.choices[0]?.message?.content || '';
            console.log("[PlanEcoRoute] Non-stream completion successful. Total length:", rawOutput.length);
            const parsed = parsePhi4Response(rawOutput);
            console.log("[PlanEcoRoute] Parsing finished. Trace length:", parsed.reasoningTrace.length);
            return parsed;
        }
    } catch (error) {
        console.error("[PlanEcoRoute] Error calling Azure OpenAI Phi-4:", error);
        throw error;
    }
}
