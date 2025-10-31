<script>
	import { onMount } from 'svelte';
	
	// Import CSS - Theme variables and app-wide styles
	import '/css/theme.css';
	import '../app.css';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>Local Explorer - Discover Local Places & Events</title>
</svelte:head>

{@render children()}
