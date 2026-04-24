import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { renderToSvg } from "../src/Tikz.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, "..");
const examplesDirectory = path.join(projectRoot, "examples");
const manifestPath = path.join(examplesDirectory, "latex-verify.json");
const artifactsDirectory = path.join(projectRoot, "artifacts", "latex-verify");

function runCommand(command, args, workdir) {
  const result = spawnSync(command, args, {
    cwd: workdir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(
      command + " failed\n" +
      (result.stdout || "") +
      (result.stderr || "")
    );
  }

  return result;
}

function ensureTool(name) {
  const result = spawnSync("which", [name], { encoding: "utf8" });

  if (result.status !== 0) {
    throw new Error("Required tool not found: " + name);
  }

  return result.stdout.trim();
}

function resolveSvgConverter() {
  const dvisvgm = spawnSync("which", ["dvisvgm"], { encoding: "utf8" });
  if (dvisvgm.status === 0) {
    return "dvisvgm";
  }

  const inkscape = spawnSync("which", ["inkscape"], { encoding: "utf8" });
  if (inkscape.status === 0) {
    return "inkscape";
  }

  throw new Error("Required SVG converter not found: dvisvgm or inkscape");
}

function extractViewBox(svg) {
  const match = svg.match(/viewBox="([^"]+)"/);

  if (!match) {
    throw new Error("SVG is missing a viewBox");
  }

  const parts = match[1].trim().split(/\s+/).map(Number);

  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    throw new Error("Invalid viewBox: " + match[1]);
  }

  return {
    minX: parts[0],
    minY: parts[1],
    width: parts[2],
    height: parts[3]
  };
}

function countOccurrences(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function buildLatexDocument(tikzSource) {
  const latexCompatibleSource = tikzSource
    .replace(/#([0-9a-fA-F]{6})/g, function (_, hex) {
    const red = Number.parseInt(hex.slice(0, 2), 16);
    const green = Number.parseInt(hex.slice(2, 4), 16);
    const blue = Number.parseInt(hex.slice(4, 6), 16);
    return "{rgb,255:red," + red + ";green," + green + ";blue," + blue + "}";
  });

  return [
    "\\documentclass[tikz,border=2pt]{standalone}",
    "\\usepackage{tikz}",
    "\\usetikzlibrary{matrix,mindmap,quotes,shapes.geometric,shapes.misc,shapes.multipart,shapes.symbols}",
    "\\providecommand{\\minus}{\\raisebox{0.96pt}{-}}",
    "\\begin{document}",
    latexCompatibleSource,
    "\\end{document}",
    ""
  ].join("\n");
}

function stripNodeCommands(tikzSource) {
  return tikzSource
    .split("\n")
    .filter(function (line) {
      return !line.trim().startsWith("\\node");
    })
    .join("\n");
}

function normalizeSize(viewBox) {
  const longestSide = Math.max(viewBox.width, viewBox.height);
  return {
    width: viewBox.width / longestSide,
    height: viewBox.height / longestSide
  };
}

function assertClose(label, actual, expected, tolerance) {
  const delta = Math.abs(actual - expected);

  if (delta > tolerance) {
    throw new Error(label + " differs too much: expected " + expected.toFixed(4) + ", got " + actual.toFixed(4) + ", tolerance " + tolerance.toFixed(4));
  }
}

function convertPdfToSvg(pdfPath, referenceSvgPath, tempDirectory, converter) {
  if (converter === "dvisvgm") {
    try {
      runCommand("dvisvgm", ["--pdf", "--exact", "-o", referenceSvgPath, pdfPath], tempDirectory);
      return;
    } catch (error) {
      const inkscape = spawnSync("which", ["inkscape"], { encoding: "utf8" });
      if (inkscape.status !== 0) {
        throw error;
      }
    }
  }

  runCommand("inkscape", [pdfPath, "--export-type=svg", "--export-filename=" + referenceSvgPath], tempDirectory);
}

function verifyEntry(entry, converter) {
  const sourcePath = path.join(examplesDirectory, entry.file);
  const tikzSource = fs.readFileSync(sourcePath, "utf8");
  const geometryOnly = entry.geometryOnly !== false;
  const geometrySource = geometryOnly ? stripNodeCommands(tikzSource) : tikzSource;
  const generatedSvg = renderToSvg(tikzSource);
  const generatedGeometrySvg = renderToSvg(geometrySource);

  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-js-latex-"));
  const latexPath = path.join(tempDirectory, entry.name + ".tex");
  const pdfPath = path.join(tempDirectory, entry.name + ".pdf");
  const referenceSvgPath = path.join(tempDirectory, entry.name + ".svg");

  fs.writeFileSync(latexPath, buildLatexDocument(geometrySource));

  runCommand("lualatex", ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", tempDirectory, latexPath], tempDirectory);
  convertPdfToSvg(pdfPath, referenceSvgPath, tempDirectory, converter);

  const referenceSvg = fs.readFileSync(referenceSvgPath, "utf8");
  const generatedViewBox = extractViewBox(generatedGeometrySvg);
  const referenceViewBox = extractViewBox(referenceSvg);
  const generatedNormalized = normalizeSize(generatedViewBox);
  const referenceNormalized = normalizeSize(referenceViewBox);
  const generatedAspectRatio = generatedViewBox.width / generatedViewBox.height;
  const referenceAspectRatio = referenceViewBox.width / referenceViewBox.height;
  const generatedTextCount = countOccurrences(generatedSvg, /<text\b/g);

  assertClose("Aspect ratio for " + entry.name, generatedAspectRatio, referenceAspectRatio, entry.aspectRatioTolerance);
  assertClose("Normalized width for " + entry.name, generatedNormalized.width, referenceNormalized.width, entry.normalizedSizeTolerance);
  assertClose("Normalized height for " + entry.name, generatedNormalized.height, referenceNormalized.height, entry.normalizedSizeTolerance);

  if (typeof entry.textCount === "number") {
    if (generatedTextCount !== entry.textCount) {
      throw new Error(entry.name + " generated SVG should contain " + entry.textCount + " text node(s), got " + generatedTextCount);
    }
  }

  const outputDirectory = path.join(artifactsDirectory, entry.name);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "source.tikz"), tikzSource);
  fs.writeFileSync(path.join(outputDirectory, "generated.svg"), generatedSvg);
  fs.writeFileSync(path.join(outputDirectory, "generated.geometry.svg"), generatedGeometrySvg);
  fs.writeFileSync(path.join(outputDirectory, "reference.svg"), referenceSvg);

  return {
    name: entry.name,
    generatedAspectRatio,
    referenceAspectRatio,
    generatedViewBox,
    referenceViewBox
  };
}

function main() {
  ensureTool("lualatex");
  const converter = resolveSvgConverter();

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  fs.mkdirSync(artifactsDirectory, { recursive: true });

  const results = manifest.map(function (entry) {
    return verifyEntry(entry, converter);
  });

  for (const result of results) {
    console.log(
      result.name + ": ratio " + result.generatedAspectRatio.toFixed(3) +
      " vs " + result.referenceAspectRatio.toFixed(3) +
      ", generated " + result.generatedViewBox.width.toFixed(1) + "x" + result.generatedViewBox.height.toFixed(1) +
      ", reference " + result.referenceViewBox.width.toFixed(1) + "x" + result.referenceViewBox.height.toFixed(1)
    );
  }
}

main();
