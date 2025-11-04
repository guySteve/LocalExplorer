<script>
	import { currentTheme } from '$lib/stores/appState';
	import { onMount } from 'svelte';
	
	export let iconName = '';
	
	let iconSrc = '';
	let loading = true;
	
	// Create a theme-safe icon name (remove spaces and special characters)
	$: formattedName = iconName.toLowerCase().replace(/[^a-z0-9]/g, '');
	
	// Load the appropriate icon based on current theme
	$: if ($currentTheme && formattedName) {
		loadIcon($currentTheme, formattedName);
	}
	
	async function loadIcon(theme, name) {
		loading = true;
		try {
			// Try to import the theme-specific icon
			const module = await import(`$lib/assets/themes/${theme}/${name}.svg`);
			iconSrc = module.default;
		} catch (err) {
			// Fallback to naval theme if the icon doesn't exist
			console.warn(`Missing icon: ${theme}/${name}.svg, falling back to naval`);
			try {
				const fallback = await import(`$lib/assets/themes/naval/${name}.svg`);
				iconSrc = fallback.default;
			} catch (fallbackErr) {
				console.error(`Icon not found: ${name}.svg`);
				iconSrc = '';
			}
		} finally {
			loading = false;
		}
	}
</script>

{#if !loading && iconSrc}
	<img src={iconSrc} alt="{iconName}" class="theme-icon" />
{:else if loading}
	<div class="theme-icon-placeholder"></div>
{/if}

<style>
	.theme-icon {
		width: 2.5rem;
		height: 2.5rem;
		object-fit: contain;
		animation: fadeIn 0.3s ease-in;
	}
	
	.theme-icon-placeholder {
		width: 2.5rem;
		height: 2.5rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 8px;
	}
	
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: scale(0.9);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}
	
	@media (max-width: 600px) {
		.theme-icon,
		.theme-icon-placeholder {
			width: 2rem;
			height: 2rem;
		}
	}
</style>
