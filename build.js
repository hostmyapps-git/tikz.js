import * as esbuild from "esbuild";

const isWatchMode = process.argv.includes("--watch");

const sharedOptions = {
  bundle: true,
  format: "iife",
  globalName: "Tikz",
  platform: "browser",
  target: ["es2018"],
  sourcemap: false,
  logLevel: "info"
};

const buildTargets = [
  { entryPoint: "src/index.js", outfile: "dist/tikz.js", minify: false },
  { entryPoint: "src/index.js", outfile: "dist/tikz.min.js", minify: true }
];

async function buildAll() {
  if (isWatchMode) {
    const contexts = await Promise.all(buildTargets.map((target) => {
      return esbuild.context({
        ...sharedOptions,
        entryPoints: [target.entryPoint],
        outfile: target.outfile,
        minify: target.minify
      });
    }));

    await Promise.all(contexts.map((context) => context.watch()));
    return;
  }

  await Promise.all(buildTargets.map((target) => {
    return esbuild.build({
      ...sharedOptions,
      entryPoints: [target.entryPoint],
      outfile: target.outfile,
      minify: target.minify
    });
  }));
}

buildAll().catch((error) => {
  console.error(error);
  process.exit(1);
});
