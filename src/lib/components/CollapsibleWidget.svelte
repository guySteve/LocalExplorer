<script>
	import { createEventDispatcher, onMount, afterUpdate } from 'svelte';
	import { ChevronDown } from 'lucide-svelte';
	import { widgetCollapseState, getWidgetCollapse } from '$lib/stores/widgetCollapseState';

	export let id;
	export let title = '';
	export let defaultOpen = false;

	const dispatch = createEventDispatcher();

	const slugify = (value) => {
		if (!value) return '';
		return value
			.toString()
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	};

	$: widgetKey = slugify(id ?? title) || 'widget';
	$: contentId = `${widgetKey}-content`;

	$: if (widgetKey) {
		widgetCollapseState.ensure(widgetKey, defaultOpen);
	}

	$: isOpen = getWidgetCollapse($widgetCollapseState, widgetKey, defaultOpen);

	function toggle() {
		if (!widgetKey) return;
		widgetCollapseState.toggle(widgetKey);
		dispatch('toggle', { id: widgetKey, isOpen: !isOpen });
	}

	let contentWrapper;
	let measuredHeight = 0;

	function updateMeasuredHeight() {
		if (contentWrapper) {
			measuredHeight = contentWrapper.scrollHeight;
		}
	}

	onMount(() => {
		updateMeasuredHeight();

		let resizeObserver;
		if (typeof ResizeObserver !== 'undefined' && contentWrapper) {
			resizeObserver = new ResizeObserver(() => updateMeasuredHeight());
			resizeObserver.observe(contentWrapper);
		}

		return () => {
			resizeObserver?.disconnect();
		};
	});

	afterUpdate(() => {
		if (isOpen) {
			updateMeasuredHeight();
		}
	});
</script>

<div class={`collapsible-widget ${isOpen ? 'open' : 'collapsed'}`}>
	<button
		class="collapsible-header"
		type="button"
		on:click={toggle}
		aria-expanded={isOpen}
		aria-controls={contentId}
	>
		<div class="header-slot">
			<slot name="header">
				<span class="collapsible-title">{title}</span>
			</slot>
		</div>
		<ChevronDown
			class={`collapse-indicator ${isOpen ? 'rotate' : ''}`}
			size={18}
			aria-hidden="true"
		/>
	</button>

	<div
		id={contentId}
		class={`collapsible-content ${isOpen ? 'open' : ''}`}
		style={`max-height: ${isOpen ? measuredHeight + 24 : 0}px`}
		aria-hidden={!isOpen}
	>
		<div class="collapsible-body" bind:this={contentWrapper}>
			<slot name="content" />
		</div>
	</div>
</div>

<style>
	.collapsible-widget {
		border-radius: 16px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.2);
		backdrop-filter: blur(12px);
		overflow: hidden;
		box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25);
		transition: border-color 0.2s ease, background 0.2s ease;
	}

	.collapsible-widget.open {
		border-color: rgba(255, 255, 255, 0.25);
		background: rgba(0, 0, 0, 0.35);
	}

	.collapsible-header {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		background: transparent;
		color: inherit;
		border: none;
		padding: 1rem 1.25rem;
		font-size: 1rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		cursor: pointer;
		transition: background 0.2s ease;
	}

	.collapsible-header:hover {
		background: rgba(255, 255, 255, 0.04);
	}

	.header-slot {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.65rem;
	}

	.collapsible-title {
		font-size: 0.95rem;
		letter-spacing: 0.06em;
	}

	.collapse-indicator {
		transition: transform 0.25s ease;
	}

	.collapse-indicator.rotate {
		transform: rotate(180deg);
	}

	.collapsible-content {
		overflow: hidden;
		transition: max-height 0.35s ease, opacity 0.25s ease;
		opacity: 0;
	}

	.collapsible-content.open {
		opacity: 1;
	}

	.collapsible-body {
		padding: 0 1.5rem 1.5rem;
	}

	@media (max-width: 720px) {
		.collapsible-body {
			padding: 0 1rem 1.25rem;
		}
	}
</style>
