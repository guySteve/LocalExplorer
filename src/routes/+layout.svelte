<script>
	import { onMount } from 'svelte';
	import { currentTheme } from '$lib/stores/appState';
	
	// Import CSS
	import '/css/theme.css';
	import '/css/main.css';
	
	let { children } = $props();
	
	onMount(() => {
		// Apply theme on mount
		currentTheme.subscribe(theme => {
			// Theme is already applied via the store subscription in appState.js
		});
	});
</script>

<svelte:head>
	<title>Local Explorer - Discover Local Places & Events</title>
</svelte:head>

{@render children()}
