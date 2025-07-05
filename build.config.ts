import { promises as fs } from "node:fs";
import path from "node:path";
import { defineBuildConfig } from "unbuild";
import {
	author,
	description,
	homepage,
	license,
	name,
	repository,
	version,
} from "./package.json" with { type: "json" };

const exts = [".cjs", ".mjs", ".js", ".d.cts", ".d.mts", ".d.ts"];

async function addBannerToFiles(dir: string, banner: string) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			await addBannerToFiles(fullPath, banner);
		} else if (exts.some((ext) => entry.name.endsWith(ext))) {
			const content = await fs.readFile(fullPath, "utf8");
			await fs.writeFile(fullPath, banner + content, "utf8");
		}
	}
}

const authorName = typeof author === "string" ? author : author?.name || "";
const repoUrl =
	typeof repository === "string" ? repository : repository?.url || "";
const home = homepage || "";
const banner = `/**\n* ${name} v${version}\n* ${description}\n* ${authorName}\n* ${license}\n* ${repoUrl}\n* ${home}\n*/\n`;

export default defineBuildConfig({
	entries: ["src/index", "src/frontend"],
	externals: ["json-schema", "@ai-sdk/provider", "ai"],
	outDir: "dist",
	declaration: true,
	rollup: {
		emitCJS: true,
		cjsBridge: true,
		esbuild: {
			minify: true,
		},
	},
	clean: true,
	failOnWarn: true,
	sourcemap: false,
	hooks: {
		"build:done": async () => {
			await addBannerToFiles("dist", banner);
		},
	},
});
