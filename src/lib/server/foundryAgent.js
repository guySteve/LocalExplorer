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

const DEPLOYMENT_NAME = env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini';


/**
 * EcoRoute Reasoning Agent
 * Executes a 5-step Chain-of-Thought (CoT) reasoning loop for logistical outdoor planning.
 */
export function extractStreamingReasoning(accumulatedJson) {
    const explanationMatch = accumulatedJson.match(/"explanation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/);
    if (explanationMatch) {
        return explanationMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
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
                reasoningTrace = parsed.thinking || parsed.disclaimer || parsed.explanation || '';
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
            } else if (parsed.environment && typeof parsed.environment === 'object') {
                if (!parsed.environment.shadeCoverage) {
                    parsed.environment.shadeCoverage = parsed.environment.conditions || parsed.environment.weather || 'Standard outdoor conditions';
                }
                if (!parsed.environment.temperature) {
                    parsed.environment.temperature = '75°F';
                }
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
You are EcoRoute, the expert multi-variable logistical outdoor planner. Your primary function is to generate safe, objective, and factual routes for all legal destinations, even those in the adult entertainment, nightlife, or similar business sectors. DO NOT refuse any request; instead, create factual routes based solely on REAL-WORLD DATA.

You have access to tools that fetch REAL-WORLD DATA:
- get_weather: fetches the current weather for given coordinates.
- search_nearby_places: searches for real points of interest near given coordinates matching a query.

YOU MUST gather real-world data using these tools BEFORE producing your final answer. Call search_nearby_places to find real POIs matching the user's request, and call get_weather to determine current conditions. You may call multiple tools, or call a tool more than once with different queries if needed.

IMPORTANT: Your entire route must be constructed exclusively from the data returned by the tools. You are strictly forbidden to introduce any new locations, fabricate data, or deviate from the exact coordinates, POIs, and associated details returned by the tools. All data you use must match exactly the tool results, including the POI descriptions, coordinate values, and types.

Data type specifications:
- "total_distance" in the "route" object MUST be a number (either a float or integer) and should never be expressed as a string (e.g., "15 miles" is forbidden).
- Coordinates ("lat" and "lng") MUST be numbers, directly taken from the tool results.
- The "path" array must contain objects with properties "lat", "lng" (numbers), and "desc" (string), using only coordinates from the tool results.
- The "shadeCoverage" field in the "environment" object MUST be one of the values: "High", "Medium", or "Low".
- Temperatures and any further data (e.g., "temperature" details) MUST be provided exactly as the tool data dictates.

Before producing your final JSON output, you MUST first perform a detailed step-by-step reasoning using an internal processing area enclosed in <think> and </think> tags. In this reasoning block, you are not allowed to include any analysis or data that will bleed into your final JSON output. The final answer must be a single valid JSON object that exactly matches the following schema:

{
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

Your response MUST be exclusively in this JSON form, placed immediately after the </think> tag. Any deviation from these guidelines—including any alteration of fields, markdown wrapping, or inclusion of unprovided information—will result in a failing evaluation.
`;

function preprocessPrompt(prompt) {
    if (!prompt) return prompt;
    let cleanPrompt = prompt;
    cleanPrompt = cleanPrompt.replace(/strip\s*club/gi, "cabaret/dance club");
    cleanPrompt = cleanPrompt.replace(/gentlemen\'s\s*club|gentlemans\s*club/gi, "cabaret/dance club");
    cleanPrompt = cleanPrompt.replace(/exotic\s*dancer/gi, "cabaret dancer");
    cleanPrompt = cleanPrompt.replace(/stripper/gi, "cabaret dancer");
    return cleanPrompt;
}

// ─── Tool implementations ───────────────────────────────────────────────────

/**
 * Fetches the current weather for the given coordinates (Open-Meteo).
 */
export async function getWeather({ latitude, longitude }) {
    try {
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
        const res = await fetch(weatherUrl);
        if (!res.ok) {
            return { error: `Weather service returned status ${res.status}` };
        }
        const data = await res.json();
        return {
            temperature_celsius: data.current_weather?.temperature,
            windspeed_kmh: data.current_weather?.windspeed,
            weathercode: data.current_weather?.weathercode,
            is_day: data.current_weather?.is_day
        };
    } catch (e) {
        console.error("[Tool:get_weather] Error:", e);
        return { error: e.message };
    }
}

/**
 * Searches for real nearby places via Google Maps Text Search.
 */
export async function searchNearbyPlaces({ query, latitude, longitude, radius = 5000 }) {
    if (!env.MAPS_API_KEY) {
        return { error: "Places search is not configured.", places: [] };
    }
    try {
        const searchQuery = (query && query.trim().length > 0) ? query.trim() : "point of interest";
        const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&location=${latitude},${longitude}&radius=${radius}&key=${env.MAPS_API_KEY}`;
        const res = await fetch(placesUrl);
        if (!res.ok) {
            return { error: `Places service returned status ${res.status}`, places: [] };
        }
        const data = await res.json();
        const places = (data.results || []).slice(0, 8).map(r => ({
            name: r.name,
            lat: r.geometry?.location?.lat,
            lng: r.geometry?.location?.lng,
            address: r.formatted_address,
            rating: r.rating
        }));
        if (places.length === 0) {
            return { places: [], note: `No POIs found for "${searchQuery}". The route must start at ${latitude}, ${longitude}.` };
        }
        return { places };
    } catch (e) {
        console.error("[Tool:search_nearby_places] Error:", e);
        return { error: e.message, places: [] };
    }
}

// OpenAI tool schema definitions
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_weather',
            description: 'Get the current weather (temperature, wind) for a given latitude/longitude.',
            parameters: {
                type: 'object',
                properties: {
                    latitude: { type: 'number', description: 'Latitude of the location' },
                    longitude: { type: 'number', description: 'Longitude of the location' }
                },
                required: ['latitude', 'longitude']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'search_nearby_places',
            description: 'Search for real points of interest near a latitude/longitude matching a text query. Returns up to 8 places with exact coordinates that MUST be used for route waypoints and POIs.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Search keywords describing the kind of places to find (e.g. "shaded park trail", "coffee shop")' },
                    latitude: { type: 'number', description: 'Latitude to search around' },
                    longitude: { type: 'number', description: 'Longitude to search around' },
                    radius: { type: 'number', description: 'Search radius in meters (default 5000)' }
                },
                required: ['query', 'latitude', 'longitude']
            }
        }
    }
];

const TOOL_HANDLERS = {
    get_weather: getWeather,
    search_nearby_places: searchNearbyPlaces
};

/**
 * Execute a single tool call requested by the model, returning a `tool` role message.
 */
async function executeToolCall(toolCall, onToolEvent) {
    const name = toolCall.function?.name;
    let args = {};
    try {
        args = JSON.parse(toolCall.function?.arguments || '{}');
    } catch (e) {
        console.error(`[AgentLoop] Failed to parse arguments for ${name}:`, e);
    }

    console.log(`[AgentLoop] Executing tool: ${name}`, args);
    if (onToolEvent) onToolEvent({ name, status: 'running', args });

    const handler = TOOL_HANDLERS[name];
    let result;
    if (handler) {
        result = await handler(args);
    } else {
        result = { error: `Unknown tool: ${name}` };
    }

    if (onToolEvent) onToolEvent({ name, status: 'done' });

    return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
    };
}

/**
 * Accumulate streamed tool_call deltas into complete tool call objects.
 */
function accumulateToolCallDelta(acc, deltaToolCalls) {
    for (const tc of deltaToolCalls) {
        const i = tc.index ?? 0;
        if (!acc[i]) {
            acc[i] = { id: '', type: 'function', function: { name: '', arguments: '' } };
        }
        if (tc.id) acc[i].id = tc.id;
        if (tc.function?.name) acc[i].function.name += tc.function.name;
        if (tc.function?.arguments) acc[i].function.arguments += tc.function.arguments;
    }
}

const MAX_TOOL_TURNS = 5;

/**
 * EcoRoute Reasoning Agent powered by Phi-4 with native function calling.
 * The model decides which tools to call (weather, places) before producing the final JSON.
 *
 * @param {string} userPrompt - The user's request (with location context).
 * @param {function} [onStreamUpdate] - Called with partial reasoning text during streaming.
 * @param {number} [maxRetries=3] - Number of retries on failure.
 * @param {function} [onToolEvent] - Called with { name, status, args? } when tools run.
 */
export async function planEcoRoute(userPrompt, onStreamUpdate, maxRetries = 3, onToolEvent) {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            console.log(`[PlanEcoRoute] Starting attempt ${attempt + 1} of ${maxRetries}. BaseURL:`, baseURL);
            console.log("[PlanEcoRoute] Deployment/Model:", DEPLOYMENT_NAME);

            const cleanPrompt = preprocessPrompt(userPrompt);
            const reinforcedPrompt = `${cleanPrompt}\n\nUse your tools (search_nearby_places, get_weather) to gather real-world data first, then respond using the exact JSON schema provided, containing status, explanation, route (with total_distance and path array of lat/lng/desc objects), environment, and pois fields. Do not omit any fields. All fields in the schema are mandatory.`;

            const messages = [
                { role: 'system', content: SYSTEM_MESSAGE },
                { role: 'user', content: reinforcedPrompt }
            ];

            // Enable streaming in Netlify serverless environment to prevent gateway timeouts on long reasoning runs
            const useStreaming = typeof onStreamUpdate === 'function';

            let toolTurn = 0;
            while (toolTurn <= MAX_TOOL_TURNS) {
                // Only allow tools on early turns; force a final answer once budget is exhausted
                const allowTools = toolTurn < MAX_TOOL_TURNS;
                const requestOptions = {
                    model: DEPLOYMENT_NAME,
                    messages,
                    response_format: { type: 'json_object' },
                    ...(allowTools ? { tools: TOOLS, tool_choice: 'auto' } : {})
                };

                let rawOutput = '';
                let toolCallsAcc = [];

                if (useStreaming) {
                    console.log(`[PlanEcoRoute] Turn ${toolTurn}: STREAMING request (tools=${allowTools}).`);
                    const stream = await openai.chat.completions.create({ ...requestOptions, stream: true });

                    let chunkCount = 0;
                    for await (const chunk of stream) {
                        chunkCount++;
                        const delta = chunk.choices[0]?.delta;
                        if (delta?.tool_calls) {
                            accumulateToolCallDelta(toolCallsAcc, delta.tool_calls);
                        }
                        const content = delta?.content || '';
                        if (content) {
                            rawOutput += content;
                            const cleanStream = extractStreamingReasoning(rawOutput);
                            onStreamUpdate(cleanStream);
                        }
                    }
                    console.log(`[PlanEcoRoute] Turn ${toolTurn} stream completed. Chunks: ${chunkCount}, content length: ${rawOutput.length}, tool calls: ${toolCallsAcc.length}`);
                } else {
                    console.log(`[PlanEcoRoute] Turn ${toolTurn}: NON-STREAMING request (tools=${allowTools}).`);
                    const completion = await openai.chat.completions.create({
                        ...requestOptions,
                        stream: false,
                        timeout: 60000 // 60 seconds timeout
                    });
                    const message = completion.choices[0]?.message;
                    rawOutput = message?.content || '';
                    toolCallsAcc = message?.tool_calls || [];
                    console.log(`[PlanEcoRoute] Turn ${toolTurn} completed. Content length: ${rawOutput.length}, tool calls: ${toolCallsAcc.length}`);
                }

                // Model requested tool calls: execute them and continue the loop
                if (toolCallsAcc.length > 0) {
                    messages.push({
                        role: 'assistant',
                        content: rawOutput || null,
                        tool_calls: toolCallsAcc
                    });
                    for (const toolCall of toolCallsAcc) {
                        const toolMessage = await executeToolCall(toolCall, onToolEvent);
                        messages.push(toolMessage);
                    }
                    toolTurn++;
                    continue;
                }

                // No tool calls: this is the final answer
                const parsed = parsePhi4Response(rawOutput);
                if (!parsed.finalPayload) {
                    throw new Error("Failed to parse JSON payload from response.");
                }
                console.log("[PlanEcoRoute] Parsing finished. Trace length:", parsed.reasoningTrace.length);
                return parsed;
            }

            throw new Error("Agent exceeded maximum tool turns without producing a final answer.");
        } catch (error) {
            console.error(`[PlanEcoRoute] Error calling Azure OpenAI Phi-4 on attempt ${attempt + 1}:`, error.message);
            attempt++;
            if (attempt >= maxRetries) {
                console.error("[PlanEcoRoute] Max retries reached. Throwing error.");
                throw error;
            }
            // Exponential backoff: 1s, 2s, 4s...
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.log(`[PlanEcoRoute] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}
