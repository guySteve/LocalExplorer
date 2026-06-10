<script>
    import { createEventDispatcher } from 'svelte';
    import { Search, Loader2, Map as MapIcon, Info, Droplets, TreePine, Terminal } from 'lucide-svelte';

    const dispatch = createEventDispatcher();

    let prompt = 'Plan a 35-mile cycling route starting in Bradenton, Florida, optimizing for morning shade and birdwatching.';
    let isPlanning = false;
    let error = null;
    let rawStream = '';
    let reasoningTrace = '';
    let finalPayload = null;

    // Helper to extract think block on the fly
    function parseStream(content) {
        rawStream = content;
        const thinkMatch = rawStream.match(/<think>([\s\S]*?)(<\/think>|$)/);
        if (thinkMatch) {
            reasoningTrace = thinkMatch[1].trim();
        } else {
            reasoningTrace = rawStream;
        }
    }

    async function handleSubmit() {
        if (!prompt.trim() || isPlanning) return;
        
        isPlanning = true;
        error = null;
        rawStream = '';
        reasoningTrace = '';
        finalPayload = null;

        try {
            const response = await fetch('/api/eco-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            if (!response.ok) {
                throw new Error('Failed to plan route');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                
                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        
                        if (data.type === 'stream') {
                            parseStream(data.content);
                        } else if (data.type === 'final') {
                            reasoningTrace = data.data.reasoningTrace;
                            finalPayload = data.data.finalPayload;
                            dispatch('routePlanned', finalPayload);
                        } else if (data.type === 'error') {
                            error = data.message;
                        }
                    } catch (e) {
                        console.error('Failed to parse NDJSON line', e, line);
                    }
                }
            }
        } catch (err) {
            error = err.message || 'An error occurred';
        } finally {
            isPlanning = false;
        }
    }
</script>

<div class="eco-route-container">
    <div class="input-section">
        <h3>EcoRoute Phi-4 Planner</h3>
        <p class="subtitle">Enter your multi-variable constraints and watch our reasoning agent solve them in real-time.</p>
        
        <form on:submit|preventDefault={handleSubmit} class="search-form">
            <input 
                type="text" 
                bind:value={prompt} 
                placeholder="E.g., 35-mile cycling route in Bradenton, FL..."
                disabled={isPlanning}
            />
            <button type="submit" disabled={isPlanning || !prompt.trim()}>
                {#if isPlanning}
                    <Loader2 class="spin" size={20} />
                {:else}
                    <Search size={20} />
                {/if}
            </button>
        </form>
    </div>

    {#if error}
        <div class="error-message">
            {error}
        </div>
    {/if}

    {#if isPlanning || reasoningTrace}
        <div class="reasoning-terminal">
            <div class="terminal-header">
                <Terminal size={14} /> <span>Phi-4 Reasoning Trace</span>
                {#if isPlanning}
                    <Loader2 class="spin ml-auto" size={14} />
                {/if}
            </div>
            <div class="terminal-body">
                <pre>{reasoningTrace}</pre>
            </div>
        </div>
    {/if}

    {#if finalPayload && finalPayload.route}
        <div class="final-synthesis">
            <h4><MapIcon size={18} /> Recommended Route</h4>
            <div class="explanation">
                <p>{finalPayload.explanation}</p>
            </div>
            
            <div class="route-stats">
                <div class="stat"><TreePine size={16}/> {finalPayload.environment.shadeCoverage} Shade</div>
                <div class="stat"><Droplets size={16}/> {finalPayload.environment.temperature}</div>
                <div class="stat"><Info size={16}/> {finalPayload.route.total_distance} miles</div>
            </div>
            
            <button class="view-map-btn" on:click={() => dispatch('viewMap', finalPayload)}>
                View Route on Map
            </button>
        </div>
    {/if}
</div>

<style>
    .eco-route-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.05);
        padding: 1.5rem;
        margin-bottom: 1rem;
        border: 1px solid #e2e8f0;
    }

    h3 {
        margin: 0 0 0.5rem 0;
        color: #1e293b;
        font-size: 1.25rem;
    }

    .subtitle {
        color: #64748b;
        font-size: 0.875rem;
        margin: 0 0 1rem 0;
    }

    .search-form {
        display: flex;
        gap: 0.5rem;
    }

    input {
        flex: 1;
        padding: 0.75rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        font-size: 0.95rem;
    }
    
    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    button {
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 8px;
        width: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s;
    }

    button:hover:not(:disabled) {
        background: #2563eb;
    }

    button:disabled {
        background: #94a3b8;
        cursor: not-allowed;
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    .ml-auto {
        margin-left: auto;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .reasoning-terminal {
        margin-top: 1.5rem;
        background: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #333;
    }

    .terminal-header {
        background: #2d2d2d;
        color: #9cdcfe;
        padding: 0.5rem 1rem;
        font-family: monospace;
        font-size: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .terminal-body {
        padding: 1rem;
        max-height: 300px;
        overflow-y: auto;
    }

    .terminal-body pre {
        color: #ce9178;
        font-family: 'Consolas', 'Courier New', monospace;
        font-size: 0.85rem;
        white-space: pre-wrap;
        margin: 0;
        line-height: 1.5;
    }

    .final-synthesis {
        margin-top: 1.5rem;
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 8px;
        padding: 1.25rem;
    }

    .final-synthesis h4 {
        color: #1d4ed8;
        margin: 0 0 1rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .explanation p {
        margin: 0 0 1rem 0;
        line-height: 1.5;
        color: #1e293b;
        font-size: 0.95rem;
    }

    .route-stats {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
        flex-wrap: wrap;
    }

    .stat {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.85rem;
        color: #0369a1;
        background: white;
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        border: 1px solid #bae6fd;
    }

    .view-map-btn {
        width: 100%;
        padding: 0.75rem;
        border-radius: 6px;
        font-weight: 500;
        background: #3b82f6;
        color: white;
        border: none;
        cursor: pointer;
    }

    .view-map-btn:hover {
        background: #2563eb;
    }

    .error-message {
        margin-top: 1rem;
        padding: 0.75rem;
        background: #fef2f2;
        color: #b91c1c;
        border-radius: 6px;
        border: 1px solid #fecaca;
        font-size: 0.9rem;
    }
</style>
