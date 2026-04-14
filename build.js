import * as esbuild from "esbuild";

const isWatchMode = process.argv.includes("--watch");

const sharedOptions = {
  entryPoints: ["src/index.js"],
  bundle: true,
  format: "iife",
  globalName: "Tikz",
  platform: "browser",
  target: ["es2018"],
  sourcemap: false,
  logLevel: "info"
};

async function buildAll() {
  if (isWatchMode) {
    const readableContext = await esbuild.context({
      ...sharedOptions,
      outfile: "dist/tikz.js",
      minify: false
    });

    const minifiedContext = await esbuild.context({
      ...sharedOptions,
      outfile: "dist/tikz.min.js",
      minify: true
    });

    await readableContext.watch();
    await minifiedContext.watch();
    return;
  }

  await esbuild.build({
    ...sharedOptions,
    outfile: "dist/tikz.js",
    minify: false
  });

  await esbuild.build({
    ...sharedOptions,
    outfile: "dist/tikz.min.js",
    minify: true
  });
}

buildAll().catch((error) => {
  console.error(error);
  process.exit(1);
});
