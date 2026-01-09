import { makeKSApiRequest } from './utils/ks-api';
import { exec } from 'child_process';
import { getAsset } from './embedded-assets';
import packageJson from '../package.json';

const PORT = 3000;
const VERSION = packageJson.version;
const GITHUB_REPO = 'Filz0r/ks-redeemer';

function openBrowser(url: string) {
	const commands: Record<string, string> = {
		darwin: `open ${url}`,
		win32: `start ${url}`,
		linux: `xdg-open ${url}`,
	};

	const cmd = commands[process.platform];
	if (cmd) {
		exec(cmd, (err) => {
			if (err) console.log('Could not open browser automatically');
		});
	}
}

const server = Bun.serve({
	port: PORT,
	async fetch(req) {
		const url = new URL(req.url);
		const path = url.pathname;

		// API Routes
		if (path === '/api/login' && req.method === 'POST') {
			try {
				const body = await req.json();
				const { userId } = body;

				if (!userId || typeof userId !== 'string') {
					return Response.json(
						{ success: false, error: 'userId is required' },
						{ status: 400 }
					);
				}

				const result = await makeKSApiRequest('login', userId);
				console.log("result", result)
				return Response.json({ success: true, data: result });
			} catch (error) {
				return Response.json(
					{
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					},
					{ status: 500 }
				);
			}
		}

		if (path === '/api/version' && req.method === 'GET') {
			return Response.json({
				version: VERSION,
				repo: GITHUB_REPO,
			});
		}

		if (path === '/api/redeem' && req.method === 'POST') {
			try {
				const body = await req.json();
				const { userId, code } = body;

				if (!userId || !code) {
					return Response.json(
						{ success: false, error: 'userId and code are required' },
						{ status: 400 }
					);
				}

				const result = await makeKSApiRequest('redeem', userId, code);
				return Response.json({ success: true, data: result });
			} catch (error) {
				return Response.json(
					{
						success: false,
						error: error instanceof Error ? error.message : 'Unknown error',
					},
					{ status: 500 }
				);
			}
		}

		// In dev mode, only serve API routes - use Vite for frontend
		if (process.env.DEV) {
			return new Response('API only in dev mode. Use Vite at http://localhost:5173', { status: 404 });
		}

		// Static file serving from embedded assets (production only)
		let filePath = path === '/' ? '/index.html' : path;

		// Try to get the asset
		let asset = getAsset(filePath);

		// SPA fallback - serve index.html for client-side routing
		if (!asset) {
			asset = getAsset('/index.html');
		}

		if (asset) {
			return new Response(asset.data, {
				headers: { 'Content-Type': asset.mimeType },
			});
		}

		return new Response('Not Found', { status: 404 });
	},
});

console.log(`KS Redeemer running at http://localhost:${PORT}`);
console.log('Press Ctrl+C to stop');

if (!process.env.DEV) {
	openBrowser(`http://localhost:${PORT}`);
}