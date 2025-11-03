<script>
	import { createEventDispatcher } from 'svelte';
	
	const dispatch = createEventDispatcher();
	
	function handleCollectionClick() {
		dispatch('openCollection');
	}
	
	function handleCompassClick() {
		dispatch('openCompass');
	}
</script>

<div id="primaryActions">
	<button id="myCollectionBtn" on:click={handleCollectionClick}>📋 My Collection</button>
	<button id="compassBtn" on:click={handleCompassClick}>
		<span class="compass-icon" aria-hidden="true"></span> Compass
	</button>
</div>

<style>
	/* Component-specific styles scoped by default */
	.compass-icon {
		display: inline-block;
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-bottom: 10px solid currentColor;
		margin-right: 4px;
		vertical-align: middle;
		position: relative;
		top: -1px;
	}
	
	.compass-icon::after {
		content: '';
		position: absolute;
		width: 0;
		height: 0;
		border-left: 6px solid transparent;
		border-right: 6px solid transparent;
		border-top: 10px solid currentColor;
		left: -6px;
		top: 3px;
		opacity: 0.5;
	}
</style>
