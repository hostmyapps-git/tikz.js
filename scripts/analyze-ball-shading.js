import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const cases = [
  { name: "yellow-default", options: "shading=ball, ball color=yellow" },
  { name: "yellow-red", options: "draw=red, shading=ball, ball color=yellow" },
  { name: "yellow-blue", options: "draw=blue, shading=ball, ball color=yellow" },
  { name: "yellow-green", options: "draw=green, shading=ball, ball color=yellow" },
  { name: "yellow-black", options: "draw=black, shading=ball, ball color=yellow" },
  { name: "black-default", options: "shading=ball, ball color=black" }
];

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(command + " failed\n" + (result.stdout || "") + (result.stderr || ""));
  }

  return result;
}

function buildDocument(options) {
  return [
    "\\documentclass[tikz,border=2pt]{standalone}",
    "\\usepackage{tikz}",
    "\\begin{document}",
    "\\begin{tikzpicture}",
    "  \\draw[" + options + "] (0,0) circle [radius=2];",
    "\\end{tikzpicture}",
    "\\end{document}",
    ""
  ].join("\n");
}

function extractGradient(svg) {
  const gradientMatch = svg.match(/<radialGradient[\s\S]*?<\/radialGradient>/);
  if (!gradientMatch) {
    return null;
  }

  const stopMatches = [...gradientMatch[0].matchAll(/stop-color:([^;\"]+).*?offset="?([^\"\s>]+)"?/g)];
  return stopMatches.map((match) => ({ color: match[1], offset: match[2] }));
}

function extractStroke(svg) {
  const strokeMatch = svg.match(/stroke:([^;]+);stroke-width/);
  return strokeMatch ? strokeMatch[1] : null;
}

function main() {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tikz-ball-analysis-"));
  console.log("TEMP", tempDirectory);

  for (const testCase of cases) {
    const texPath = path.join(tempDirectory, testCase.name + ".tex");
    const pdfPath = path.join(tempDirectory, testCase.name + ".pdf");
    const svgPath = path.join(tempDirectory, testCase.name + ".svg");

    fs.writeFileSync(texPath, buildDocument(testCase.options));
    run("lualatex", ["-interaction=nonstopmode", "-halt-on-error", "-output-directory", tempDirectory, texPath], tempDirectory);
    run("inkscape", [pdfPath, "--export-type=svg", "--export-filename=" + svgPath], tempDirectory);

    const svg = fs.readFileSync(svgPath, "utf8");
    const gradient = extractGradient(svg);
    const stroke = extractStroke(svg);

    console.log("CASE", testCase.name);
    console.log("OPTIONS", testCase.options);
    console.log("STROKE", stroke);
    console.log("GRADIENT", JSON.stringify(gradient));
    console.log("");
  }
}

main();
