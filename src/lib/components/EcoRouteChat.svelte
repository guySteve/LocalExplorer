<script>
    import { createEventDispatcher } from 'svelte';
    import { Search, Loader2, Map as MapIcon, Info, Droplets, TreePine, Sparkles, ChevronDown, ChevronUp, Compass } from 'lucide-svelte';
    import { slide, fade } from 'svelte/transition';
    import { currentPosition, currentAddress } from '$lib/stores/appState';

    const dispatch = createEventDispatcher();

    let prompt = '';
    let isPlanning = false;
    let error = null;
    let rawStream = '';
    let reasoningTrace = '';
    let finalPayload = null;
    let showReasoning = true; // Allow user to collapse reasoning

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

    async function handleAIPlan() {
        if (!prompt.trim() || isPlanning) return;
        
        isPlanning = true;
        error = null;
        rawStream = '';
        reasoningTrace = '';
        finalPayload = null;
        showReasoning = true;

        try {
            // Include location context if available
            const locationContext = $currentAddress || ($currentPosition ? `${$currentPosition.lat}, ${$currentPosition.lng}` : 'Unknown');
            const enhancedPrompt = `User's current location context: ${locationContext}\nUser's request: ${prompt}`;
            
            const response = await fetch('/api/eco-route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: enhancedPrompt })
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
                            showReasoning = false; // Auto-collapse thinking when done
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
        <div class="header-content">
            <div class="icon-wrapper">
                <Sparkles size={24} color="var(--primary)" />
            </div>
            <h3>Smart Route Explorer</h3>
        </div>
        <p class="subtitle">Tell us what kind of adventure you want. Our intelligent planner considers shade, trails, and local history to craft the perfect itinerary.</p>
        
        <form class="search-form" on:submit|preventDefault={handleAIPlan}>
            <input 
                type="text" 
                bind:value={prompt} 
                placeholder="Find a place or describe an adventure..."
                disabled={isPlanning}
            />
            <div class="action-buttons">
                <button type="submit" class="btn-ai" disabled={isPlanning || !prompt.trim()} title="Plan Route">
                    {#if isPlanning}
                        <Loader2 class="spin" size={20} />
                    {:else}
                        <Sparkles size={20} />
                    {/if}
                    <span>Plan Route</span>
                </button>
            </div>
        </form>
    </div>

    {#if error}
        <div class="error-message" transition:fade>
            {error}
        </div>
    {/if}

    {#if isPlanning || reasoningTrace}
        <div class="reasoning-card" transition:slide>
            <button 
                class="reasoning-header" 
                on:click={() => showReasoning = !showReasoning}
                type="button"
            >
                <div class="header-title">
                    <Compass size={16} color="var(--secondary)" /> 
                    <span>{isPlanning ? 'Crafting your perfect route...' : 'How we planned this route'}</span>
                    {#if isPlanning}
                        <Loader2 class="spin ml-2" size={14} color="var(--accent)" />
                    {/if}
                </div>
                {#if showReasoning}
                    <ChevronUp size={16} />
                {:else}
                    <ChevronDown size={16} />
                {/if}
            </button>
            
            {#if showReasoning}
                <div class="reasoning-body" transition:slide>
                    <p class="reasoning-text">{reasoningTrace || 'Initializing intelligent planner...'}</p>
                </div>
            {/if}
        </div>
    {/if}

    {#if finalPayload && finalPayload.route}
        <div class="final-synthesis" transition:slide>
            <h4><MapIcon size={20} color="var(--primary)" /> Recommended Itinerary</h4>
            
            <div class="route-stats">
                <div class="stat"><TreePine size={16} color="var(--secondary)"/> <span>{finalPayload.environment.shadeCoverage} Shade</span></div>
                <div class="stat"><Droplets size={16} color="var(--primary)"/> <span>{finalPayload.environment.temperature}</span></div>
                <div class="stat"><Info size={16} color="var(--accent)"/> <span>{finalPayload.route.total_distance} miles</span></div>
            </div>

            <div class="explanation">
                <p>{finalPayload.explanation}</p>
            </div>
            
            <button class="view-map-btn" on:click={() => dispatch('viewMap', finalPayload)}>
                View Route on Interactive Map
            </button>
        </div>
    {/if}
</div>

<style>
    .eco-route-container {
        background: rgba(253, 251, 250, 0.85); /* Frosty light card */
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-radius: var(--radius);
        box-shadow: 0 8px 32px rgba(42, 40, 37, 0.08);
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        border: 1px solid rgba(255, 255, 255, 0.4);
    }

    .header-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.5rem;
    }

    .icon-wrapper {
        background: rgba(212, 93, 59, 0.1);
        padding: 0.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    h3 {
        margin: 0;
        color: var(--text-dark);
        font-family: var(--font-primary);
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: -0.02em;
    }

    .subtitle {
        color: rgba(42, 40, 37, 0.7);
        font-size: 0.95rem;
        line-height: 1.5;
        margin: 0 0 1.25rem 0;
        font-family: var(--font-secondary);
    }

    .search-form {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    input {
        width: 100%;
        padding: 0.85rem 1.25rem;
        border: 2px solid rgba(42, 40, 37, 0.1);
        border-radius: var(--button-radius);
        font-size: 1rem;
        background: rgba(255, 255, 255, 0.9);
        color: var(--text-dark);
        font-family: var(--font-secondary);
        transition: all 0.3s ease;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
    }
    
    input:focus {
        outline: none;
        border-color: var(--primary);
        box-shadow: 0 0 0 3px rgba(212, 93, 59, 0.15);
        background: #ffffff;
    }

    .action-buttons {
        display: flex;
        gap: 0.5rem;
    }

    .action-buttons button {
        border: none;
        border-radius: var(--button-radius);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: var(--font-primary);
        font-weight: 600;
        font-size: 1rem;
    }

    .btn-ai {
        background: var(--primary);
        color: var(--text-light);
        padding: 0.85rem 1.5rem;
        width: 100%;
        gap: 0.5rem;
        box-shadow: 0 4px 12px rgba(212, 93, 59, 0.25);
    }

    .btn-ai:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(212, 93, 59, 0.35);
        filter: brightness(1.05);
    }

    .action-buttons button:active:not(:disabled) {
        transform: translateY(0);
    }

    .action-buttons button:disabled {
        background: #D3CEC4;
        color: rgba(255, 255, 255, 0.6);
        cursor: not-allowed;
        box-shadow: none;
        border: none !important;
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    .ml-2 {
        margin-left: 0.5rem;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .reasoning-card {
        margin-top: 1.5rem;
        background: rgba(255, 255, 255, 0.5);
        border-radius: var(--button-radius);
        overflow: hidden;
        border: 1px solid rgba(42, 40, 37, 0.08);
    }

    .reasoning-header {
        width: 100%;
        background: transparent;
        border: none;
        padding: 0.75rem 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        color: var(--text-dark);
        font-family: var(--font-primary);
        font-weight: 600;
        font-size: 0.95rem;
        transition: background 0.2s;
    }

    .reasoning-header:hover {
        background: rgba(255, 255, 255, 0.4);
    }

    .header-title {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .reasoning-body {
        padding: 1rem;
        background: rgba(255, 255, 255, 0.7);
        border-top: 1px solid rgba(42, 40, 37, 0.05);
        max-height: 250px;
        overflow-y: auto;
    }

    .reasoning-text {
        color: rgba(42, 40, 37, 0.8);
        font-family: var(--font-secondary);
        font-size: 0.9rem;
        white-space: pre-wrap;
        margin: 0;
        line-height: 1.6;
    }

    .final-synthesis {
        margin-top: 1.5rem;
        background: #ffffff;
        border: 1px solid rgba(42, 40, 37, 0.08);
        border-radius: var(--radius);
        padding: 1.5rem;
        box-shadow: 0 4px 20px rgba(0,0,0,0.04);
    }

    .final-synthesis h4 {
        color: var(--text-dark);
        margin: 0 0 1.25rem 0;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: var(--font-primary);
        font-size: 1.2rem;
    }

    .explanation p {
        margin: 0 0 1.5rem 0;
        line-height: 1.6;
        color: var(--text-dark);
        font-size: 1rem;
        font-family: var(--font-secondary);
    }

    .route-stats {
        display: flex;
        gap: 0.75rem;
        margin-bottom: 1.25rem;
        flex-wrap: wrap;
    }

    .stat {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-dark);
        background: rgba(42, 40, 37, 0.04);
        padding: 0.5rem 0.85rem;
        border-radius: 20px;
        border: 1px solid rgba(42, 40, 37, 0.08);
    }

    .view-map-btn {
        width: 100%;
        padding: 0.85rem;
        border-radius: var(--button-radius);
        font-family: var(--font-primary);
        font-weight: 600;
        font-size: 1rem;
        background: var(--secondary);
        color: var(--text-light);
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(95, 113, 81, 0.25);
    }

    .view-map-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(95, 113, 81, 0.35);
        filter: brightness(1.05);
    }

    .error-message {
        margin-top: 1rem;
        padding: 0.85rem;
        background: rgba(212, 93, 59, 0.1);
        color: var(--primary);
        border-radius: var(--button-radius);
        border: 1px solid rgba(212, 93, 59, 0.2);
        font-size: 0.95rem;
        font-weight: 500;
    }
</style>
