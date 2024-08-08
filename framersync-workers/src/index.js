/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		const path = url.pathname.replace(/^\/|\/$/g, '').split('/');

		switch (path[0]) {
			case 'airtable':
				return new Response('Airtable', { status: 200 });
			case 'notion':
				return new Response('Notion', { status: 200 });
		}

		return new Response('Not found', { status: 404 });
	},
};
