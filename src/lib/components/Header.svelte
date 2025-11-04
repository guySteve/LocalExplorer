<script>
	import { createEventDispatcher } from 'svelte';
	import { Settings } from 'lucide-svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleSettingsClick() {
		dispatch('openSettings');
	}
</script>

<header id="appHeader">
	<h1 id="appTitle">Local Explorer</h1>
	<button id="settingsBtn" type="button" aria-label="Open settings" on:click={handleSettingsClick}>
		<Settings size={20} color="currentColor" />
	</button>
</header>

<style>
	/* Component-specific styles are scoped by default in Svelte */
</style>
