import { defineConfig, presetWind, transformerDirectives } from "unocss";

export default defineConfig({
	presets: [
		presetWind({
			dark: "media",
		}),
	],

	transformers: [transformerDirectives()],
});
