import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
	base: "/cissp_training/",
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			includeAssets: ["favicon.svg", "icons.svg"],
			manifest: {
				name: "CISSPrep",
				short_name: "CISSPrep",
				description: "CISSP practice exam and flashcard study app",
				theme_color: "#7e14ff",
				background_color: "#7e14ff",
				display: "standalone",
				icons: [
					{ src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
					{ src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
					{
						src: "pwa-maskable-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				// Default cap is 2 MiB; the question bank bundle alone is several MB.
				maximumFileSizeToCacheInBytes: 8000000,
			},
		}),
	],
});
