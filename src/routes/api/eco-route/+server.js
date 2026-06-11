import { json } from '@sveltejs/kit';
import { planEcoRoute } from '$lib/server/foundryAgent';

export async function POST({ request }) {
    console.log("[POST /api/eco-route] Handler invoked.");
    const { prompt } = await request.json();

    if (!prompt) {
        console.warn("[POST /api/eco-route] Missing prompt in request.");
        return json({ error: 'Prompt is required' }, { status: 400 });
    }

    console.log("[POST /api/eco-route] Prompt:", prompt.slice(0, 100));


    // Standard streaming flow for local development
    const stream = new ReadableStream({
        async start(controller) {
            try {
                console.log("[POST /api/eco-route] Starting planEcoRoute stream...");
                const finalResult = await planEcoRoute(prompt, (rawString) => {
                    const chunk = JSON.stringify({ type: 'stream', content: rawString }) + '\n';
                    controller.enqueue(new TextEncoder().encode(chunk));
                });

                console.log("[POST /api/eco-route] planEcoRoute completed. Enqueuing final result...");
                const finalChunk = JSON.stringify({ type: 'final', data: finalResult }) + '\n';
                controller.enqueue(new TextEncoder().encode(finalChunk));
                controller.close();
            } catch (error) {
                console.error("[POST /api/eco-route] Stream error:", error);
                const errorChunk = JSON.stringify({ type: 'error', message: error.message }) + '\n';
                controller.enqueue(new TextEncoder().encode(errorChunk));
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
