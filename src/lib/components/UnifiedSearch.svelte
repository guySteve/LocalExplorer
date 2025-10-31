<script>
	import { createEventDispatcher } from 'svelte';
	import { performUnifiedSearch } from '$lib/utils/api';
	
	const dispatch = createEventDispatcher();
	
	let searchQuery = '';
	let isSearching = false;
	
	async function handleSearch() {
		if (!searchQuery.trim()) {
			alert('Please enter a search term');
			return;
		}
		
		isSearching = true;
		
		try {
			const results = await performUnifiedSearch(searchQuery);
			dispatch('searchResults', { 
				query: searchQuery,
				results: results 
			});
		} catch (error) {
			console.error('Search failed:', error);
			alert(error.message || 'Search failed. Please try again.');
		} finally {
			isSearching = false;
		}
	}
	
	function handleKeyPress(e) {
		if (e.key === 'Enter') {
			handleSearch();
		}
	}
</script>

<div id="unifiedSearchContainer" style="width:100%; margin:0; padding:0;">
	<input 
		type="search" 
		id="unifiedSearchInput"
		bind:value={searchQuery}
		on:keypress={handleKeyPress}
		placeholder="🔍 Search all sources (places, events, parks...)"
		aria-label="Search all sources"
		disabled={isSearching}
	/>
	<button 
		id="unifiedSearchBtn" 
		type="button" 
		on:click={handleSearch}
		disabled={isSearching}
		aria-label="Search"
	>
		{isSearching ? '⏳' : 'Search'}
	</button>
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
