<script>
	export let iconName = '';

	let iconSrc = '';
	let loading = true;

	// Create a safe icon name (remove spaces and special characters)
	$: formattedName = iconName.toLowerCase().replace(/[^a-z0-9]/g, '');

	$: if (formattedName) {
		loadIcon(formattedName);
	}

	async function loadIcon(name) {
		loading = true;
		try {
			const module = await import(`$lib/assets/themes/naval/${name}.svg`);
			iconSrc = module.default;
		} catch (err) {
			console.error(`Icon not found: ${name}.svg`);
			iconSrc = '';
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
