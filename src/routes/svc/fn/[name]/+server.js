// Catch-all API route that wraps the legacy Netlify-style function handlers.
// Replaces /.netlify/functions/<name> with /api/fn/<name> so the app can run
// on any SvelteKit adapter (Azure Static Web Apps, Node, etc.).
import { error } from '@sveltejs/kit';

import { handler as ebird } from '$lib/server/legacy/ebird.js';
import { handler as foursquare } from '$lib/server/legacy/foursquare.js';
import { handler as holiday } from '$lib/server/legacy/holiday.js';
import { handler as nps } from '$lib/server/legacy/nps.js';
import { handler as recreation } from '$lib/server/legacy/recreation.js';
import { handler as ticketmaster } from '$lib/server/legacy/ticketmaster.js';
import { handler as weather } from '$lib/server/legacy/weather.js';
import { handler as what3words } from '$lib/server/legacy/what3words.js';

const HANDLERS = {
	ebird,
	foursquare,
	holiday,
	nps,
	recreation,
	ticketmaster,
	weather,
	what3words
};

async function invoke(name, request, url) {
	const handler = HANDLERS[name];
	if (!handler) {
		throw error(404, `Unknown function: ${name}`);
	}

	// Adapt the SvelteKit request to the Netlify event shape the handlers expect
	const queryStringParameters = Object.fromEntries(url.searchParams.entries());
	let body = null;
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		body = await request.text();
	}

	const event = {
		httpMethod: request.method,
		queryStringParameters,
		headers: Object.fromEntries(request.headers.entries()),
		body
	};

	const result = await handler(event, {});

	return new Response(result.body ?? '', {
		status: result.statusCode ?? 200,
		headers: result.headers ?? { 'Content-Type': 'application/json' }
	});
}

export async function GET({ params, request, url }) {
	return invoke(params.name, request, url);
}

export async function POST({ params, request, url }) {
	return invoke(params.name, request, url);
}

export async function OPTIONS({ params, request, url }) {
	return invoke(params.name, request, url);
}
