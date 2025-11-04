<script>
	import { createEventDispatcher } from 'svelte';
	import { browser } from '$app/environment';
	import { performUnifiedSearch } from '$lib/utils/api';
	
	const dispatch = createEventDispatcher();
	
	let searchQuery = '';
	let isSearching = false;
	let isListening = false;
	let recognition = null;
	
	// Initialize speech recognition
	if (browser && (window.webkitSpeechRecognition || window.SpeechRecognition)) {
		const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
		recognition = new SpeechRecognition();
		recognition.continuous = false;
		recognition.interimResults = false;
		recognition.lang = 'en-US';
		
		recognition.onresult = (event) => {
			const transcript = event.results[0][0].transcript;
			searchQuery = transcript;
			isListening = false;
			// Auto-trigger search after voice input
			handleSearch();
		};
		
		recognition.onerror = (event) => {
			console.error('Speech recognition error:', event.error);
			isListening = false;
			if (event.error === 'no-speech') {
				alert('No speech detected. Please try again.');
			} else if (event.error === 'not-allowed') {
				alert('Microphone access denied. Please enable it in your browser settings.');
			} else {
				alert('Voice recognition error. Please try again.');
			}
		};
		
		recognition.onend = () => {
			isListening = false;
		};
	}
	
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
	
	function handleVoiceSearch() {
		if (!recognition) {
			alert('Voice search is not supported in your browser. Please try Chrome, Safari, or Edge.');
			return;
		}
		
		if (isListening) {
			recognition.stop();
			isListening = false;
		} else {
			try {
				recognition.start();
				isListening = true;
			} catch (error) {
				console.error('Failed to start voice recognition:', error);
				alert('Failed to start voice recognition. Please try again.');
			}
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
		disabled={isSearching || isListening}
	/>
	<button 
		id="voiceSearchBtn" 
		type="button" 
		on:click={handleVoiceSearch}
		disabled={isSearching || !recognition}
		aria-label="Voice search"
		title="Voice search"
		class:listening={isListening}
	>
		{isListening ? '🔴' : '🎤'}
	</button>
	<button 
		id="unifiedSearchBtn" 
		type="button" 
		on:click={handleSearch}
		disabled={isSearching || isListening}
		aria-label="Search"
	>
		{isSearching ? '⏳' : 'Search'}
	</button>
</div>

<style>
	/* Component-specific styles scoped by default */
</style>
