import { json } from '@sveltejs/kit';
import { planEcoRoute } from '$lib/server/foundryAgent';

export async function POST({ request }) {
    const { prompt } = await request.json();

    if (!prompt) {
        return json({ error: 'Prompt is required' }, { status: 400 });
    }

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Call the agent, passing a callback for stream progress
                const finalResult = await planEcoRoute(prompt, (rawString) => {
                    // Send raw progress updates as JSON chunks
                    const chunk = JSON.stringify({ type: 'stream', content: rawString }) + '\n';
                    controller.enqueue(new TextEncoder().encode(chunk));
                });

                // Send the final result
                const finalChunk = JSON.stringify({ type: 'final', data: finalResult }) + '\n';
                controller.enqueue(new TextEncoder().encode(finalChunk));
                controller.close();
            } catch (error) {
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
