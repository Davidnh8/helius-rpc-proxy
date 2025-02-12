interface Env {
	CORS_ALLOW_ORIGIN: string;
	HELIUS_API_KEY: string;
    ENVIRONMENT: string;
}

export default {
	async fetch(request: Request, env: Env) {
        const isProd = env.ENVIRONMENT === 'production';

		// Define RPC Base
		const MAINNET_RPC_BASE = "mainnet";
		const DEVNET_RPC_BASE = "devnet";

		const RPC_BASE = isProd ? MAINNET_RPC_BASE : DEVNET_RPC_BASE;

        // Define API BASE
        const MAINNET_API_BASE = 'api';
        const DEVNET_API_BASE = 'api-devnet';

        const API_BASE = isProd ? MAINNET_API_BASE : DEVNET_API_BASE;    

		// If the request is an OPTIONS request, return a 200 response with permissive CORS headers
		// This is required for the Helius RPC Proxy to work from the browser and arbitrary origins
		// If you wish to restrict the origins that can access your Helius RPC Proxy, you can do so by
		// changing the `*` in the `Access-Control-Allow-Origin` header to a specific origin.
		// For example, if you wanted to allow requests from `https://example.com`, you would change the
		// header to `https://example.com`. Multiple domains are supported by verifying that the request
		// originated from one of the domains in the `CORS_ALLOW_ORIGIN` environment variable.
		const supportedDomains = env.CORS_ALLOW_ORIGIN ? env.CORS_ALLOW_ORIGIN.split(',') : undefined;
		const corsHeaders: Record<string, string> = {
			"Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, OPTIONS",
			"Access-Control-Allow-Headers": "*",
		}
		if (supportedDomains) {
			const origin = request.headers.get('Origin')
			if (origin && supportedDomains.includes(origin)) {
				corsHeaders['Access-Control-Allow-Origin'] = origin
			}
		} else {
			corsHeaders['Access-Control-Allow-Origin'] = '*'
		}

		if (request.method === "OPTIONS") {
			return new Response(null, {
				status: 200,
				headers: corsHeaders,
			});
		}

		const upgradeHeader = request.headers.get('Upgrade')

		if (upgradeHeader || upgradeHeader === 'websocket') {
			return await fetch(`https://${RPC_BASE}.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`, request)
		}


		const { pathname, search } = new URL(request.url)
		const payload = await request.text();
		const proxyRequest = new Request(`https://${pathname === '/' ? `${RPC_BASE}.helius-rpc.com` : `${API_BASE}.helius.xyz`}${pathname}?api-key=${env.HELIUS_API_KEY}${search ? `&${search.slice(1)}` : ''}`, {
			method: request.method,
			body: payload || null,
			headers: {
				'Content-Type': 'application/json',
				'X-Helius-Cloudflare-Proxy': 'true',
			}
		});

		return await fetch(proxyRequest).then(res => {
			return new Response(res.body, {
				status: res.status,
				headers: corsHeaders
			});
		});
	},
};
