<script>
	import { onMount } from 'svelte';
	
	// Import CSS
	import '/css/theme.css';
	import '/css/main.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>Local Explorer - Discover Local Places & Events</title>
</svelte:head>

{@render children()}
