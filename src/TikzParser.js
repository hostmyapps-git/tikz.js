function createError(message) {
  return new Error("Tikz parse error: " + message);
}

const DEFAULT_COORDINATE_SYSTEM = {
  xBasis: { x: 1, y: 0 },
  yBasis: { x: 0, y: 1 },
  zBasis: { x: 0, y: 0 }
};

function extractPicture(source) {
  const match = source.match(/\\begin\{tikzpicture\}(?:\[([\s\S]*?)\])?([\s\S]*?)\\end\{tikzpicture\}/);

  if (!match) {
    throw createError("missing \\begin{tikzpicture}...\\end{tikzpicture} block");
  }

  return {
    options: match[1] ? parseOptions(match[1].trim()) : {},
    body: match[2].trim()
  };
}

function stripComments(text) {
  return text
    .split("\n")
    .map(function (line) {
      let result = "";

      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === "%" && line[index - 1] !== "\\") {
          break;
        }

        result += line[index];
      }

      return result;
    })
    .join("\n");
}

function splitTopLevel(text, separator) {
  const parts = [];
  let start = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === "{" && text[index - 1] !== "\\") {
      braceDepth += 1;
      continue;
    }

    if (character === "}" && text[index - 1] !== "\\") {
      braceDepth -= 1;
      continue;
    }

    if (character === "[") {
      bracketDepth += 1;
      continue;
    }

    if (character === "]") {
      bracketDepth -= 1;
      continue;
    }

    if (character === "(") {
      parenDepth += 1;
      continue;
    }

    if (character === ")") {
      parenDepth -= 1;
      continue;
    }

    if (character === separator && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      const part = text.slice(start, index).trim();
      if (part) {
        parts.push(part);
      }
      start = index + 1;
    }
  }

  const trailingPart = text.slice(start).trim();
  if (trailingPart) {
    parts.push(trailingPart);
  }

  return parts;
}

function readBalanced(text, startIndex, openCharacter, closeCharacter) {
  if (text[startIndex] !== openCharacter) {
    throw createError("expected '" + openCharacter + "'");
  }

  let depth = 0;

  for (let index = startIndex; index < text.length; index += 1) {
    const character = text[index];

    if (character === openCharacter && text[index - 1] !== "\\") {
      depth += 1;
    } else if (character === closeCharacter && text[index - 1] !== "\\") {
      depth -= 1;
      if (depth === 0) {
        return {
          value: text.slice(startIndex + 1, index),
          endIndex: index
        };
      }
    }
  }

  throw createError("unclosed '" + openCharacter + "'");
}

function readOptionalOptions(text) {
  let remainder = text.trim();
  let options = {};

  if (remainder.startsWith("[")) {
    const balanced = readBalanced(remainder, 0, "[", "]");
    options = parseOptions(balanced.value);
    remainder = remainder.slice(balanced.endIndex + 1).trim();
  }

  return { options, remainder };
}

function parseOptions(text) {
  const options = {};

  for (const part of splitTopLevel(text, ",")) {
    const option = part.trim();
    if (!option) {
      continue;
    }

    const equalIndex = option.indexOf("=");

    if (equalIndex === -1) {
      options[option] = true;
      continue;
    }

    const key = option.slice(0, equalIndex).trim();
    const value = option.slice(equalIndex + 1).trim();
    options[key] = value;
  }

  return options;
}

function mergeOptions(baseOptions, nextOptions) {
  return {
    ...baseOptions,
    ...nextOptions
  };
}

function extractTikzStyles(source) {
  const styles = {};
  let index = 0;

  while (index < source.length) {
    const tikzsetIndex = source.indexOf("\\tikzset", index);
    if (tikzsetIndex === -1) {
      break;
    }

    let cursor = tikzsetIndex + "\\tikzset".length;
    while (/\s/.test(source[cursor])) {
      cursor += 1;
    }

    if (source[cursor] !== "{") {
      index = cursor + 1;
      continue;
    }

    const bodyResult = readBalanced(source, cursor, "{", "}");
    const body = bodyResult.value;
    let bodyIndex = 0;

    while (bodyIndex < body.length) {
      const styleIndex = body.indexOf("/.style", bodyIndex);
      if (styleIndex === -1) {
        break;
      }

      const name = body.slice(bodyIndex, styleIndex).split(",").pop().trim();
      let styleCursor = styleIndex + "/.style".length;
      while (/\s/.test(body[styleCursor])) {
        styleCursor += 1;
      }
      if (body[styleCursor] === "=") {
        styleCursor += 1;
      }
      while (/\s/.test(body[styleCursor])) {
        styleCursor += 1;
      }

      if (body[styleCursor] !== "{") {
        bodyIndex = styleCursor + 1;
        continue;
      }

      const styleBody = readBalanced(body, styleCursor, "{", "}");
      styles[name] = parseOptions(styleBody.value.trim());
      bodyIndex = styleBody.endIndex + 1;
    }

    index = bodyResult.endIndex + 1;
  }

  return styles;
}

function expandStyleOptions(options, styleRegistry) {
  let expanded = { ...options };
  let changed = true;

  while (changed) {
    changed = false;

    for (const [key, value] of Object.entries(expanded)) {
      if (value === true && styleRegistry[key]) {
        delete expanded[key];
        expanded = {
          ...styleRegistry[key],
          ...expanded
        };
        changed = true;
        break;
      }
    }
  }

  return expanded;
}

function parseNumber(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(cm|pt)?$/);

  if (!match) {
    throw createError("invalid number '" + value + "'");
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed)) {
    throw createError("invalid number '" + value + "'");
  }

  if (match[2] === "pt") {
    return parsed / 28.3464567;
  }

  return parsed;
}

function parseCoordinateInner(inner) {
  return parseCoordinateWithSystem(inner, DEFAULT_COORDINATE_SYSTEM);
}

function projectCoordinate(values, coordinateSystem) {
  return {
    x: values.x * coordinateSystem.xBasis.x + values.y * coordinateSystem.yBasis.x + values.z * coordinateSystem.zBasis.x,
    y: values.x * coordinateSystem.xBasis.y + values.y * coordinateSystem.yBasis.y + values.z * coordinateSystem.zBasis.y
  };
}

function parseCoordinateWithSystem(inner, coordinateSystem) {
  const trimmed = inner.trim();
  const parts = splitTopLevel(trimmed, ",");

  const nodeReferenceMatch = trimmed.match(/^([A-Za-z][\w-]*)(?:\.([A-Za-z0-9 ]+))?$/);
  if (parts.length === 1 && !trimmed.includes(":") && nodeReferenceMatch) {
    return {
      type: "nodeRef",
      name: nodeReferenceMatch[1],
      anchor: (nodeReferenceMatch[2] || "center").trim()
    };
  }

  if (parts.length === 1 && trimmed.includes(":")) {
    const polarParts = splitTopLevel(trimmed, ":");

    if (polarParts.length !== 2) {
      throw createError("invalid polar coordinate '" + inner + "'");
    }

    const angle = parseNumber(polarParts[0].trim()) * Math.PI / 180;
    const radius = parseNumber(polarParts[1].trim());

    return projectCoordinate({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      z: 0
    }, coordinateSystem);
  }

  if (parts.length !== 2 && parts.length !== 3) {
    throw createError("coordinates must have two values");
  }

  return projectCoordinate({
    x: parseNumber(parts[0].trim()),
    y: parseNumber(parts[1].trim()),
    z: parts.length === 3 ? parseNumber(parts[2].trim()) : 0
  }, coordinateSystem);
}

function parseCoordinate(text) {
  return parseCoordinateWithText(text, DEFAULT_COORDINATE_SYSTEM);
}

function looksLikeCoordinateContent(text) {
  const trimmed = text.trim();
  return trimmed.includes(",") || trimmed.includes(":");
}

function parseCoordinateWithText(text, coordinateSystem) {
  const coordinate = text.trim();
  if (!coordinate.startsWith("(") || !coordinate.endsWith(")")) {
    throw createError("invalid coordinate '" + text + "'");
  }

  const inner = coordinate.slice(1, -1).trim();
  return parseCoordinateWithSystem(inner, coordinateSystem);
}

function parseRadiusInner(inner) {
  const parts = splitTopLevel(inner, ",");
  if (parts.length === 1) {
    return parseNumber(parts[0].trim());
  }

  if (parts.length === 2) {
    const x = parseNumber(parts[0].trim());
    const y = parseNumber(parts[1].trim());
    if (x !== y) {
      throw createError("v1 only supports circular radii with equal x and y values");
    }
    return x;
  }

  throw createError("invalid circle radius");
}

function readLeadingCoordinate(text, errorMessage) {
  return readLeadingCoordinateWithSystem(text, errorMessage, DEFAULT_COORDINATE_SYSTEM);
}

function readLeadingCoordinateWithSystem(text, errorMessage, coordinateSystem) {
  const trimmed = text.trim();

  if (!trimmed.startsWith("(")) {
    throw createError(errorMessage);
  }

  const coordinateResult = readBalanced(trimmed, 0, "(", ")");

  return {
    point: parseCoordinateWithText("(" + coordinateResult.value + ")", coordinateSystem),
    remainder: trimmed.slice(coordinateResult.endIndex + 1).trim()
  };
}

function unwrapOptionValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseBasisVector(value) {
  return parseCoordinateWithText(unwrapOptionValue(value), DEFAULT_COORDINATE_SYSTEM);
}

function buildCoordinateSystem(pictureOptions) {
  return {
    xBasis: pictureOptions.x ? parseBasisVector(pictureOptions.x) : DEFAULT_COORDINATE_SYSTEM.xBasis,
    yBasis: pictureOptions.y ? parseBasisVector(pictureOptions.y) : DEFAULT_COORDINATE_SYSTEM.yBasis,
    zBasis: pictureOptions.z ? parseBasisVector(pictureOptions.z) : DEFAULT_COORDINATE_SYSTEM.zBasis
  };
}

function consumeDirectionalOptions(options) {
  const directionalKeys = ["above", "below", "left", "right"];
  const offset = { x: 0, y: 0 };
  const activeDirections = [];

  for (const key of Object.keys(options)) {
    if (key.includes(" ")) {
      const parts = key.split(/\s+/).filter(Boolean);
      const allDirectional = parts.length > 1 && parts.every(function (part) {
        return directionalKeys.includes(part);
      });

      if (allDirectional && options[key] === true) {
        for (const part of parts) {
          options[part] = true;
        }
        delete options[key];
      }
    }
  }

  for (const key of directionalKeys) {
    if (options[key]) {
      activeDirections.push(key);
      delete options[key];
    }
  }

  for (const direction of activeDirections) {
    if (direction === "above") {
      offset.y += 0.5;
    } else if (direction === "below") {
      offset.y -= 0.5;
    } else if (direction === "left") {
      offset.x -= 0.5;
    } else if (direction === "right") {
      offset.x += 0.5;
    }
  }

  return {
    offset,
    activeDirections
  };
}

function getCurrentPathPoint(operations) {
  for (let index = operations.length - 1; index >= 0; index -= 1) {
    if (operations[index].point) {
      return operations[index].point;
    }
  }

  return operations[0].point;
}

function parseQuotedLabel(optionsText) {
  const trimmed = optionsText.trim();
  const match = trimmed.match(/^"([\s\S]*)"$/);

  if (!match) {
    throw createError("v1 only supports to-label syntax like [\"text\"]");
  }

  return match[1];
}

function parseTextContent(text) {
  let result = text;
  const hspaceStart = "\uE000";
  const hspaceEnd = "\uE001";
  const lineBreak = "\uE002";
  const nodePart = "\uE003";

  result = result.replace(/\\Huge\b/g, "");
  result = result.replace(/\\footnotesize\b/g, "");
  result = result.replace(/\\scriptsize\b/g, "");
  result = result.replace(/\\small\b/g, "");
  result = result.replace(/\\sffamily\b/g, "");
  result = result.replace(/\\texttt\b/g, "");
  result = result.replace(/\\minus\b/g, "-");
  result = result.replace(/\\nodepart\{[^{}]*\}/g, nodePart);
  result = result.replace(/\\\\/g, lineBreak);

  while (/\\raisebox\{[^{}]*\}\{[^{}]*\}/.test(result)) {
    result = result.replace(/\\raisebox\{[^{}]*\}\{([^{}]*)\}/g, "$1");
  }

  while (/\\smash\{[^{}]*\}/.test(result)) {
    result = result.replace(/\\smash\{([^{}]*)\}/g, "$1");
  }

  while (/\\hspace\{[^{}]*\}/.test(result)) {
    result = result.replace(/\\hspace\{([^{}]*)\}/g, function (_, value) {
      return hspaceStart + value.trim() + hspaceEnd;
    });
  }

  while (/\\hphantom\{[^{}]*\}/.test(result)) {
    result = result.replace(/\\hphantom\{[^{}]*\}/g, "");
  }

  result = result.replace(/\$\{\}\^\\circ\$/g, "°");
  result = result.replace(/\\circ\b/g, "°");
  result = result.replace(/\$/g, "");

  result = result.replace(/[{}]/g, "");
  result = result.replace(/\\/g, "");
  result = result.replace(/\s+/g, " ").trim();
  result = result.replace(new RegExp(lineBreak, "g"), "\n");

  return result;
}

function extractTextLayoutHints(text) {
  let extraWidth = 0;
  const rawPattern = /\\hspace\{([^{}]*)\}/g;
  let match;

  while ((match = rawPattern.exec(text)) !== null) {
    extraWidth += parseNumber(match[1]);
  }

  const hspaceStart = "\uE000";
  const hspaceEnd = "\uE001";
  const placeholderPattern = new RegExp(hspaceStart + "([^" + hspaceEnd + "]+)" + hspaceEnd, "g");

  while ((match = placeholderPattern.exec(text)) !== null) {
    extraWidth += parseNumber(match[1]);
  }

  return { extraWidth };
}

function parseMatrixOptions(text) {
  let options = {};
  let nodeDefaults = {};

  for (const part of splitTopLevel(text, ",")) {
    const option = part.trim();
    if (!option) {
      continue;
    }

    const equalIndex = option.indexOf("=");
    if (equalIndex === -1) {
      options[option] = true;
      continue;
    }

    const key = option.slice(0, equalIndex).trim();
    const value = option.slice(equalIndex + 1).trim();

    if (key === "nodes") {
      nodeDefaults = mergeOptions(nodeDefaults, parseOptions(unwrapOptionValue(value)));
      continue;
    }

    options[key] = value;
  }

  return { options, nodeDefaults };
}

function splitMatrixRows(text) {
  const rows = [];
  let start = 0;
  let braceDepth = 0;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let index = 0; index < text.length - 1; index += 1) {
    const character = text[index];

    if (character === "{" && text[index - 1] !== "\\") {
      braceDepth += 1;
      continue;
    }
    if (character === "}" && text[index - 1] !== "\\") {
      braceDepth -= 1;
      continue;
    }
    if (character === "[") {
      bracketDepth += 1;
      continue;
    }
    if (character === "]") {
      bracketDepth -= 1;
      continue;
    }
    if (character === "(") {
      parenDepth += 1;
      continue;
    }
    if (character === ")") {
      parenDepth -= 1;
      continue;
    }

    if (text[index] === "\\" && text[index + 1] === "\\" && braceDepth === 0 && bracketDepth === 0 && parenDepth === 0) {
      const row = text.slice(start, index).trim();
      if (row) {
        rows.push(row);
      }
      start = index + 2;
      index += 1;
    }
  }

  const trailing = text.slice(start).trim();
  if (trailing) {
    rows.push(trailing);
  }

  return rows;
}

function parseMatrixCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry) {
  const commandText = text.replace(/^\\matrix\s*/, "").trim();
  let remainder = commandText;
  let matrixOptions = {};
  let nodeDefaults = defaultNodeOptions;

  if (remainder.startsWith("[")) {
    const balanced = readBalanced(remainder, 0, "[", "]");
    const parsed = parseMatrixOptions(balanced.value);
    matrixOptions = parsed.options;
    nodeDefaults = mergeNodeOptions(defaultNodeOptions, parsed.nodeDefaults);
    remainder = remainder.slice(balanced.endIndex + 1).trim();
  }

  if (!remainder.startsWith("{")) {
    throw createError("matrix body must be wrapped in braces");
  }

  const bodyResult = readBalanced(remainder, 0, "{", "}");
  const rows = splitMatrixRows(bodyResult.value).map(function (row) {
    return splitTopLevel(row, "&").map(function (cell) {
      const trimmed = cell.trim();
      if (!trimmed) {
        return null;
      }
      if (trimmed.startsWith("\\node")) {
        return parseNodeCommand(trimmed, nodeDefaults, coordinateSystem, styleRegistry);
      }
      return {
        type: "node",
        name: null,
        options: nodeDefaults,
        point: { x: 0, y: 0 },
        anchor: [],
        placementAnchor: null,
        text: parseTextContent(trimmed),
        textLayoutHints: extractTextLayoutHints(trimmed),
        fontStyle: buildNodeFormatting(nodeDefaults, trimmed, nodeDefaults)
      };
    }).filter(Boolean);
  }).filter(function (row) {
    return row.length > 0;
  });

  return {
    type: "matrix",
    options: matrixOptions,
    rows
  };
}

function parseFontStyle(text) {
  const fontStyle = {
    fontFamily: null,
    fontSize: null
  };

  if (!text) {
    return fontStyle;
  }

  if (/\\sffamily\b/.test(text)) {
    fontStyle.fontFamily = '"Latin Modern Sans", "LM Sans 10", "CMU Sans Serif", "Computer Modern Sans", "TeX Gyre Heros", "Helvetica Neue", Helvetica, Arial, sans-serif';
  }

  if (/\\texttt\b/.test(text)) {
    fontStyle.fontFamily = '"Latin Modern Mono", "LM Mono 10", "CMU Typewriter Text", "Courier New", Courier, monospace';
  }

  if (/\\Huge\b/.test(text)) {
    fontStyle.fontSize = 24;
  } else if (/\\footnotesize\b/.test(text)) {
    fontStyle.fontSize = 10;
  } else if (/\\scriptsize\b/.test(text)) {
    fontStyle.fontSize = 9;
  } else if (/\\small\b/.test(text)) {
    fontStyle.fontSize = 11.5;
  }

  return fontStyle;
}

function mergeFontStyle(baseStyle, extraStyle) {
  return {
    fontFamily: extraStyle.fontFamily || baseStyle.fontFamily || null,
    fontSize: extraStyle.fontSize || baseStyle.fontSize || null
  };
}

function extractEveryNodeStyle(pictureOptions) {
  const rawStyle = pictureOptions["every node/.style"];

  if (typeof rawStyle !== "string") {
    return {};
  }

  const trimmed = rawStyle.trim();
  const inner = trimmed.startsWith("{") && trimmed.endsWith("}")
    ? trimmed.slice(1, -1)
    : trimmed;

  return parseOptions(inner);
}

function buildNodeFormatting(options, rawText, defaultOptions) {
  const defaultFontStyle = parseFontStyle(defaultOptions.font || "");
  const optionFontStyle = parseFontStyle(options.font || "");
  const textFontStyle = parseFontStyle(rawText);

  return mergeFontStyle(
    mergeFontStyle(defaultFontStyle, optionFontStyle),
    textFontStyle
  );
}

function applyNodeShift(point, options) {
  const shiftedPoint = { x: point.x, y: point.y };

  if (typeof options.xshift === "string") {
    shiftedPoint.x += parseNumber(options.xshift);
  }

  if (typeof options.yshift === "string") {
    shiftedPoint.y += parseNumber(options.yshift);
  }

  return shiftedPoint;
}

function parseArcGroup(inner, currentPoint) {
  const parts = splitTopLevel(inner, ":");

  if (parts.length !== 3) {
    throw createError("arc must use syntax (start:end:radius)");
  }

  const startAngle = parseNumber(parts[0].trim());
  const endAngle = parseNumber(parts[1].trim());
  const radius = parseNumber(parts[2].trim());
  const startRadians = startAngle * Math.PI / 180;
  const endRadians = endAngle * Math.PI / 180;
  const center = {
    x: currentPoint.x - Math.cos(startRadians) * radius,
    y: currentPoint.y - Math.sin(startRadians) * radius
  };

  return {
    type: "arc",
    startAngle,
    endAngle,
    radius,
    center,
    point: {
      x: center.x + Math.cos(endRadians) * radius,
      y: center.y + Math.sin(endRadians) * radius
    }
  };
}

function parseEllipseOperation(options) {
  const xRadius = options["x radius"] ? parseNumber(options["x radius"]) : null;
  const yRadius = options["y radius"] ? parseNumber(options["y radius"]) : null;
  const radius = options.radius ? parseNumber(options.radius) : null;

  if (radius !== null) {
    if (radius <= 0) {
      throw createError("circle radius must be positive");
    }

    return {
      type: "ellipse",
      xRadius: radius,
      yRadius: radius
    };
  }

  if (xRadius === null && yRadius === null) {
    throw createError("ellipse requires x radius/y radius or circle requires radius");
  }

  const resolvedXRadius = xRadius === null ? yRadius : xRadius;
  const resolvedYRadius = yRadius === null ? xRadius : yRadius;

  if (resolvedXRadius <= 0 || resolvedYRadius <= 0) {
    throw createError("ellipse radii must be positive");
  }

  return {
    type: "ellipse",
    xRadius: resolvedXRadius,
    yRadius: resolvedYRadius
  };
}

function parseArcOptions(options, currentPoint, coordinateSystem) {
  const startAngle = options["start angle"] !== undefined ? parseNumber(options["start angle"]) : null;
  const endAngle = options["end angle"] !== undefined ? parseNumber(options["end angle"]) : null;
  const xRadius = options["x radius"] !== undefined ? parseNumber(options["x radius"]) : null;
  const yRadius = options["y radius"] !== undefined ? parseNumber(options["y radius"]) : null;
  const radius = options.radius !== undefined ? parseNumber(options.radius) : null;

  if (startAngle === null || endAngle === null) {
    throw createError("arc options require start angle and end angle");
  }

  const resolvedXRadius = radius !== null ? radius : xRadius;
  const resolvedYRadius = radius !== null ? radius : (yRadius === null ? xRadius : yRadius);

  if (!Number.isFinite(resolvedXRadius) || !Number.isFinite(resolvedYRadius)) {
    throw createError("arc options require x radius/y radius or radius");
  }

  if (resolvedXRadius <= 0 || resolvedYRadius <= 0) {
    throw createError("arc radii must be positive");
  }

  const startRadians = startAngle * Math.PI / 180;
  const endRadians = endAngle * Math.PI / 180;
  const xAxis = coordinateSystem.xBasis;
  const yAxis = coordinateSystem.yBasis;
  const center = {
    x: currentPoint.x - Math.cos(startRadians) * resolvedXRadius * xAxis.x - Math.sin(startRadians) * resolvedYRadius * yAxis.x,
    y: currentPoint.y - Math.cos(startRadians) * resolvedXRadius * xAxis.y - Math.sin(startRadians) * resolvedYRadius * yAxis.y
  };

  return {
    type: "arc",
    startAngle,
    endAngle,
    xRadius: resolvedXRadius,
    yRadius: resolvedYRadius,
    center,
    point: {
      x: center.x + Math.cos(endRadians) * resolvedXRadius * xAxis.x + Math.sin(endRadians) * resolvedYRadius * yAxis.x,
      y: center.y + Math.cos(endRadians) * resolvedXRadius * xAxis.y + Math.sin(endRadians) * resolvedYRadius * yAxis.y
    }
  };
}

function applyRelativePoint(basePoint, offsetPoint) {
  return {
    x: basePoint.x + offsetPoint.x,
    y: basePoint.y + offsetPoint.y
  };
}

function mergeNodeOptions(defaultOptions, options) {
  return {
    ...defaultOptions,
    ...options
  };
}

function parseCoordinateList(text, coordinateSystem) {
  const points = [];
  const matches = text.matchAll(/\(([^()]*)\)/g);

  for (const match of matches) {
    points.push(parseCoordinateWithSystem(match[1], coordinateSystem));
  }

  return points;
}

function expandForeachLoops(text) {
  let index = 0;
  let result = "";

  while (index < text.length) {
    const foreachIndex = text.indexOf("\\foreach", index);

    if (foreachIndex === -1) {
      result += text.slice(index);
      break;
    }

    result += text.slice(index, foreachIndex);

    let cursor = foreachIndex + "\\foreach".length;
    while (/\s/.test(text[cursor])) {
      cursor += 1;
    }

    const inMatch = text.slice(cursor).match(/^(.*?)\s+in\s+/s);
    if (!inMatch) {
      result += text.slice(foreachIndex);
      break;
    }

    const variablesText = inMatch[1].trim();
    cursor += inMatch[0].length;

    while (/\s/.test(text[cursor])) {
      cursor += 1;
    }

    if (text[cursor] !== "{") {
      result += text.slice(foreachIndex, cursor + 1);
      index = cursor + 1;
      continue;
    }

    const itemsResult = readBalanced(text, cursor, "{", "}");
    const itemsText = itemsResult.value;
    cursor = itemsResult.endIndex + 1;

    while (/\s/.test(text[cursor])) {
      cursor += 1;
    }

    const templateStart = cursor;
    while (cursor < text.length && text[cursor] !== ";") {
      cursor += 1;
    }

    const template = text.slice(templateStart, cursor + 1).trim();
    const variables = variablesText.split("/");
    const items = splitTopLevel(itemsText, ",");
    const expanded = [];

    for (const item of items) {
      const values = splitTopLevel(item, "/");
      let command = template;

      for (let variableIndex = 0; variableIndex < variables.length; variableIndex += 1) {
        const variable = variables[variableIndex].trim();
        const value = (values[variableIndex] || "").trim();
        const escapedVariable = variable.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        command = command.replace(new RegExp(escapedVariable + "\\b", "g"), value);
      }

      expanded.push(command);
    }

    result += expanded.join("\n");
    index = cursor + 1;
  }

  return result;
}

function parseInlineNode(tokens, startIndex, point, defaultNodeOptions) {
  let index = startIndex + 1;
  let options = {};
  let name = null;

  if (tokens[index] && tokens[index].type === "group" && !looksLikeCoordinateContent(tokens[index].value)) {
    name = tokens[index].value.trim();
    index += 1;
  }

  if (tokens[index] && tokens[index].type === "options") {
    options = parseOptions(tokens[index].value);
    index += 1;
  }

  if (!tokens[index] || tokens[index].type !== "brace") {
    throw createError("node text must be wrapped in braces");
  }

  options = mergeNodeOptions(defaultNodeOptions, options);
  if (!name && typeof options.name === "string") {
    name = options.name.trim();
  }
  delete options.name;
  const placementAnchor = typeof options.anchor === "string" ? options.anchor.trim() : null;
  delete options.anchor;

  const directionData = consumeDirectionalOptions(options);
  const rawText = tokens[index].value;

  return {
    operation: {
      type: "node",
      name,
      point: applyNodeShift(point, options),
      options,
      anchor: directionData.activeDirections,
      placementAnchor,
      text: parseTextContent(rawText),
      textLayoutHints: extractTextLayoutHints(rawText),
      fontStyle: buildNodeFormatting(options, rawText, defaultNodeOptions)
    },
    nextIndex: index + 1
  };
}

function parsePlotOperation(tokens, startIndex, coordinateSystem) {
  let index = startIndex + 1;
  let plotOptions = {};

  if (tokens[index] && tokens[index].type === "options") {
    plotOptions = parseOptions(tokens[index].value);
    index += 1;
  }

  if (!tokens[index] || tokens[index].type !== "keyword" || tokens[index].value !== "coordinates") {
    throw createError("plot must be followed by coordinates{...}");
  }

  if (!tokens[index + 1] || tokens[index + 1].type !== "brace") {
    throw createError("plot coordinates must be wrapped in braces");
  }

  return {
    operation: {
      type: "plot",
      mark: plotOptions.mark || null,
      points: parseCoordinateList(tokens[index + 1].value, coordinateSystem)
    },
    nextIndex: index + 2
  };
}

function tokenizePath(text) {
  const tokens = [];
  let index = 0;

  while (index < text.length) {
    const character = text[index];

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (text.startsWith("--", index)) {
      tokens.push({ type: "operator", value: "--" });
      index += 2;
      continue;
    }

    if (text.startsWith("++", index)) {
      tokens.push({ type: "operator", value: "++" });
      index += 2;
      continue;
    }

    if (character === "+") {
      tokens.push({ type: "operator", value: "+" });
      index += 1;
      continue;
    }

    if (text.startsWith("|-", index)) {
      tokens.push({ type: "operator", value: "|-" });
      index += 2;
      continue;
    }

    if (text.startsWith("-|", index)) {
      tokens.push({ type: "operator", value: "-|" });
      index += 2;
      continue;
    }

    if (text.startsWith("..", index)) {
      tokens.push({ type: "operator", value: ".." });
      index += 2;
      continue;
    }

    if (character === "[") {
      const balanced = readBalanced(text, index, "[", "]");
      tokens.push({ type: "options", value: balanced.value.trim() });
      index = balanced.endIndex + 1;
      continue;
    }

    if (character === "{") {
      const balanced = readBalanced(text, index, "{", "}");
      tokens.push({ type: "brace", value: balanced.value });
      index = balanced.endIndex + 1;
      continue;
    }

    if (character === "(") {
      const balanced = readBalanced(text, index, "(", ")");
      tokens.push({ type: "group", value: balanced.value.trim() });
      index = balanced.endIndex + 1;
      continue;
    }

    if (/[a-zA-Z]/.test(character)) {
      let endIndex = index + 1;
      while (endIndex < text.length && /[a-zA-Z ]/.test(text[endIndex])) {
        endIndex += 1;
      }

      const value = text.slice(index, endIndex).trim();
      tokens.push({ type: "keyword", value });
      index = endIndex;
      continue;
    }

    throw createError("unexpected path token near '" + text.slice(index, index + 20) + "'");
  }

  return tokens;
}

function parsePath(text, defaultNodeOptions = {}, coordinateSystem = DEFAULT_COORDINATE_SYSTEM) {
  const tokens = tokenizePath(text);

  if (tokens.length === 0) {
    throw createError("empty path command");
  }

  const firstToken = tokens[0];
  let index = 0;
  let operations = [];

  if (firstToken.type === "group") {
    operations = [{ type: "move", point: parseCoordinateWithSystem(firstToken.value, coordinateSystem) }];
    index = 1;
  } else if (firstToken.type === "keyword" && firstToken.value === "circle") {
    operations = [{ type: "move", point: { x: 0, y: 0 } }];
  } else if (firstToken.type === "keyword" && firstToken.value === "plot") {
    operations = [{ type: "move", point: { x: 0, y: 0 } }];
  } else {
    throw createError("path must start with a coordinate");
  }

  while (index < tokens.length) {
    const token = tokens[index];
    const currentPoint = getCurrentPathPoint(operations);

    if (token.type === "operator" && token.value === "--") {
      const nextToken = tokens[index + 1];
      if (!nextToken) {
        throw createError("'--' must be followed by a coordinate");
      }

      if (nextToken.type === "keyword" && nextToken.value === "cycle") {
        operations.push({ type: "close" });
        index += 2;
        continue;
      }

      if (nextToken.type === "operator" && (nextToken.value === "+" || nextToken.value === "++")) {
        const relativeCoordinateToken = tokens[index + 2];

        if (!relativeCoordinateToken || relativeCoordinateToken.type !== "group") {
          throw createError("'" + nextToken.value + "' must be followed by a coordinate");
        }

        const offsetPoint = parseCoordinateWithSystem(relativeCoordinateToken.value, coordinateSystem);
        const basePoint = nextToken.value === "++" ? currentPoint : operations[0].point;
        const resolvedPoint = applyRelativePoint(basePoint, offsetPoint);
        operations.push({ type: "line", point: resolvedPoint });
        index += 3;
        continue;
      }

      if (nextToken.type !== "group") {
        throw createError("'--' must be followed by a coordinate");
      }

      operations.push({ type: "line", point: parseCoordinateWithSystem(nextToken.value, coordinateSystem) });
      index += 2;
      continue;
    }

    if (token.type === "operator" && (token.value === "+" || token.value === "++")) {
      const nextToken = tokens[index + 1];

      if (!nextToken || nextToken.type !== "group") {
        throw createError("'" + token.value + "' must be followed by a coordinate");
      }

      const offsetPoint = parseCoordinateWithSystem(nextToken.value, coordinateSystem);
      const basePoint = token.value === "++" ? currentPoint : operations[0].point;
      const resolvedPoint = applyRelativePoint(basePoint, offsetPoint);

      operations.push({ type: "line", point: resolvedPoint });
      index += 2;
      continue;
    }

    if (token.type === "keyword" && token.value === "to") {
      let label = null;
      let nextIndex = index + 1;
      const optionsToken = tokens[nextIndex];

      if (optionsToken && optionsToken.type === "options") {
        label = parseQuotedLabel(optionsToken.value);
        nextIndex += 1;
      }

      const nextToken = tokens[nextIndex];
      if (!nextToken || nextToken.type !== "group") {
        throw createError("'to' must be followed by a coordinate");
      }

      operations.push({
        type: "line",
        point: parseCoordinateWithSystem(nextToken.value, coordinateSystem),
        label
      });
      index = nextIndex + 1;
      continue;
    }

    if (token.type === "keyword" && token.value === "node") {
      const inlineNode = parseInlineNode(tokens, index, getCurrentPathPoint(operations), defaultNodeOptions);
      operations.push(inlineNode.operation);
      index = inlineNode.nextIndex;
      continue;
    }

    if (token.type === "keyword" && token.value === "plot") {
      const plotOperation = parsePlotOperation(tokens, index, coordinateSystem);
      operations.push(plotOperation.operation);
      index = plotOperation.nextIndex;
      continue;
    }

    if (token.type === "group") {
      operations.push({ type: "move", point: parseCoordinateWithSystem(token.value, coordinateSystem) });
      index += 1;
      continue;
    }

    if (token.type === "operator" && (token.value === "|-" || token.value === "-|")) {
      const nextToken = tokens[index + 1];

      if (!nextToken || nextToken.type !== "group") {
        throw createError("'" + token.value + "' must be followed by a coordinate");
      }

      const targetPoint = parseCoordinateWithSystem(nextToken.value, coordinateSystem);
      const cornerPoint = token.value === "|-"
        ? { x: currentPoint.x, y: targetPoint.y }
        : { x: targetPoint.x, y: currentPoint.y };

      operations.push({ type: "line", point: cornerPoint });
      operations.push({ type: "line", point: targetPoint });
      index += 2;
      continue;
    }

    if (token.type === "keyword" && token.value === "rectangle") {
      const nextToken = tokens[index + 1];
      if (!nextToken || nextToken.type !== "group") {
        throw createError("'rectangle' must be followed by a coordinate");
      }

      operations.push({ type: "rectangle", point: parseCoordinateWithSystem(nextToken.value, coordinateSystem) });
      index += 2;
      continue;
    }

    if (token.type === "keyword" && token.value === "grid") {
      const nextToken = tokens[index + 1];
      if (!nextToken || nextToken.type !== "group") {
        throw createError("'grid' must be followed by a coordinate");
      }

      operations.push({ type: "grid", point: parseCoordinateWithSystem(nextToken.value, coordinateSystem) });
      index += 2;
      continue;
    }

    if (token.type === "keyword" && token.value === "arc") {
      const nextToken = tokens[index + 1];
      if (!nextToken) {
        throw createError("'arc' must be followed by a group or options");
      }

      if (nextToken.type === "group") {
        operations.push(parseArcGroup(nextToken.value, getCurrentPathPoint(operations)));
        index += 2;
        continue;
      }

      if (nextToken.type === "options") {
        operations.push(parseArcOptions(parseOptions(nextToken.value), getCurrentPathPoint(operations), coordinateSystem));
        index += 2;
        continue;
      }

      throw createError("'arc' must be followed by a group like (0:60:1cm) or option list");
    }

    if (token.type === "keyword" && token.value === "ellipse") {
      const nextToken = tokens[index + 1];
      if (!nextToken || nextToken.type !== "options") {
        throw createError("'ellipse' must be followed by options like [x radius=..., y radius=...]");
      }

      operations.push(parseEllipseOperation(parseOptions(nextToken.value)));
      index += 2;
      continue;
    }

    if (token.type === "operator" && token.value === "..") {
      const firstToken = tokens[index + 1];

      if (!firstToken) {
        throw createError("'..' must be followed by curve syntax");
      }

      if (firstToken.type === "keyword" && firstToken.value === "controls") {
        const controlOneToken = tokens[index + 2];
        const andToken = tokens[index + 3];
        const controlTwoToken = tokens[index + 4];
        const middleOperator = tokens[index + 5];
        const endToken = tokens[index + 6];

        if (!controlOneToken || controlOneToken.type !== "group") {
          throw createError("curve controls must include the first control coordinate");
        }

        if (!andToken || andToken.type !== "keyword" || andToken.value !== "and") {
          throw createError("curve controls must use 'and' between control coordinates");
        }

        if (!controlTwoToken || controlTwoToken.type !== "group") {
          throw createError("curve controls must include the second control coordinate");
        }

        if (!middleOperator || middleOperator.type !== "operator" || middleOperator.value !== "..") {
          throw createError("curve controls must be followed by '.. (x,y)'");
        }

        if (!endToken || endToken.type !== "group") {
          throw createError("curve controls must end at a coordinate");
        }

        operations.push({
          type: "curve",
          controlOne: parseCoordinateWithSystem(controlOneToken.value, coordinateSystem),
          controlTwo: parseCoordinateWithSystem(controlTwoToken.value, coordinateSystem),
          point: parseCoordinateWithSystem(endToken.value, coordinateSystem)
        });
        index += 7;
        continue;
      }

      throw createError("v1 curves must use '.. controls (x1,y1) and (x2,y2) .. (x,y)'");
    }

    if (token.type === "keyword" && token.value === "circle") {
      const nextToken = tokens[index + 1];
      if (!nextToken) {
        throw createError("'circle' must be followed by a radius coordinate or options");
      }

      if (nextToken.type === "options") {
        operations.push(parseEllipseOperation(parseOptions(nextToken.value)));
        index += 2;
        continue;
      }

      if (nextToken.type !== "group") {
        throw createError("'circle' must be followed by a radius coordinate like (0.5) or (0.5,0.5)");
      }

      const radius = parseRadiusInner(nextToken.value);
      if (radius <= 0) {
        throw createError("circle radius must be positive");
      }

      operations.push({ type: "ellipse", xRadius: radius, yRadius: radius });
      index += 2;
      continue;
    }

    if (token.type === "keyword" && token.value === "cycle") {
      operations.push({ type: "close" });
      index += 1;
      continue;
    }

    throw createError("unsupported path syntax near '" + token.value + "'");
  }

  return operations;
}

function parseDrawLikeCommand(type, text, defaultNodeOptions, coordinateSystem, styleRegistry) {
  const commandText = text.replace(/^\\(draw|fill)\s*/, "");
  const parsed = readOptionalOptions(commandText);
  const options = expandStyleOptions(parsed.options, styleRegistry);
  const remainder = parsed.remainder;

  if (typeof options.shift === "string") {
    options.shiftPoint = parseCoordinateWithText(options.shift, coordinateSystem);
  }

  return {
    type,
    options,
    operations: parsePath(remainder, defaultNodeOptions, coordinateSystem)
  };
}

function parseNodeCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry) {
  let remainder = text.replace(/^\\node\s*/, "").trim();
  let name = null;

  if (remainder.startsWith("(")) {
    const possibleName = readBalanced(remainder, 0, "(", ")");
    if (!looksLikeCoordinateContent(possibleName.value)) {
      name = possibleName.value.trim();
      remainder = remainder.slice(possibleName.endIndex + 1).trim();
    }
  }

  const leadingOptions = readOptionalOptions(remainder);
  let options = mergeNodeOptions(defaultNodeOptions, expandStyleOptions(leadingOptions.options, styleRegistry));
  if (!name && typeof options.name === "string") {
    name = options.name.trim();
  }
  delete options.name;
  remainder = leadingOptions.remainder;
  let point = null;

  if (remainder.startsWith("at")) {
    remainder = remainder.slice(2).trim();
    const positionData = readLeadingCoordinateWithSystem(remainder, "node position must be a coordinate", coordinateSystem);
    point = positionData.point;
    remainder = positionData.remainder;
  } else {
    if (remainder.startsWith("{")) {
      point = { x: 0, y: 0 };
    } else {
      const positionData = readLeadingCoordinateWithSystem(remainder, "node syntax must use '(x,y)' or 'at (x,y)'", coordinateSystem);
      point = positionData.point;
      remainder = positionData.remainder;
    }
  }

  const trailingOptions = readOptionalOptions(remainder);
  options = mergeNodeOptions(options, expandStyleOptions(trailingOptions.options, styleRegistry));
  remainder = trailingOptions.remainder;
  const placementAnchor = typeof options.anchor === "string" ? options.anchor.trim() : null;
  delete options.anchor;
  const directionData = consumeDirectionalOptions(options);

  if (!remainder.startsWith("{")) {
    throw createError("node text must be wrapped in braces");
  }

  const textResult = readBalanced(remainder, 0, "{", "}");
  const rawText = textResult.value;

  return {
    type: "node",
    name,
    options,
    point: applyNodeShift(point, options),
    anchor: directionData.activeDirections,
    placementAnchor,
    text: parseTextContent(rawText),
    textLayoutHints: extractTextLayoutHints(rawText),
    fontStyle: buildNodeFormatting(options, rawText, defaultNodeOptions)
  };
}

function parseCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry) {
  if (text.startsWith("\\draw")) {
    return parseDrawLikeCommand("draw", text, defaultNodeOptions, coordinateSystem, styleRegistry);
  }

  if (text.startsWith("\\fill")) {
    return parseDrawLikeCommand("fill", text, defaultNodeOptions, coordinateSystem, styleRegistry);
  }

  if (text.startsWith("\\node")) {
    return parseNodeCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry);
  }

  if (text.startsWith("\\matrix")) {
    return parseMatrixCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry);
  }

  throw createError("unsupported command '" + text.split(/\s+/)[0] + "'");
}

function parse(source) {
  const picture = extractPicture(source);
  const styleRegistry = extractTikzStyles(source);
  const coordinateSystem = buildCoordinateSystem(picture.options);
  const defaultNodeOptions = {
    ...(picture.options.font ? { font: picture.options.font } : {}),
    ...extractEveryNodeStyle(picture.options)
  };
  const body = expandForeachLoops(stripComments(picture.body));
  const commands = splitTopLevel(body, ";").map(function (command) {
    return parseCommand(command, defaultNodeOptions, coordinateSystem, styleRegistry);
  });

  return {
    type: "TikzPicture",
    coordinateSystem,
    commands
  };
}

export { parse };
