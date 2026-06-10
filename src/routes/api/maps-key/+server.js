import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function GET() {
    // Return the map key from .env (only used to initialize the client-side Maps SDK)
    return json({ key: env.MAPS_API_KEY || process.env.MAPS_API_KEY || '' });
}
