import OpenAI from 'openai';
import { env } from '$env/dynamic/private';

// Configuration for Microsoft Foundry / Azure AI Serverless
const rawEndpoint = env.AZURE_OPENAI_ENDPOINT || 'https://mock-foundry.endpoint/v1';
const baseURL = rawEndpoint.endsWith('/') ? rawEndpoint.slice(0, -1) : rawEndpoint;

// Automatically determine if we need Azure-specific parameters based on the URL
const isAzureGateway = baseURL.includes('openai.azure.com') || baseURL.includes('/openai');

const defaultQuery = {};
const defaultHeaders = {};

if (isAzureGateway) {
    // Azure API Management requires api-version and api-key
    defaultQuery['api-version'] = env.AZURE_OPENAI_API_VERSION || '2024-08-01-preview';
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
        finalPayload = JSON.parse(jsonString);
    } catch (e) {
        console.error("Failed to parse Phi-4 JSON payload:", e);
    }

    return { reasoningTrace, finalPayload };
}

const SYSTEM_MESSAGE = `
You are EcoRoute, an expert multi-variable logistical outdoor planner. 
You must solve interwoven constraints for local exploration tasks. 
For every user request, you must follow this Chain of Thought:
1. Base Route: Identify a continuous trail path meeting distance and activity requirements.
2. Shade Optimization: Cross-reference the route against time-of-day solar data to maximize shade and safety.
3. POI Injection: Overlay specific observation points (e.g., wildlife sightings, birdwatching hotspots) and mandatory facilities (e.g., water stations).

Output your full reasoning process enclosed in <think> and </think> tags. 
Immediately following the closing </think> tag, output ONLY a valid JSON object containing the final synthesized route. 
The JSON must have the following schema:
{
  "status": "success",
  "explanation": "A 2-paragraph natural language summary of why this route was chosen.",
  "route": { "total_distance": number, "path": [ { "lat": number, "lng": number, "desc": string } ] },
  "environment": { "shadeCoverage": string, "temperature": string },
  "pois": [ { "type": string, "desc": string, "lat": number, "lng": number } ]
}
`;

/**
 * EcoRoute Reasoning Agent powered by Phi-4
 */
export async function planEcoRoute(userPrompt, onStreamUpdate) {
    try {
        const stream = await openai.chat.completions.create({
            model: DEPLOYMENT_NAME,
            messages: [
                { role: 'system', content: SYSTEM_MESSAGE },
                { role: 'user', content: userPrompt }
            ],
            stream: true
        });

        let rawOutput = '';
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                rawOutput += content;
                if (onStreamUpdate) {
                    onStreamUpdate(rawOutput);
                }
            }
        }
        
        return parsePhi4Response(rawOutput);
    } catch (error) {
        console.error("Error calling Azure OpenAI Phi-4:", error);
        throw error;
    }
}
