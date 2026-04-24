var Tikz = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default,
    renderAll: () => renderAll,
    renderElement: () => renderElement,
    renderToSvg: () => renderToSvg
  });

  // src/TikzParser.js
  function createError(message) {
    return new Error("Tikz parse error: " + message);
  }
  var DEFAULT_COORDINATE_SYSTEM = {
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
    return text.split("\n").map(function(line) {
      let result = "";
      for (let index = 0; index < line.length; index += 1) {
        if (line[index] === "%" && line[index - 1] !== "\\") {
          break;
        }
        result += line[index];
      }
      return result;
    }).join("\n");
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
        const allDirectional = parts.length > 1 && parts.every(function(part) {
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
      throw createError('v1 only supports to-label syntax like ["text"]');
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
      result = result.replace(/\\hspace\{([^{}]*)\}/g, function(_, value) {
        return hspaceStart + value.trim() + hspaceEnd;
      });
    }
    while (/\\hphantom\{[^{}]*\}/.test(result)) {
      result = result.replace(/\\hphantom\{[^{}]*\}/g, "");
    }
    result = result.replace(/\$\{\}\^\\circ\$/g, "\xB0");
    result = result.replace(/\\circ\b/g, "\xB0");
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
  function parseMatrixCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions = {}) {
    const commandText = text.replace(/^\\matrix\s*/, "").trim();
    let remainder = commandText;
    let matrixOptions = inheritedOptions;
    let nodeDefaults = mergeNodeOptions(inheritedOptions, defaultNodeOptions);
    if (remainder.startsWith("[")) {
      const balanced = readBalanced(remainder, 0, "[", "]");
      const parsed = parseMatrixOptions(balanced.value);
      matrixOptions = mergeOptions(inheritedOptions, parsed.options);
      nodeDefaults = mergeNodeOptions(defaultNodeOptions, parsed.nodeDefaults);
      remainder = remainder.slice(balanced.endIndex + 1).trim();
    }
    if (!remainder.startsWith("{")) {
      throw createError("matrix body must be wrapped in braces");
    }
    const bodyResult = readBalanced(remainder, 0, "{", "}");
    const rows = splitMatrixRows(bodyResult.value).map(function(row) {
      return splitTopLevel(row, "&").map(function(cell) {
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
    }).filter(function(row) {
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
    const inner = trimmed.startsWith("{") && trimmed.endsWith("}") ? trimmed.slice(1, -1) : trimmed;
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
  function resolveShiftPoint(options, coordinateSystem) {
    let shiftPoint = null;
    if (typeof options.shift === "string") {
      shiftPoint = parseCoordinateWithText(options.shift, coordinateSystem);
    } else if (options.shiftPoint) {
      shiftPoint = options.shiftPoint;
    }
    const xShift = typeof options.xshift === "string" ? parseNumber(options.xshift) : 0;
    const yShift = typeof options.yshift === "string" ? parseNumber(options.yshift) : 0;
    if (!shiftPoint && xShift === 0 && yShift === 0) {
      return null;
    }
    if (shiftPoint && shiftPoint.type === "nodeRef") {
      if (xShift === 0 && yShift === 0) {
        return shiftPoint;
      }
      return {
        type: "shiftedPoint",
        basePoint: shiftPoint,
        offset: { x: xShift, y: yShift }
      };
    }
    return {
      x: (shiftPoint ? shiftPoint.x : 0) + xShift,
      y: (shiftPoint ? shiftPoint.y : 0) + yShift
    };
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
    const startAngle = options["start angle"] !== void 0 ? parseNumber(options["start angle"]) : null;
    const endAngle = options["end angle"] !== void 0 ? parseNumber(options["end angle"]) : null;
    const xRadius = options["x radius"] !== void 0 ? parseNumber(options["x radius"]) : null;
    const yRadius = options["y radius"] !== void 0 ? parseNumber(options["y radius"]) : null;
    const radius = options.radius !== void 0 ? parseNumber(options.radius) : null;
    if (startAngle === null || endAngle === null) {
      throw createError("arc options require start angle and end angle");
    }
    const resolvedXRadius = radius !== null ? radius : xRadius;
    const resolvedYRadius = radius !== null ? radius : yRadius === null ? xRadius : yRadius;
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
  function parseMindmapNodeBody(bodyText, defaultNodeOptions, coordinateSystem, styleRegistry) {
    let remainder = bodyText.trim();
    let name = null;
    if (remainder.startsWith("node")) {
      remainder = remainder.slice(4).trim();
    }
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
    } else if (remainder.startsWith("{")) {
      point = { x: 0, y: 0 };
    } else if (remainder.startsWith("(")) {
      const positionData = readLeadingCoordinateWithSystem(remainder, "node syntax must use '(x,y)' or 'at (x,y)'", coordinateSystem);
      point = positionData.point;
      remainder = positionData.remainder;
    } else {
      point = { x: 0, y: 0 };
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
    remainder = remainder.slice(textResult.endIndex + 1).trim();
    const parsedNode = {
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
    return {
      node: parsedNode,
      remainder
    };
  }
  function parseMindmapChild(text, defaultNodeOptions, coordinateSystem, styleRegistry) {
    let remainder = text.trim();
    if (!remainder.startsWith("child")) {
      throw createError("expected child block");
    }
    remainder = remainder.slice(5).trim();
    const childOptionsResult = readOptionalOptions(remainder);
    const childOptions = expandStyleOptions(childOptionsResult.options, styleRegistry);
    remainder = childOptionsResult.remainder;
    if (!remainder.startsWith("{")) {
      throw createError("child body must be wrapped in braces");
    }
    const childBody = readBalanced(remainder, 0, "{", "}");
    const nodeData = parseMindmapNodeBody(childBody.value.trim(), defaultNodeOptions, coordinateSystem, styleRegistry);
    const parsedChildren = parseMindmapChildren(nodeData.remainder, defaultNodeOptions, coordinateSystem, styleRegistry);
    return {
      child: {
        options: childOptions,
        node: {
          ...nodeData.node,
          children: parsedChildren.children
        }
      },
      remainder: remainder.slice(childBody.endIndex + 1).trim()
    };
  }
  function parseMindmapChildren(text, defaultNodeOptions, coordinateSystem, styleRegistry) {
    const children = [];
    let remainder = text.trim();
    while (remainder.startsWith("child")) {
      const childResult = parseMindmapChild(remainder, defaultNodeOptions, coordinateSystem, styleRegistry);
      children.push(childResult.child);
      remainder = childResult.remainder;
    }
    return {
      children,
      remainder
    };
  }
  function parseMindmapPathCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry) {
    const commandText = text.replace(/^\\path\s*/, "");
    const parsed = readOptionalOptions(commandText);
    const options = expandStyleOptions(parsed.options, styleRegistry);
    const rootResult = parseMindmapNodeBody(parsed.remainder, defaultNodeOptions, coordinateSystem, styleRegistry);
    const rootOptionsResult = readOptionalOptions(rootResult.remainder);
    const childResult = parseMindmapChildren(rootOptionsResult.remainder, defaultNodeOptions, coordinateSystem, styleRegistry);
    if (childResult.remainder && childResult.remainder !== ";") {
      throw createError("unsupported path syntax near '" + childResult.remainder.split(/\s+/)[0] + "'");
    }
    return {
      type: "mindmap",
      options,
      root: {
        ...rootResult.node,
        options: mergeNodeOptions(rootResult.node.options, expandStyleOptions(rootOptionsResult.options, styleRegistry)),
        children: childResult.children
      }
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
        const cornerPoint = token.value === "|-" ? { x: currentPoint.x, y: targetPoint.y } : { x: targetPoint.x, y: currentPoint.y };
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
        const firstToken2 = tokens[index + 1];
        if (!firstToken2) {
          throw createError("'..' must be followed by curve syntax");
        }
        if (firstToken2.type === "keyword" && firstToken2.value === "controls") {
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
  function parseDrawLikeCommand(type, text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions = {}) {
    const commandText = text.replace(/^\\(draw|fill)\s*/, "");
    const parsed = readOptionalOptions(commandText);
    const options = mergeOptions(inheritedOptions, expandStyleOptions(parsed.options, styleRegistry));
    const remainder = parsed.remainder;
    const shiftPoint = resolveShiftPoint(options, coordinateSystem);
    if (shiftPoint) {
      options.shiftPoint = shiftPoint;
    }
    return {
      type,
      options,
      operations: parsePath(remainder, mergeNodeOptions(inheritedOptions, defaultNodeOptions), coordinateSystem)
    };
  }
  function parseNodeCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions = {}) {
    const nodeData = parseMindmapNodeBody(text.replace(/^\\node\s*/, "").trim(), mergeNodeOptions(inheritedOptions, defaultNodeOptions), coordinateSystem, styleRegistry);
    const rootOptionsResult = readOptionalOptions(nodeData.remainder);
    const normalizedNode = {
      ...nodeData.node,
      options: mergeNodeOptions(nodeData.node.options, expandStyleOptions(rootOptionsResult.options, styleRegistry))
    };
    const childResult = parseMindmapChildren(rootOptionsResult.remainder, mergeNodeOptions(inheritedOptions, defaultNodeOptions), coordinateSystem, styleRegistry);
    if (childResult.children.length > 0) {
      if (childResult.remainder && childResult.remainder !== ";") {
        throw createError("unsupported node syntax near '" + childResult.remainder.split(/\s+/)[0] + "'");
      }
      return {
        type: "mindmap",
        options: {},
        root: {
          ...normalizedNode,
          children: childResult.children
        }
      };
    }
    if (childResult.remainder && childResult.remainder !== ";") {
      throw createError("unsupported node syntax near '" + childResult.remainder.split(/\s+/)[0] + "'");
    }
    return normalizedNode;
  }
  function parseCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions = {}) {
    if (text.startsWith("\\draw")) {
      return parseDrawLikeCommand("draw", text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions);
    }
    if (text.startsWith("\\fill")) {
      return parseDrawLikeCommand("fill", text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions);
    }
    if (text.startsWith("\\node")) {
      return parseNodeCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions);
    }
    if (text.startsWith("\\path")) {
      return parseMindmapPathCommand(text, mergeNodeOptions(inheritedOptions, defaultNodeOptions), coordinateSystem, styleRegistry);
    }
    if (text.startsWith("\\matrix")) {
      return parseMatrixCommand(text, defaultNodeOptions, coordinateSystem, styleRegistry, inheritedOptions);
    }
    throw createError("unsupported command '" + text.split(/\s+/)[0] + "'");
  }
  function parseStable(source) {
    const picture = extractPicture(source);
    const styleRegistry = extractTikzStyles(source);
    const coordinateSystem = buildCoordinateSystem(picture.options);
    const defaultNodeOptions = {
      ...picture.options.font ? { font: picture.options.font } : {},
      ...extractEveryNodeStyle(picture.options)
    };
    const body = expandForeachLoops(stripComments(picture.body));
    const commands = splitTopLevel(body, ";").map(function(command) {
      return parseCommand(command, defaultNodeOptions, coordinateSystem, styleRegistry);
    });
    return {
      type: "TikzPicture",
      profile: "stable",
      options: picture.options,
      coordinateSystem,
      commands
    };
  }
  function parse(source) {
    return parseStable(source);
  }

  // src/TikzRenderer.js
  var UNIT_SCALE = 40;
  var DEFAULT_FONT_SIZE = 13.333;
  var DEFAULT_NODE_OFFSET = 0.18;
  var DEFAULT_FONT_FAMILY = '"Latin Modern Roman", "LM Roman 10", "CMU Serif", "Computer Modern Serif", "TeX Gyre Termes", "Times New Roman", Times, serif';
  var INNER_SEP_SCALE = 1.17;
  var COLOR_MIX_RGB = {
    black: [0, 0, 0],
    blue: [0, 0, 255],
    brown: [165, 42, 42],
    cyan: [0, 255, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    green: [0, 128, 0],
    magenta: [255, 0, 255],
    orange: [255, 165, 0],
    purple: [128, 0, 128],
    red: [255, 0, 0],
    white: [255, 255, 255],
    yellow: [255, 255, 0]
  };
  var XCOLOR_RGB = {
    black: [0, 0, 0],
    blue: [0, 0, 255],
    brown: [191, 128, 64],
    cyan: [0, 255, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    green: [0, 255, 0],
    magenta: [255, 0, 255],
    orange: [255, 128, 0],
    purple: [191, 0, 191],
    red: [255, 0, 0],
    white: [255, 255, 255],
    yellow: [255, 255, 0]
  };
  var NAMED_COLORS = /* @__PURE__ */ new Set([
    "aliceblue",
    "antiquewhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedalmond",
    "blue",
    "blueviolet",
    "brown",
    "burlywood",
    "cadetblue",
    "chartreuse",
    "chocolate",
    "coral",
    "cornflowerblue",
    "cornsilk",
    "crimson",
    "cyan",
    "darkblue",
    "darkcyan",
    "darkgoldenrod",
    "darkgray",
    "darkgreen",
    "darkgrey",
    "darkkhaki",
    "darkmagenta",
    "darkolivegreen",
    "darkorange",
    "darkorchid",
    "darkred",
    "darksalmon",
    "darkseagreen",
    "darkslateblue",
    "darkslategray",
    "darkslategrey",
    "darkturquoise",
    "darkviolet",
    "deeppink",
    "deepskyblue",
    "dimgray",
    "dimgrey",
    "dodgerblue",
    "firebrick",
    "floralwhite",
    "forestgreen",
    "fuchsia",
    "gainsboro",
    "ghostwhite",
    "gold",
    "goldenrod",
    "gray",
    "green",
    "greenyellow",
    "grey",
    "honeydew",
    "hotpink",
    "indianred",
    "indigo",
    "ivory",
    "khaki",
    "lavender",
    "lavenderblush",
    "lawngreen",
    "lemonchiffon",
    "lightblue",
    "lightcoral",
    "lightcyan",
    "lightgoldenrodyellow",
    "lightgray",
    "lightgreen",
    "lightgrey",
    "lightpink",
    "lightsalmon",
    "lightseagreen",
    "lightskyblue",
    "lightslategray",
    "lightslategrey",
    "lightsteelblue",
    "lightyellow",
    "lime",
    "limegreen",
    "linen",
    "magenta",
    "maroon",
    "mediumaquamarine",
    "mediumblue",
    "mediumorchid",
    "mediumpurple",
    "mediumseagreen",
    "mediumslateblue",
    "mediumspringgreen",
    "mediumturquoise",
    "mediumvioletred",
    "midnightblue",
    "mintcream",
    "mistyrose",
    "moccasin",
    "navajowhite",
    "navy",
    "oldlace",
    "olive",
    "olivedrab",
    "orange",
    "orangered",
    "orchid",
    "palegoldenrod",
    "palegreen",
    "paleturquoise",
    "palevioletred",
    "papayawhip",
    "peachpuff",
    "peru",
    "pink",
    "plum",
    "powderblue",
    "purple",
    "red",
    "rosybrown",
    "royalblue",
    "saddlebrown",
    "salmon",
    "sandybrown",
    "seagreen",
    "seashell",
    "sienna",
    "silver",
    "skyblue",
    "slateblue",
    "slategray",
    "slategrey",
    "snow",
    "springgreen",
    "steelblue",
    "tan",
    "teal",
    "thistle",
    "tomato",
    "turquoise",
    "violet",
    "wheat",
    "white",
    "whitesmoke",
    "yellow",
    "yellowgreen"
  ]);
  function escapeXml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function createEmptyBounds() {
    return {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };
  }
  function includePoint(bounds, x, y) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  }
  function normalizeAngle(angle) {
    let normalized = angle % 360;
    if (normalized < 0) {
      normalized += 360;
    }
    return normalized;
  }
  function isAngleBetween(angle, startAngle, endAngle, sweepPositive) {
    const normalizedAngle = normalizeAngle(angle);
    let start = normalizeAngle(startAngle);
    let end = normalizeAngle(endAngle);
    if (sweepPositive) {
      if (end < start) {
        end += 360;
      }
      let adjustedAngle2 = normalizedAngle;
      if (adjustedAngle2 < start) {
        adjustedAngle2 += 360;
      }
      return adjustedAngle2 >= start && adjustedAngle2 <= end;
    }
    if (start < end) {
      start += 360;
    }
    let adjustedAngle = normalizedAngle;
    if (adjustedAngle > start) {
      adjustedAngle -= 360;
    }
    return adjustedAngle <= start && adjustedAngle >= end;
  }
  function getEllipseProjectionAxes(coordinateSystem, xRadius, yRadius) {
    return {
      xAxis: {
        x: coordinateSystem.xBasis.x * xRadius,
        y: coordinateSystem.xBasis.y * xRadius
      },
      yAxis: {
        x: coordinateSystem.yBasis.x * yRadius,
        y: coordinateSystem.yBasis.y * yRadius
      }
    };
  }
  function includeProjectedEllipse(bounds, center, xRadius, yRadius, coordinateSystem, startAngle = 0, endAngle = 360) {
    const axes = getEllipseProjectionAxes(coordinateSystem, xRadius, yRadius);
    const xExtent = Math.sqrt(axes.xAxis.x * axes.xAxis.x + axes.yAxis.x * axes.yAxis.x);
    const yExtent = Math.sqrt(axes.xAxis.y * axes.xAxis.y + axes.yAxis.y * axes.yAxis.y);
    if (startAngle === 0 && endAngle === 360) {
      includePoint(bounds, center.x - xExtent, center.y - yExtent);
      includePoint(bounds, center.x + xExtent, center.y + yExtent);
      return;
    }
    const sweepPositive = endAngle >= startAngle;
    const sampleAngles = [startAngle, endAngle, 0, 90, 180, 270];
    for (const angle of sampleAngles) {
      if (angle !== startAngle && angle !== endAngle && !isAngleBetween(angle, startAngle, endAngle, sweepPositive)) {
        continue;
      }
      const radians = angle * Math.PI / 180;
      includePoint(
        bounds,
        center.x + Math.cos(radians) * axes.xAxis.x + Math.sin(radians) * axes.yAxis.x,
        center.y + Math.cos(radians) * axes.xAxis.y + Math.sin(radians) * axes.yAxis.y
      );
    }
  }
  function includeRectangleArea(bounds, startPoint, endPoint) {
    includePoint(bounds, startPoint.x, startPoint.y);
    includePoint(bounds, endPoint.x, endPoint.y);
  }
  function sampleCubicCoordinate(start, controlOne, controlTwo, end, t) {
    const inverse = 1 - t;
    return inverse * inverse * inverse * start + 3 * inverse * inverse * t * controlOne + 3 * inverse * t * t * controlTwo + t * t * t * end;
  }
  function getCubicExtremaParameters(start, controlOne, controlTwo, end) {
    const a = -start + 3 * controlOne - 3 * controlTwo + end;
    const b = 2 * (start - 2 * controlOne + controlTwo);
    const c = controlOne - start;
    const parameters = [];
    if (Math.abs(a) < 1e-9) {
      if (Math.abs(b) < 1e-9) {
        return parameters;
      }
      const root = -c / b;
      if (root > 0 && root < 1) {
        parameters.push(root);
      }
      return parameters;
    }
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) {
      return parameters;
    }
    const sqrtDiscriminant = Math.sqrt(discriminant);
    const rootOne = (-b + sqrtDiscriminant) / (2 * a);
    const rootTwo = (-b - sqrtDiscriminant) / (2 * a);
    if (rootOne > 0 && rootOne < 1) {
      parameters.push(rootOne);
    }
    if (rootTwo > 0 && rootTwo < 1) {
      parameters.push(rootTwo);
    }
    return parameters;
  }
  function includeCurve(bounds, startPoint, controlOne, controlTwo, point) {
    includePoint(bounds, startPoint.x, startPoint.y);
    includePoint(bounds, point.x, point.y);
    const parameters = /* @__PURE__ */ new Set([
      0,
      1,
      ...getCubicExtremaParameters(startPoint.x, controlOne.x, controlTwo.x, point.x),
      ...getCubicExtremaParameters(startPoint.y, controlOne.y, controlTwo.y, point.y)
    ]);
    for (const parameter of parameters) {
      const x = sampleCubicCoordinate(startPoint.x, controlOne.x, controlTwo.x, point.x, parameter);
      const y = sampleCubicCoordinate(startPoint.y, controlOne.y, controlTwo.y, point.y, parameter);
      includePoint(bounds, x, y);
    }
  }
  function expandBounds(bounds, amount) {
    bounds.minX -= amount;
    bounds.minY -= amount;
    bounds.maxX += amount;
    bounds.maxY += amount;
  }
  function getTextLayout(command) {
    const anchor = command.anchor || [];
    let textAnchor = "middle";
    let dominantBaseline = "middle";
    if (anchor.includes("left")) {
      textAnchor = "end";
    } else if (anchor.includes("right")) {
      textAnchor = "start";
    }
    if (anchor.includes("above")) {
      dominantBaseline = "auto";
    } else if (anchor.includes("below")) {
      dominantBaseline = "hanging";
    }
    return {
      textAnchor,
      dominantBaseline,
      offset: { x: 0, y: 0 }
    };
  }
  function getNodePoint(command) {
    return command.point;
  }
  function getNodeFont(command) {
    return {
      fontSize: command.fontStyle && command.fontStyle.fontSize ? command.fontStyle.fontSize : DEFAULT_FONT_SIZE,
      fontFamily: command.fontStyle && command.fontStyle.fontFamily ? command.fontStyle.fontFamily : DEFAULT_FONT_FAMILY
    };
  }
  function getNodeBoxMetrics(command) {
    const nodeFont = getNodeFont(command);
    const fontSize = nodeFont.fontSize / UNIT_SCALE;
    const layoutHints = command.textLayoutHints || { extraWidth: 0 };
    const options = command.options || {};
    const textWidthOption = parseNodeLength(options["text width"], fontSize);
    const textBlocks = getTextBlocks(command).map(function(lines) {
      return wrapLinesToWidth(lines, textWidthOption, fontSize);
    });
    const blockMetrics = textBlocks.map(function(lines) {
      return measureTextBlock(lines, fontSize);
    });
    const totalLineCount = textBlocks.reduce(function(sum, lines) {
      return sum + Math.max(lines.length, 1);
    }, 0);
    const textWidth = Math.max(...blockMetrics.map(function(metrics2) {
      return metrics2.width;
    }), fontSize) + layoutHints.extraWidth;
    const textHeight = blockMetrics.reduce(function(sum, metrics2) {
      return sum + metrics2.height;
    }, 0);
    const shape = getNodeShape(command);
    const innerSep = typeof options["inner sep"] === "string" ? parseLength(options["inner sep"]) : null;
    const innerXSep = typeof options["inner xsep"] === "string" ? parseLength(options["inner xsep"]) : innerSep;
    const innerYSep = typeof options["inner ysep"] === "string" ? parseLength(options["inner ysep"]) : innerSep;
    const xPad = innerXSep !== null ? innerXSep * 2 * INNER_SEP_SCALE : null;
    const yPad = innerYSep !== null ? innerYSep * 2 * INNER_SEP_SCALE : null;
    const baseTextWidth = textWidthOption !== null ? Math.max(textWidthOption, textWidth) : textWidth;
    let metrics;
    if (shape === "ellipse") {
      metrics = {
        width: baseTextWidth + (xPad !== null ? xPad : 0.52),
        height: textHeight + (yPad !== null ? yPad : 0.49)
      };
    } else if (shape === "semicircle") {
      const width = baseTextWidth * 0.62 + (xPad !== null ? xPad : 0.24);
      const minWidthForHeight = (textHeight + (yPad !== null ? yPad : 0.49)) * 2;
      const diameter = Math.max(width, minWidthForHeight);
      metrics = {
        width: diameter,
        height: diameter / 2
      };
    } else if (shape === "circular sector") {
      const width = baseTextWidth * 1.28 + (xPad !== null ? xPad : 0.42);
      metrics = {
        width,
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.62), width * 0.92)
      };
    } else if (shape === "dart") {
      metrics = {
        width: baseTextWidth * 1.18 + (xPad !== null ? xPad : 0.34),
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.95), (baseTextWidth * 1.18 + (xPad !== null ? xPad : 0.34)) * 0.83)
      };
    } else if (shape === "kite") {
      const width = baseTextWidth * 0.9 + (xPad !== null ? xPad : 0.3);
      metrics = {
        width,
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.55), width * 1.16)
      };
    } else if (shape === "diamond") {
      const size = Math.max(
        baseTextWidth + (xPad !== null ? xPad : 0.28),
        textHeight + (yPad !== null ? yPad : 0.4)
      );
      metrics = {
        width: size,
        height: size
      };
    } else if (shape === "isosceles triangle") {
      const width = baseTextWidth * 1.08 + (xPad !== null ? xPad : 0.34);
      metrics = {
        width,
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.5), width * 0.9)
      };
    } else if (shape === "trapezium") {
      const width = baseTextWidth * 1.18 + (xPad !== null ? xPad : 0.34);
      metrics = {
        width,
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.22), width * 0.26)
      };
    } else if (shape === "tape") {
      const width = baseTextWidth * 0.86 + (xPad !== null ? xPad : 0.24);
      const extraLines = Math.max(0, totalLineCount - 1);
      const multilinePadding = extraLines * 0.38;
      metrics = {
        width,
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.46) + multilinePadding, width * (1.32 + extraLines * 0.16))
      };
    } else if (shape === "magnetic tape") {
      const size = Math.max(
        baseTextWidth * 1.22 + (xPad !== null ? xPad : 0.34),
        textHeight + (yPad !== null ? yPad : 0.46)
      );
      metrics = {
        width: size,
        height: size
      };
    } else if (shape === "cylinder") {
      const width = baseTextWidth * 1.05 + (xPad !== null ? xPad : 0.34);
      metrics = {
        width,
        height: textHeight + (yPad !== null ? yPad : 0.3)
      };
    } else if (shape === "rectangle split") {
      metrics = {
        width: baseTextWidth * 0.62 + (xPad !== null ? xPad : 0.14),
        height: textHeight + (yPad !== null ? yPad : 0.18)
      };
    } else if (shape === "circle split") {
      const width = baseTextWidth * 0.62 + (xPad !== null ? xPad : 0.14);
      const height = textHeight + (yPad !== null ? yPad : 0.18);
      const diameter = Math.max(width, height);
      metrics = {
        width: diameter,
        height: diameter
      };
    } else if (shape === "circle") {
      const width = baseTextWidth + (xPad !== null ? xPad : 0.18);
      const height = textHeight + (yPad !== null ? yPad : 0.14);
      const diameter = Math.max(width, height);
      metrics = {
        width: diameter,
        height: diameter
      };
    } else if (shape === "forbidden sign") {
      const width = baseTextWidth + (xPad !== null ? xPad : 0.28);
      const height = textHeight + (yPad !== null ? yPad : 0.28);
      const diameter = Math.max(width, height) * 0.82;
      metrics = {
        width: diameter,
        height: diameter
      };
    } else if (["regular polygon", "star", "cloud"].includes(shape)) {
      const width = baseTextWidth + (xPad !== null ? xPad : 0.28);
      const height = textHeight + (yPad !== null ? yPad : 0.28);
      const diameter = Math.max(width, height);
      metrics = {
        width: diameter,
        height: diameter
      };
    } else if (shape === "starburst") {
      const width = baseTextWidth * 1.95 + (xPad !== null ? xPad : 0.36);
      metrics = {
        width,
        height: Math.max(textHeight + (yPad !== null ? yPad : 0.5), width * 0.48)
      };
    } else {
      metrics = {
        width: baseTextWidth + (xPad !== null ? xPad : 0.18),
        height: textHeight + (yPad !== null ? yPad : 0.28)
      };
    }
    const minimumSize = parseLength(options["minimum size"]) || 0;
    const minimumWidth = parseLength(options["minimum width"]) || 0;
    const minimumHeight = parseLength(options["minimum height"]) || 0;
    return {
      width: Math.max(metrics.width, minimumSize, minimumWidth),
      height: Math.max(metrics.height, minimumSize, minimumHeight)
    };
  }
  function getTextBlocks(command) {
    return command.text.split("\uE003").map(function(part) {
      return part.split("\n");
    });
  }
  function measureTextBlock(lines, fontSize) {
    return {
      width: Math.max(...lines.map(function(line) {
        return measureText(line, fontSize).width;
      }), fontSize),
      height: Math.max(lines.length, 1) * fontSize * 1.1
    };
  }
  function getRegularPolygonPoints(cx, cy, radius, sides, startAngle = -90) {
    const points = [];
    for (let index = 0; index < sides; index += 1) {
      const angle = (startAngle + index * 360 / sides) * Math.PI / 180;
      points.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    }
    return points;
  }
  function pointsToPath(points) {
    if (points.length === 0) {
      return "";
    }
    let path = "M " + points[0].x + " " + points[0].y + " ";
    for (let index = 1; index < points.length; index += 1) {
      path += "L " + points[index].x + " " + points[index].y + " ";
    }
    return path + "Z";
  }
  function getStarPoints(cx, cy, outerRadius, innerRadius, points) {
    const result = [];
    for (let index = 0; index < points * 2; index += 1) {
      const angle = (-90 + index * 180 / points) * Math.PI / 180;
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      result.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      });
    }
    return result;
  }
  function layoutMatrixCommand(command) {
    const rowSep = parseLength(command.options["row sep"]) || 0;
    const columnSep = parseLength(command.options["column sep"]) || 0;
    const rowHeights = command.rows.map(function(row) {
      return Math.max(...row.map(function(cell) {
        return getNodeBoxMetrics(cell).height;
      }));
    });
    const columnCount = Math.max(...command.rows.map(function(row) {
      return row.length;
    }), 0);
    const columnWidths = Array.from({ length: columnCount }, function(_, columnIndex) {
      return Math.max(...command.rows.map(function(row) {
        const cell = row[columnIndex];
        return cell ? getNodeBoxMetrics(cell).width : 0;
      }));
    });
    const totalWidth = columnWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, columnWidths.length - 1) * columnSep;
    const totalHeight = rowHeights.reduce((sum, value) => sum + value, 0) + Math.max(0, rowHeights.length - 1) * rowSep;
    let currentY = totalHeight / 2;
    const commands = [];
    for (let rowIndex = 0; rowIndex < command.rows.length; rowIndex += 1) {
      const row = command.rows[rowIndex];
      const rowHeight = rowHeights[rowIndex];
      let currentX = -totalWidth / 2;
      for (let columnIndex = 0; columnIndex < columnWidths.length; columnIndex += 1) {
        const columnWidth = columnWidths[columnIndex];
        const cell = row[columnIndex];
        if (cell) {
          commands.push({
            ...cell,
            point: {
              x: currentX + columnWidth / 2,
              y: currentY - rowHeight / 2
            }
          });
        }
        currentX += columnWidth + columnSep;
      }
      currentY -= rowHeight + rowSep;
    }
    return commands;
  }
  function expandMatrices(ast) {
    const commands = [];
    for (const command of ast.commands) {
      if (command.type === "matrix") {
        commands.push(...layoutMatrixCommand(command));
      } else {
        commands.push(command);
      }
    }
    return {
      ...ast,
      commands
    };
  }
  function splitTopLevelOptions(text, separator) {
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
    const trailing = text.slice(start).trim();
    if (trailing) {
      parts.push(trailing);
    }
    return parts;
  }
  function parseStyleOptionsText(text) {
    const options = {};
    for (const part of splitTopLevelOptions(text, ",")) {
      const equalIndex = part.indexOf("=");
      if (equalIndex === -1) {
        options[part.trim()] = true;
        continue;
      }
      const key = part.slice(0, equalIndex).trim();
      const value = part.slice(equalIndex + 1).trim();
      options[key] = value.startsWith("{") && value.endsWith("}") ? value.slice(1, -1).trim() : value;
    }
    return options;
  }
  function mergeOptionSets() {
    return Array.from(arguments).reduce(function(result, options) {
      return options ? { ...result, ...options } : result;
    }, {});
  }
  function parseMindmapNumber(value, fallback) {
    if (value === void 0 || value === null || value === true) {
      return fallback;
    }
    const normalized = String(value).trim().toLowerCase();
    const namedAngles = {
      right: 0,
      east: 0,
      up: 90,
      north: 90,
      left: 180,
      west: 180,
      down: -90,
      south: -90
    };
    if (normalized in namedAngles) {
      return namedAngles[normalized];
    }
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function getMindmapScale(options) {
    if (options["small mindmap"]) {
      return 0.82;
    }
    if (options["large mindmap"]) {
      return 1.3;
    }
    if (options["huge mindmap"]) {
      return 1.6;
    }
    return 1;
  }
  function getMindmapLevelDefaults(level, scale) {
    const sizes = [3.8, 2.15, 1.65, 1.2, 1, 0.9];
    const distances = [0, 4.75, 2.75, 2.1, 1.7, 1.45];
    const lineWidths = [0, 8, 5.5, 4, 3, 2.5];
    const index = Math.min(level, sizes.length - 1);
    return {
      minimumSize: sizes[index] * scale,
      distance: distances[index] * scale,
      lineWidth: lineWidths[index]
    };
  }
  function getMindmapStyleOptions(pictureOptions, level) {
    const key = level === 0 ? "root concept/.append style" : "level " + level + " concept/.append style";
    if (typeof pictureOptions[key] === "string") {
      const value = pictureOptions[key].trim();
      return parseStyleOptionsText(value.startsWith("{") && value.endsWith("}") ? value.slice(1, -1) : value);
    }
    return {};
  }
  function normalizeMindmapNode(node, point, options) {
    return {
      ...node,
      point,
      options,
      mindmapConcept: true,
      children: void 0
    };
  }
  function buildMindmapNodeCommand(node, point, level, inheritedOptions, pictureOptions) {
    const scale = getMindmapScale(pictureOptions);
    const levelDefaults = getMindmapLevelDefaults(level, scale);
    const levelStyleOptions = getMindmapStyleOptions(pictureOptions, level);
    const mergedNodeOptions = mergeOptionSets(inheritedOptions, levelStyleOptions, node.options);
    const conceptColor = mergedNodeOptions["concept color"] || inheritedOptions["concept color"] || pictureOptions["concept color"] || "blue!50";
    const textColor = mergedNodeOptions.text || pictureOptions.text;
    const effectiveMinimumSize = parseLength(mergedNodeOptions["minimum size"]) || levelDefaults.minimumSize;
    return {
      command: normalizeMindmapNode(node, point, {
        ...mergedNodeOptions,
        shape: mergedNodeOptions.shape || "circle",
        draw: mergedNodeOptions.draw === true ? conceptColor : mergedNodeOptions.draw || conceptColor,
        fill: mergedNodeOptions.fill === true || mergedNodeOptions.fill === void 0 ? conceptColor : mergedNodeOptions.fill,
        ...mergedNodeOptions["line width"] ? {} : { "line width": "0.9pt" },
        ...mergedNodeOptions["minimum size"] ? {} : { "minimum size": effectiveMinimumSize + "cm" },
        ...textColor ? { text: textColor } : {},
        ...mergedNodeOptions["inner sep"] || mergedNodeOptions["inner xsep"] || mergedNodeOptions["inner ysep"] ? {} : {
          "inner xsep": effectiveMinimumSize * 0.24 + "cm",
          "inner ysep": effectiveMinimumSize * 0.2 + "cm"
        }
      }),
      conceptColor,
      levelDefaults,
      levelStyleOptions
    };
  }
  function getMindmapNodeRadius(node) {
    const box = getNodeBoxMetrics(node);
    const shape = getNodeShape(node);
    if (shape === "ellipse") {
      return Math.max(box.width, box.height) / 2;
    }
    return Math.max(box.width, box.height) / 2;
  }
  function buildMindmapEdgeCommand(parentNode, childNode, parentColor, childColor, usesGradient, options = {}) {
    const parentCenter = getNodePoint(parentNode);
    const childCenter = getNodePoint(childNode);
    const dx = childCenter.x - parentCenter.x;
    const dy = childCenter.y - parentCenter.y;
    const length = Math.hypot(dx, dy) || 1;
    const parentRadius = getMindmapNodeRadius(parentNode);
    const childRadius = getMindmapNodeRadius(childNode);
    const ux = dx / length;
    const uy = dy / length;
    const xDirFlag = parentCenter.x > childCenter.x ? -1 : 1;
    const yDirFlag = parentCenter.y > childCenter.y ? -1 : 1;
    const m = dx === 0 ? Number.POSITIVE_INFINITY : (parentCenter.y - childCenter.y) / (parentCenter.x - childCenter.x);
    const parentDockPointHeight = parentRadius / 2;
    const childDockPointHeight = childRadius / 2;
    const parentDockPointWidth = parentRadius / 5;
    const childDockPointWidth = childRadius / 5;
    const x1Gap = xDirFlag * (Number.isFinite(m) ? Math.sqrt(Math.pow(parentRadius + parentDockPointHeight, 2) / (1 + m * m)) : 0);
    const y1Gap = yDirFlag * (Number.isFinite(m) ? yDirFlag * m * x1Gap : parentRadius + parentDockPointHeight);
    const l1xGap = m === 0 ? 0 : Number.isFinite(m) ? Math.sqrt(Math.pow(parentDockPointWidth, 2) / (1 + 1 / (m * m))) : parentDockPointWidth;
    const l1yGap = m === 0 ? parentDockPointWidth : Number.isFinite(m) ? -1 / m * l1xGap : 0;
    const r1xGap = -l1xGap;
    const r1yGap = m === 0 ? -parentDockPointWidth : Number.isFinite(m) ? -1 / m * r1xGap : 0;
    const x2Gap = -xDirFlag * (Number.isFinite(m) ? Math.sqrt(Math.pow(childRadius + childDockPointHeight, 2) / (1 + m * m)) : 0);
    const y2Gap = yDirFlag * (Number.isFinite(m) ? yDirFlag * m * x2Gap : -(childRadius + childDockPointHeight));
    const l2xGap = m === 0 ? 0 : Number.isFinite(m) ? Math.sqrt(Math.pow(childDockPointWidth, 2) / (1 + 1 / (m * m))) : childDockPointWidth;
    const l2yGap = m === 0 ? childDockPointWidth : Number.isFinite(m) ? -1 / m * l2xGap : 0;
    const r2xGap = -l2xGap;
    const r2yGap = m === 0 ? -childDockPointWidth : Number.isFinite(m) ? -1 / m * r2xGap : 0;
    const parentAlong = Number.isFinite(m) ? Math.sqrt(Math.max(0, parentRadius * parentRadius - parentDockPointWidth * parentDockPointWidth)) : parentRadius;
    const childAlong = Number.isFinite(m) ? Math.sqrt(Math.max(0, childRadius * childRadius - childDockPointWidth * childDockPointWidth)) : childRadius;
    const l1 = {
      x: parentCenter.x - l1xGap + ux * parentAlong,
      y: parentCenter.y - l1yGap + uy * parentAlong
    };
    const r1 = {
      x: parentCenter.x - r1xGap + ux * parentAlong,
      y: parentCenter.y - r1yGap + uy * parentAlong
    };
    const l2 = {
      x: childCenter.x - l2xGap - ux * childAlong,
      y: childCenter.y - l2yGap - uy * childAlong
    };
    const r2 = {
      x: childCenter.x - r2xGap - ux * childAlong,
      y: childCenter.y - r2yGap - uy * childAlong
    };
    const c1 = {
      x: parentCenter.x + x1Gap,
      y: parentCenter.y + y1Gap
    };
    const c2 = {
      x: childCenter.x + x2Gap,
      y: childCenter.y + y2Gap
    };
    const path = {
      r1,
      r2,
      l1,
      l2,
      c1,
      c2
    };
    return {
      type: "mindmapedge",
      options,
      parentColor,
      childColor,
      usesGradient,
      path
    };
  }
  function layoutMindmapSubtree(node, point, level, inheritedOptions, pictureOptions, commands) {
    const scale = getMindmapScale(pictureOptions);
    const parentDescriptor = buildMindmapNodeCommand(node, point, level, inheritedOptions, pictureOptions);
    const normalizedNode = parentDescriptor.command;
    const conceptColor = parentDescriptor.conceptColor;
    const levelDefaults = parentDescriptor.levelDefaults;
    const levelStyleOptions = parentDescriptor.levelStyleOptions;
    commands.push(normalizedNode);
    if (!node.children || node.children.length === 0) {
      return;
    }
    const parentLayoutOptions = mergeOptionSets(levelStyleOptions, node.options);
    const siblingAngle = parseMindmapNumber(parentLayoutOptions["sibling angle"], level === 0 ? 60 : 50);
    const clockwiseFrom = parseMindmapNumber(parentLayoutOptions["clockwise from"], 0);
    const counterclockwiseFrom = parentLayoutOptions["counterclockwise from"] !== void 0 ? parseMindmapNumber(parentLayoutOptions["counterclockwise from"], 0) : null;
    const placedChildren = [];
    for (const child of node.children) {
      if (child.options.grow !== void 0) {
        placedChildren.push({ child, angle: parseMindmapNumber(child.options.grow, 0) });
        continue;
      }
      const index = placedChildren.length;
      placedChildren.push({
        child,
        angle: counterclockwiseFrom !== null ? counterclockwiseFrom + index * siblingAngle : clockwiseFrom - index * siblingAngle
      });
    }
    for (const entry of placedChildren) {
      const childLevelDefaults = getMindmapLevelDefaults(level + 1, scale);
      const radians = entry.angle * Math.PI / 180;
      const childPoint = {
        x: point.x + Math.cos(radians) * childLevelDefaults.distance,
        y: point.y + Math.sin(radians) * childLevelDefaults.distance
      };
      const childOptions = mergeOptionSets(inheritedOptions, levelStyleOptions, entry.child.options);
      const childDescriptor = buildMindmapNodeCommand(entry.child.node, childPoint, level + 1, {
        ...childOptions,
        "concept color": childOptions["concept color"] || conceptColor
      }, pictureOptions);
      const childConceptColor = childDescriptor.conceptColor;
      commands.push(buildMindmapEdgeCommand(
        normalizedNode,
        childDescriptor.command,
        conceptColor,
        childConceptColor,
        true,
        { opacity: childOptions.opacity || 1, level: level + 1 }
      ));
      layoutMindmapSubtree(entry.child.node, childPoint, level + 1, {
        ...childOptions,
        "concept color": childConceptColor
      }, pictureOptions, commands);
    }
  }
  function expandMindmaps(ast) {
    const commands = [];
    for (const command of ast.commands) {
      if (command.type !== "mindmap") {
        commands.push(command);
        continue;
      }
      const pictureOptions = ast.options || {};
      layoutMindmapSubtree(command.root, command.root.point || { x: 0, y: 0 }, 0, mergeOptionSets(pictureOptions, command.options), pictureOptions, commands);
    }
    return {
      ...ast,
      commands
    };
  }
  function parseLength(value) {
    const trimmed = String(value).trim();
    const match = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(cm|pt)?$/);
    if (!match) {
      return null;
    }
    const number = Number(match[1]);
    if (match[2] === "pt") {
      return number / 28.3464567;
    }
    return number;
  }
  function parseNodeLength(value, fontSize) {
    const trimmed = String(value).trim();
    const match = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*(cm|pt|em)?$/);
    if (!match) {
      return null;
    }
    const number = Number(match[1]);
    if (match[2] === "pt") {
      return number / 28.3464567;
    }
    if (match[2] === "em") {
      return number * fontSize * 0.64;
    }
    return number;
  }
  function wrapLinesToWidth(lines, maxWidth, fontSize) {
    if (!Number.isFinite(maxWidth) || maxWidth <= 0) {
      return lines;
    }
    const wrapped = [];
    for (const line of lines) {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        wrapped.push("");
        continue;
      }
      let current = words[0];
      for (let index = 1; index < words.length; index += 1) {
        const candidate = current + " " + words[index];
        if (measureText(candidate, fontSize).width <= maxWidth) {
          current = candidate;
        } else {
          wrapped.push(current);
          current = words[index];
        }
      }
      wrapped.push(current);
    }
    return wrapped;
  }
  function isNodeReference(point) {
    return Boolean(point && point.type === "nodeRef");
  }
  function isShiftedPoint(point) {
    return Boolean(point && point.type === "shiftedPoint");
  }
  function buildNodeRegistry(ast) {
    const registry = /* @__PURE__ */ new Map();
    for (const command of ast.commands) {
      if (command.type === "node" && command.name) {
        registry.set(command.name, command);
      }
      if (command.operations) {
        for (const operation of command.operations) {
          if (operation.type === "node" && operation.name) {
            registry.set(operation.name, operation);
          }
        }
      }
    }
    return registry;
  }
  function getNodeAnchorPosition(node, anchorName) {
    const center = getNodePoint(node);
    const box = getNodeBoxMetrics(node);
    const shape = getNodeShape(node);
    const halfWidth = box.width / 2;
    const halfHeight = box.height / 2;
    let x = center.x;
    let y = center.y;
    const anchor = anchorName.trim().toLowerCase();
    if (anchor === "center" || anchor === "text") {
      return { x, y };
    }
    if (/^\d+(\.\d+)?$/.test(anchor)) {
      const radians = Number.parseFloat(anchor) * Math.PI / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      if (shape === "rectangle") {
        const scale = 1 / Math.max(Math.abs(cos) / halfWidth, Math.abs(sin) / halfHeight);
        return {
          x: center.x + cos * scale,
          y: center.y + sin * scale
        };
      }
      return {
        x: center.x + cos * halfWidth,
        y: center.y + sin * halfHeight
      };
    }
    if (shape !== "rectangle" && /north|south|east|west/.test(anchor)) {
      let dx = 0;
      let dy = 0;
      if (anchor.includes("east")) {
        dx += 1;
      }
      if (anchor.includes("west")) {
        dx -= 1;
      }
      if (anchor.includes("north")) {
        dy += 1;
      }
      if (anchor.includes("south")) {
        dy -= 1;
      }
      const length = Math.hypot(dx, dy) || 1;
      return {
        x: center.x + dx / length * halfWidth,
        y: center.y + dy / length * halfHeight
      };
    }
    if (anchor === "mid") {
      return { x: center.x, y: center.y - box.height * 0.08 };
    }
    if (anchor === "mid east") {
      return { x: center.x + halfWidth, y: center.y - box.height * 0.08 };
    }
    if (anchor === "mid west") {
      return { x: center.x - halfWidth, y: center.y - box.height * 0.08 };
    }
    if (anchor === "base") {
      return { x: center.x, y: center.y - box.height * 0.2 };
    }
    if (anchor === "base east") {
      return { x: center.x + halfWidth, y: center.y - box.height * 0.2 };
    }
    if (anchor === "base west") {
      return { x: center.x - halfWidth, y: center.y - box.height * 0.2 };
    }
    if (anchor.includes("east")) {
      x += halfWidth;
    } else if (anchor.includes("west")) {
      x -= halfWidth;
    }
    if (anchor.includes("north")) {
      y += halfHeight;
    } else if (anchor.includes("south")) {
      y -= halfHeight;
    }
    return { x, y };
  }
  function getPlacementRect(x, y, width, height, placementAnchor) {
    const anchor = (placementAnchor || "center").trim().toLowerCase();
    let left = x - width / 2;
    let top = y - height / 2;
    if (anchor.includes("west")) {
      left = x;
    } else if (anchor.includes("east")) {
      left = x - width;
    }
    if (anchor.includes("north")) {
      top = y;
    } else if (anchor.includes("south")) {
      top = y - height;
    }
    return {
      x: left,
      y: top,
      width,
      height
    };
  }
  function getLogicalPlacementRect(x, y, width, height, placementAnchor) {
    const anchor = (placementAnchor || "center").trim().toLowerCase();
    let left = x - width / 2;
    let bottom = y - height / 2;
    if (anchor.includes("west")) {
      left = x;
    } else if (anchor.includes("east")) {
      left = x - width;
    }
    if (anchor.includes("south")) {
      bottom = y;
    } else if (anchor.includes("north")) {
      bottom = y - height;
    }
    return {
      x: left,
      y: bottom,
      width,
      height
    };
  }
  function getDirectionalLabelPoint(command) {
    var _a, _b;
    const anchor = command.anchor || [];
    const innerSep = parseLength(((_a = command.options) == null ? void 0 : _a["inner sep"]) || "0") || 0;
    const labelDistance = parseLength(((_b = command.options) == null ? void 0 : _b["label distance"]) || "0") || 0;
    const horizontalGap = Math.max(DEFAULT_NODE_OFFSET, innerSep + labelDistance);
    const verticalGap = Math.max(DEFAULT_NODE_OFFSET, innerSep + labelDistance);
    let x = command.point.x;
    let y = command.point.y;
    if (anchor.includes("right")) {
      x += horizontalGap;
    }
    if (anchor.includes("left")) {
      x -= horizontalGap;
    }
    if (anchor.includes("above")) {
      y += verticalGap;
    }
    if (anchor.includes("below")) {
      y -= verticalGap;
    }
    return { x, y };
  }
  function isAnchorAnnotationLabel(command, parentCommand) {
    return Boolean(
      parentCommand && parentCommand.options && parentCommand.options.shiftPoint && isNodeReference(parentCommand.options.shiftPoint) && stylelessNode(command) && /^\(.*\)$/.test(command.text)
    );
  }
  function stylelessNode(command) {
    const style = resolveStyles(command);
    return style.stroke === "none" && style.fill === "none";
  }
  function getAnchorAnnotationLabelPoint(command) {
    var _a, _b;
    const anchor = command.anchor || [];
    const nodeFont = getNodeFont(command);
    const textMetrics = measureText(command.text, nodeFont.fontSize / UNIT_SCALE);
    const innerSep = parseLength(((_a = command.options) == null ? void 0 : _a["inner sep"]) || "0") || 0;
    const labelDistance = parseLength(((_b = command.options) == null ? void 0 : _b["label distance"]) || "0") || 0;
    const extraGap = 0.08;
    const horizontalGap = textMetrics.width / 2 / UNIT_SCALE + innerSep + labelDistance + extraGap;
    const verticalGap = textMetrics.height / 2 / UNIT_SCALE + innerSep + labelDistance + extraGap;
    let x = command.point.x;
    let y = command.point.y;
    if (anchor.includes("right")) {
      x += horizontalGap;
    }
    if (anchor.includes("left")) {
      x -= horizontalGap;
    }
    if (anchor.includes("above")) {
      y += verticalGap;
    }
    if (anchor.includes("below")) {
      y -= verticalGap;
    }
    return { x, y };
  }
  function resolvePoint(point, nodeRegistry) {
    if (isShiftedPoint(point)) {
      const basePoint = resolvePoint(point.basePoint, nodeRegistry);
      return {
        x: basePoint.x + point.offset.x,
        y: basePoint.y + point.offset.y
      };
    }
    if (!isNodeReference(point)) {
      return point;
    }
    const node = nodeRegistry.get(point.name);
    if (!node) {
      throw new Error('Tikz render error: unknown node reference "' + point.name + '"');
    }
    return getNodeAnchorPosition(node, point.anchor || "center");
  }
  function applyShift(point, shiftPoint, nodeRegistry) {
    if (!shiftPoint) {
      return point;
    }
    const resolvedShift = resolvePoint(shiftPoint, nodeRegistry);
    return {
      x: point.x + resolvedShift.x,
      y: point.y + resolvedShift.y
    };
  }
  function getNodeShape(command) {
    const options = command.options || {};
    if (typeof options.shape === "string") {
      return options.shape.trim().toLowerCase();
    }
    const namedShapes = [
      "rectangle split",
      "circle split",
      "semicircle",
      "circular sector",
      "forbidden sign",
      "diamond",
      "kite",
      "isosceles triangle",
      "trapezium",
      "regular polygon",
      "star",
      "starburst",
      "cylinder",
      "signal",
      "tape",
      "magnetic tape",
      "cloud",
      "dart"
    ];
    for (const shape of namedShapes) {
      if (options[shape]) {
        return shape;
      }
    }
    if (options.circle) {
      return "circle";
    }
    if (options.ellipse) {
      return "ellipse";
    }
    return "rectangle";
  }
  function getAnchoredRect(x, y, width, height, textAnchor, dominantBaseline) {
    let left = x - width / 2;
    if (textAnchor === "start") {
      left = x;
    } else if (textAnchor === "end") {
      left = x - width;
    }
    let top = y - height / 2;
    if (dominantBaseline === "hanging") {
      top = y;
    } else if (dominantBaseline === "auto") {
      top = y - height;
    }
    return {
      x: left,
      y: top,
      width,
      height
    };
  }
  function getLineLabelPoint(startPoint, endPoint) {
    return {
      x: (startPoint.x + endPoint.x) / 2,
      y: (startPoint.y + endPoint.y) / 2 + DEFAULT_NODE_OFFSET * 0.6
    };
  }
  function includeText(bounds, x, y, text, fontSize) {
    const metrics = measureText(text, fontSize);
    includePoint(bounds, x - metrics.width / 2, y - metrics.height / 2);
    includePoint(bounds, x + metrics.width / 2, y + metrics.height / 2);
  }
  function measureText(text, fontSize) {
    const visibleText = text.replace(/\uE000[^\uE001]*\uE001/g, "");
    return {
      width: Math.max(visibleText.length, 1) * fontSize * 0.64,
      height: fontSize * 1.1
    };
  }
  function renderTextContent(text) {
    const pattern = /\uE000([^\uE001]*)\uE001/g;
    let lastIndex = 0;
    let match;
    let parts = "";
    let pendingDx = 0;
    while ((match = pattern.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      if (before) {
        const dxAttribute = pendingDx ? ' dx="' + pendingDx + '"' : "";
        parts += "<tspan" + dxAttribute + ">" + escapeXml(before) + "</tspan>";
        pendingDx = 0;
      }
      pendingDx += (parseLength(match[1]) || 0) * UNIT_SCALE;
      lastIndex = match.index + match[0].length;
    }
    const trailing = text.slice(lastIndex);
    if (trailing) {
      const dxAttribute = pendingDx ? ' dx="' + pendingDx + '"' : "";
      parts += "<tspan" + dxAttribute + ">" + escapeXml(trailing) + "</tspan>";
      pendingDx = 0;
    }
    if (!parts && pendingDx) {
      return '<tspan dx="' + pendingDx + '"></tspan>';
    }
    return parts || "<tspan></tspan>";
  }
  function renderTextLines(lines, x, centerY, style, nodeFont, textAnchor) {
    const lineHeight = nodeFont.fontSize * 1.1;
    const startY = centerY - (Math.max(lines.length, 1) - 1) * lineHeight / 2;
    const alignCenter = style.textAlign === "center";
    const maxWidth = Math.max(...lines.map(function(line) {
      return measureText(line, nodeFont.fontSize / UNIT_SCALE).width * UNIT_SCALE;
    }), 0);
    const tspans = lines.map(function(line, index) {
      const lineWidth = measureText(line, nodeFont.fontSize / UNIT_SCALE).width * UNIT_SCALE;
      let lineX = x;
      let lineAnchor = textAnchor;
      if (alignCenter) {
        lineAnchor = "middle";
        if (textAnchor === "start") {
          lineX = x + maxWidth / 2;
        } else if (textAnchor === "end") {
          lineX = x - maxWidth / 2;
        }
      }
      return '<tspan x="' + lineX + '" dy="' + (index === 0 ? 0 : lineHeight) + '" text-anchor="' + lineAnchor + '">' + renderTextContent(line) + "</tspan>";
    }).join("");
    return '<text x="' + x + '" y="' + startY + '" text-anchor="' + textAnchor + '" dominant-baseline="middle" fill="' + escapeXml(style.textFill || "currentColor") + '" opacity="' + style.opacity + '" font-family="' + escapeXml(nodeFont.fontFamily) + '" font-size="' + nodeFont.fontSize + '">' + tspans + "</text>";
  }
  function renderNodeText(command, x, y, style, nodeFont, textAnchor) {
    var _a;
    const fontSize = nodeFont.fontSize / UNIT_SCALE;
    const textWidthOption = parseNodeLength((_a = command.options) == null ? void 0 : _a["text width"], fontSize);
    const blocks = getTextBlocks(command).map(function(lines) {
      return wrapLinesToWidth(lines, textWidthOption, fontSize);
    });
    if (blocks.length === 1) {
      return renderTextLines(blocks[0], x, y, style, nodeFont, textAnchor);
    }
    const offset = nodeFont.fontSize * 0.65;
    return renderTextLines(blocks[0], x, y - offset, style, nodeFont, textAnchor) + renderTextLines(blocks[1], x, y + offset, style, nodeFont, textAnchor);
  }
  function getNodeTextBlockHeight(command) {
    var _a;
    const nodeFont = getNodeFont(command);
    const fontSize = nodeFont.fontSize / UNIT_SCALE;
    const textWidthOption = parseNodeLength((_a = command.options) == null ? void 0 : _a["text width"], fontSize);
    const blocks = getTextBlocks(command).map(function(lines) {
      return wrapLinesToWidth(lines, textWidthOption, fontSize);
    });
    return blocks.reduce(function(sum, lines) {
      return sum + measureTextBlock(lines, fontSize).height;
    }, 0) * UNIT_SCALE;
  }
  function renderNodeShape(command, rect, style, strokeWidth) {
    const shape = getNodeShape(command);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    if (shape === "circle") {
      const radius = Math.max(rect.width, rect.height) / 2;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "ellipse") {
      return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rect.width / 2 + '" ry="' + rect.height / 2 + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "diamond" || shape === "kite") {
      const points = shape === "kite" ? [
        { x: cx, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height * 0.25 },
        { x: cx, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height * 0.25 }
      ] : [
        { x: cx, y: rect.y },
        { x: rect.x + rect.width, y: cy },
        { x: cx, y: rect.y + rect.height },
        { x: rect.x, y: cy }
      ];
      return '<path d="' + pointsToPath(points) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "isosceles triangle") {
      return '<path d="' + pointsToPath([
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: cy },
        { x: rect.x, y: rect.y + rect.height }
      ]) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "trapezium") {
      const inset = rect.width * 0.16;
      return '<path d="' + pointsToPath([
        { x: rect.x + inset, y: rect.y },
        { x: rect.x + rect.width - inset, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
      ]) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "regular polygon") {
      const sides = Math.max(3, Number.parseInt(command.options["regular polygon sides"] || "5", 10));
      const radius = Math.min(rect.width, rect.height) / 2;
      const startAngle = sides % 2 === 0 ? -90 + 180 / sides : -90;
      return '<path d="' + pointsToPath(getRegularPolygonPoints(cx, cy, radius, sides, startAngle)) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "semicircle") {
      const radius = rect.width / 2;
      return '<path d="M ' + rect.x + " " + (rect.y + rect.height) + " A " + radius + " " + radius + " 0 0 1 " + (rect.x + rect.width) + " " + (rect.y + rect.height) + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "circular sector") {
      const centerX = rect.x + rect.width;
      const centerY = cy;
      const halfHeight = rect.height / 2;
      const radius = Math.sqrt(rect.width * rect.width + halfHeight * halfHeight);
      const theta = Math.atan2(halfHeight, rect.width);
      const topAngle = Math.PI - theta;
      const bottomAngle = Math.PI + theta;
      const topX = centerX + Math.cos(topAngle) * radius;
      const topY = centerY + Math.sin(topAngle) * radius;
      const bottomX = centerX + Math.cos(bottomAngle) * radius;
      const bottomY = centerY + Math.sin(bottomAngle) * radius;
      return '<path d="M ' + centerX + " " + centerY + " L " + topX + " " + topY + " A " + radius + " " + radius + " 0 0 1 " + bottomX + " " + bottomY + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "rectangle split") {
      return '<rect x="' + rect.x + '" y="' + rect.y + '" width="' + rect.width + '" height="' + rect.height + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" /><line x1="' + rect.x + '" y1="' + cy + '" x2="' + (rect.x + rect.width) + '" y2="' + cy + '" stroke="' + escapeXml(style.stroke) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "circle split") {
      const radius = Math.max(rect.width, rect.height) / 2;
      const inset = radius - strokeWidth / 2;
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" /><line x1="' + (cx - inset) + '" y1="' + cy + '" x2="' + (cx + inset) + '" y2="' + cy + '" stroke="' + escapeXml(style.stroke) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "forbidden sign") {
      const radius = Math.max(rect.width, rect.height) / 2;
      const offset = (radius - strokeWidth / 2) / Math.sqrt(2);
      return '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" /><line x1="' + (cx - offset) + '" y1="' + (cy + offset) + '" x2="' + (cx + offset) + '" y2="' + (cy - offset) + '" stroke="' + escapeXml(style.stroke) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "star") {
      return '<path d="' + pointsToPath(getStarPoints(cx, cy, Math.min(rect.width, rect.height) / 2, Math.min(rect.width, rect.height) / 3.15, 10)) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "starburst") {
      const points = [];
      const spikes = 12;
      const rxOuter = rect.width / 2;
      const ryOuter = rect.height / 2;
      const rxInner = rxOuter * 0.72;
      const ryInner = ryOuter * 0.5;
      for (let index = 0; index < spikes * 2; index += 1) {
        const angle = (-90 + index * 180 / spikes) * Math.PI / 180;
        const rx = index % 2 === 0 ? rxOuter : rxInner;
        const ry = index % 2 === 0 ? ryOuter : ryInner;
        points.push({
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry
        });
      }
      return '<path d="' + pointsToPath(points) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "signal") {
      const points = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width - rect.height * 0.4, y: rect.y },
        { x: rect.x + rect.width, y: cy },
        { x: rect.x + rect.width - rect.height * 0.4, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height }
      ];
      return '<path d="' + pointsToPath(points) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "dart") {
      const points = [
        { x: rect.x + rect.width, y: cy },
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width * 0.1716, y: cy },
        { x: rect.x, y: rect.y + rect.height }
      ];
      return '<path d="' + pointsToPath(points) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "cloud") {
      return '<path d="M ' + (rect.x + rect.width * 0.2) + " " + (rect.y + rect.height * 0.8) + " C " + (rect.x - rect.width * 0.05) + " " + (rect.y + rect.height * 0.8) + " " + (rect.x - rect.width * 0.05) + " " + (rect.y + rect.height * 0.3) + " " + (rect.x + rect.width * 0.22) + " " + (rect.y + rect.height * 0.35) + " C " + (rect.x + rect.width * 0.25) + " " + (rect.y + rect.height * 0.05) + " " + (rect.x + rect.width * 0.55) + " " + (rect.y + rect.height * 0.02) + " " + (rect.x + rect.width * 0.62) + " " + (rect.y + rect.height * 0.26) + " C " + (rect.x + rect.width * 0.92) + " " + (rect.y + rect.height * 0.22) + " " + (rect.x + rect.width * 1.02) + " " + (rect.y + rect.height * 0.6) + " " + (rect.x + rect.width * 0.78) + " " + (rect.y + rect.height * 0.75) + " C " + (rect.x + rect.width * 0.7) + " " + (rect.y + rect.height * 0.95) + " " + (rect.x + rect.width * 0.35) + " " + (rect.y + rect.height * 0.98) + " " + (rect.x + rect.width * 0.2) + " " + (rect.y + rect.height * 0.8) + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "cylinder") {
      const ry = rect.height / 2;
      const cap = rect.height * 0.42;
      const left = rect.x;
      const right = rect.x + rect.width;
      const bodyRight = right - cap;
      return '<path d="M ' + (left + ry) + " " + rect.y + " H " + bodyRight + " A " + cap + " " + ry + " 0 0 1 " + bodyRight + " " + (rect.y + rect.height) + " H " + (left + ry) + " A " + ry + " " + ry + " 0 0 1 " + (left + ry) + " " + rect.y + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" /><ellipse cx="' + bodyRight + '" cy="' + cy + '" rx="' + cap + '" ry="' + ry + '" stroke="' + escapeXml(style.stroke) + '" fill="none" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "tape") {
      const leftX = rect.x;
      const rightX = rect.x + rect.width;
      const midX = (leftX + rightX) / 2;
      const topY = rect.y;
      const bottomY = rect.y + rect.height;
      const midY = rect.y + rect.height / 2;
      const textHeight = getNodeTextBlockHeight(command);
      const desiredBand = textHeight + 10;
      const side = Math.max(6, (rect.height - desiredBand) / 2);
      const waveX = rect.width * 0.22;
      const waveY = Math.max(4, side * 0.45);
      return '<path d="M ' + leftX + " " + midY + " L " + leftX + " " + (bottomY - side) + " C " + (leftX + waveX) + " " + (bottomY - side + waveY) + " " + (midX - waveX) + " " + (bottomY - side + waveY) + " " + midX + " " + (bottomY - side) + " C " + (midX + waveX) + " " + (bottomY - side - waveY) + " " + (rightX - waveX) + " " + (bottomY - side - waveY) + " " + rightX + " " + (bottomY - side) + " L " + rightX + " " + (topY + side) + " C " + (rightX - waveX) + " " + (topY + side - waveY) + " " + (midX + waveX) + " " + (topY + side - waveY) + " " + midX + " " + (topY + side) + " C " + (midX - waveX) + " " + (topY + side + waveY) + " " + (leftX + waveX) + " " + (topY + side + waveY) + " " + leftX + " " + (topY + side) + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    if (shape === "magnetic tape") {
      let px = function(x) {
        return cx2 + x * sx;
      }, py = function(y) {
        return cy2 - y * sy;
      };
      const radius = Math.min(rect.width, rect.height) / 2;
      const cx2 = rect.x + radius;
      const cy2 = rect.y + radius;
      const sx = radius / 31.32513;
      const sy = radius / 31.32513;
      return '<path d="M ' + px(16.50046) + " " + py(-26.6251) + " C " + px(25.7154) + " " + py(-20.9143) + " " + px(31.32513) + " " + py(-10.8416) + " " + px(31.32513) + " " + py(0) + " C " + px(31.32513) + " " + py(17.3006) + " " + px(17.3006) + " " + py(31.32513) + " " + px(0) + " " + py(31.32513) + " C " + px(-17.3006) + " " + py(31.32513) + " " + px(-31.32513) + " " + py(17.3006) + " " + px(-31.32513) + " " + py(0) + " C " + px(-31.32513) + " " + py(-17.3006) + " " + px(-17.3006) + " " + py(-31.32513) + " " + px(0) + " " + py(-31.32513) + " L " + px(31.32513) + " " + py(-31.32513) + " L " + px(31.32513) + " " + py(-26.62653) + " L " + px(16.50046) + " " + py(-26.6251) + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
    }
    return '<rect x="' + rect.x + '" y="' + rect.y + '" width="' + rect.width + '" height="' + rect.height + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }
  function getNodeTextCenter(command, rect) {
    const shape = getNodeShape(command);
    const nodeFont = getNodeFont(command);
    if (shape === "semicircle") {
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height * 0.78
      };
    }
    if (shape === "circular sector") {
      return {
        x: rect.x + nodeFont.fontSize * 1.08,
        y: rect.y + rect.height / 2
      };
    }
    if (shape === "kite") {
      return {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height * 0.42
      };
    }
    if (shape === "cylinder") {
      return {
        x: rect.x + rect.width * 0.4,
        y: rect.y + rect.height / 2
      };
    }
    if (shape === "signal") {
      return {
        x: rect.x + rect.width * 0.42,
        y: rect.y + rect.height / 2
      };
    }
    if (shape === "magnetic tape") {
      return {
        x: rect.x + rect.width * 0.42,
        y: rect.y + rect.height * 0.47
      };
    }
    if (shape === "isosceles triangle") {
      return {
        x: rect.x + rect.width * 0.33,
        y: rect.y + rect.height / 2
      };
    }
    if (shape === "dart") {
      return {
        x: rect.x + rect.width * 0.47,
        y: rect.y + rect.height / 2
      };
    }
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2
    };
  }
  function getNodeTextAnchor(command, defaultAnchor) {
    if (getNodeShape(command) === "circular sector") {
      return "middle";
    }
    return defaultAnchor;
  }
  function normalizeBounds(bounds) {
    if (!Number.isFinite(bounds.minX)) {
      return { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    }
    if (bounds.minX === bounds.maxX) {
      bounds.maxX += 1;
    }
    if (bounds.minY === bounds.maxY) {
      bounds.maxY += 1;
    }
    return bounds;
  }
  function getCommandPadding(command) {
    if (command.type === "node") {
      return 0.2;
    }
    const style = resolveStyles(command);
    let padding = style.lineWidth / UNIT_SCALE / 2;
    if (style.arrowStart || style.arrowEnd) {
      padding += 0.25;
    }
    return padding;
  }
  function collectRenderPadding(ast) {
    let maxFontSize = DEFAULT_FONT_SIZE;
    let maxLineWidth = 0.55;
    let maxTextWidth = 0;
    let maxTextHeight = DEFAULT_FONT_SIZE;
    let hasFreeLabels = false;
    for (const command of ast.commands) {
      if (command.type === "node") {
        const nodeFont = getNodeFont(command);
        maxFontSize = Math.max(maxFontSize, nodeFont.fontSize);
        const metrics = measureText(command.text, nodeFont.fontSize);
        maxTextWidth = Math.max(maxTextWidth, metrics.width);
        maxTextHeight = Math.max(maxTextHeight, metrics.height);
        const style = resolveStyles(command);
        if (style.stroke === "none" && style.fill === "none") {
          hasFreeLabels = true;
        }
      } else if (command.type === "mindmapedge") {
        maxLineWidth = Math.max(maxLineWidth, 0.9);
      } else {
        maxLineWidth = Math.max(maxLineWidth, resolveStyles(command).lineWidth);
        for (const operation of command.operations) {
          if (operation.type === "node") {
            const nodeFont = getNodeFont(operation);
            maxFontSize = Math.max(maxFontSize, nodeFont.fontSize);
            const metrics = measureText(operation.text, nodeFont.fontSize);
            maxTextWidth = Math.max(maxTextWidth, metrics.width);
            maxTextHeight = Math.max(maxTextHeight, metrics.height);
            const style = resolveStyles(operation);
            if (style.stroke === "none" && style.fill === "none") {
              hasFreeLabels = true;
            }
          }
          if (operation.type === "line" && operation.label) {
            maxFontSize = Math.max(maxFontSize, DEFAULT_FONT_SIZE);
            const metrics = measureText(operation.label, DEFAULT_FONT_SIZE);
            maxTextWidth = Math.max(maxTextWidth, metrics.width);
            maxTextHeight = Math.max(maxTextHeight, metrics.height);
            hasFreeLabels = true;
          }
        }
      }
    }
    const baseX = Math.max(12, maxFontSize * 0.6, maxLineWidth * 4);
    const baseY = Math.max(12, maxFontSize * 0.6, maxLineWidth * 4);
    return {
      x: Math.ceil(hasFreeLabels ? Math.max(baseX, maxTextWidth * 0.44) : baseX),
      y: Math.ceil(hasFreeLabels ? Math.max(baseY, maxTextHeight * 0.8) : baseY)
    };
  }
  function resolveBaseColor(options) {
    if (options.color) {
      return options.color;
    }
    for (const key of Object.keys(options)) {
      if (options[key] === true && NAMED_COLORS.has(key)) {
        return key;
      }
    }
    return null;
  }
  function formatRgbColor(red, green, blue) {
    return "rgb(" + red + ", " + green + ", " + blue + ")";
  }
  function resolveColorValue(value) {
    if (typeof value !== "string") {
      return value;
    }
    const trimmed = value.trim();
    if (trimmed.includes("!")) {
      const mixed = resolveMixedColor(trimmed);
      if (mixed) {
        return formatRgbColor(mixed[0], mixed[1], mixed[2]);
      }
    }
    return trimmed;
  }
  function resolveColorForGradient(value) {
    const mixed = resolveMixedColor(value);
    if (mixed) {
      return formatRgbColor(mixed[0], mixed[1], mixed[2]);
    }
    return resolveColorValue(value);
  }
  function resolveRgbComponents(value) {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    const hexMatch = trimmed.match(/^#([0-9a-fA-F]{6})$/);
    if (hexMatch) {
      return [
        Number.parseInt(hexMatch[1].slice(0, 2), 16),
        Number.parseInt(hexMatch[1].slice(2, 4), 16),
        Number.parseInt(hexMatch[1].slice(4, 6), 16)
      ];
    }
    const rgbMatch = trimmed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      return rgbMatch.slice(1).map(function(item) {
        return Number.parseInt(item, 10);
      });
    }
    const normalized = trimmed.toLowerCase();
    const named = XCOLOR_RGB[normalized] || COLOR_MIX_RGB[normalized];
    return named ? [...named] : null;
  }
  function mixRgbComponents(primary, percentage, secondary) {
    const factor = percentage / 100;
    return [0, 1, 2].map(function(index) {
      return Math.round(primary[index] * factor + secondary[index] * (1 - factor));
    });
  }
  function resolveMixedColor(value) {
    if (!value.includes("!")) {
      return resolveRgbComponents(value);
    }
    const parts = value.split("!").map(function(part) {
      return part.trim();
    }).filter(Boolean);
    if (parts.length < 2) {
      return resolveRgbComponents(value);
    }
    let current = resolveRgbComponents(parts[0]);
    if (!current) {
      return null;
    }
    let index = 1;
    while (index < parts.length) {
      const percentage = Math.max(0, Math.min(100, Number.parseFloat(parts[index])));
      if (!Number.isFinite(percentage)) {
        return null;
      }
      const nextColor = index + 1 < parts.length ? resolveRgbComponents(parts[index + 1]) : [255, 255, 255];
      if (!nextColor) {
        return null;
      }
      current = mixRgbComponents(current, percentage, nextColor);
      index += 2;
    }
    return current;
  }
  function buildLinearGradient(definitions, start, end, startColor, endColor) {
    const gradientId = "tikz-linear-gradient-" + definitions.length;
    definitions.push(
      '<linearGradient id="' + gradientId + '" gradientUnits="userSpaceOnUse" x1="' + start.x + '" y1="' + start.y + '" x2="' + end.x + '" y2="' + end.y + '"><stop offset="0%" stop-color="' + escapeXml(startColor) + '" /><stop offset="100%" stop-color="' + escapeXml(endColor) + '" /></linearGradient>'
    );
    return gradientId;
  }
  function renderMindmapEdgeCommand(command, bounds, definitions, padding) {
    const style = resolveStyles({ type: "fill", options: { fill: command.childColor, opacity: command.options.opacity } });
    const mapped = Object.fromEntries(Object.entries(command.path).map(function([key, point]) {
      return [key, mapCoordinate(bounds, point, padding)];
    }));
    const pathData = [
      "M " + mapped.r1.x + " " + mapped.r1.y,
      "C " + mapped.c1.x + " " + mapped.c1.y + " " + mapped.c2.x + " " + mapped.c2.y + " " + mapped.r2.x + " " + mapped.r2.y,
      "L " + mapped.l2.x + " " + mapped.l2.y,
      "C " + mapped.c2.x + " " + mapped.c2.y + " " + mapped.c1.x + " " + mapped.c1.y + " " + mapped.l1.x + " " + mapped.l1.y,
      "Z"
    ].join(" ");
    const resolvedParentColor = resolveColorForGradient(command.parentColor);
    const resolvedChildColor = resolveColorForGradient(command.childColor);
    const fillValue = command.usesGradient ? "url(#" + buildLinearGradient(definitions, mapped.c1, mapped.c2, resolvedParentColor, resolvedChildColor) + ")" : resolvedChildColor;
    return '<path d="' + pathData + '" ' + renderStyleAttributes({
      ...style,
      stroke: "none",
      fill: fillValue,
      lineWidth: 0
    }) + " />";
  }
  function lightenColor(color, amount) {
    const hexMatch = typeof color === "string" ? color.match(/^#([0-9a-fA-F]{6})$/) : null;
    const rgbMatch = typeof color === "string" ? color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/) : null;
    const namedRgb = typeof color === "string" ? COLOR_MIX_RGB[color.toLowerCase()] : null;
    let red;
    let green;
    let blue;
    if (hexMatch) {
      red = Number.parseInt(hexMatch[1].slice(0, 2), 16);
      green = Number.parseInt(hexMatch[1].slice(2, 4), 16);
      blue = Number.parseInt(hexMatch[1].slice(4, 6), 16);
    } else if (rgbMatch) {
      red = Number.parseInt(rgbMatch[1], 10);
      green = Number.parseInt(rgbMatch[2], 10);
      blue = Number.parseInt(rgbMatch[3], 10);
    } else if (namedRgb) {
      [red, green, blue] = namedRgb;
    } else {
      return color;
    }
    return formatRgbColor(
      Math.round(red + (255 - red) * amount),
      Math.round(green + (255 - green) * amount),
      Math.round(blue + (255 - blue) * amount)
    );
  }
  function darkenColor(color, amount) {
    const hexMatch = typeof color === "string" ? color.match(/^#([0-9a-fA-F]{6})$/) : null;
    const rgbMatch = typeof color === "string" ? color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/) : null;
    const namedRgb = typeof color === "string" ? COLOR_MIX_RGB[color.toLowerCase()] : null;
    let red;
    let green;
    let blue;
    if (hexMatch) {
      red = Number.parseInt(hexMatch[1].slice(0, 2), 16);
      green = Number.parseInt(hexMatch[1].slice(2, 4), 16);
      blue = Number.parseInt(hexMatch[1].slice(4, 6), 16);
    } else if (rgbMatch) {
      red = Number.parseInt(rgbMatch[1], 10);
      green = Number.parseInt(rgbMatch[2], 10);
      blue = Number.parseInt(rgbMatch[3], 10);
    } else if (namedRgb) {
      [red, green, blue] = namedRgb;
    } else {
      return color;
    }
    return formatRgbColor(
      Math.round(red * (1 - amount)),
      Math.round(green * (1 - amount)),
      Math.round(blue * (1 - amount))
    );
  }
  function resolveLineWidth(options, fallback) {
    if (options["line width"]) {
      const parsed = parseLength(options["line width"]);
      if (Number.isFinite(parsed)) {
        return parsed * UNIT_SCALE;
      }
    }
    if (options.thin) {
      return 0.3;
    }
    if (options.thick) {
      return 1.1;
    }
    if (options["very thick"]) {
      return 1.6;
    }
    return fallback;
  }
  function getLastMovePoint(operations) {
    return operations[0].point;
  }
  function collectBounds(ast) {
    const bounds = createEmptyBounds();
    const coordinateSystem = ast.coordinateSystem;
    const nodeRegistry = buildNodeRegistry(ast);
    for (const command of ast.commands) {
      if (command.type === "node") {
        const style = resolveStyles(command);
        const textOnlyDirectional = style.stroke === "none" && style.fill === "none" && (command.anchor || []).length > 0 && !command.placementAnchor;
        const nodePoint = textOnlyDirectional ? getDirectionalLabelPoint(command) : getNodePoint(command);
        const nodeFont = getNodeFont(command);
        const boxMetrics = getNodeBoxMetrics(command);
        const textLayout = getTextLayout(command);
        if (style.stroke !== "none" || style.fill !== "none") {
          const rect = getLogicalPlacementRect(nodePoint.x, nodePoint.y, boxMetrics.width, boxMetrics.height, command.placementAnchor);
          includePoint(bounds, rect.x, rect.y);
          includePoint(bounds, rect.x + rect.width, rect.y + rect.height);
        } else if (command.placementAnchor) {
          const textMetrics = measureText(command.text, nodeFont.fontSize / UNIT_SCALE);
          const rect = getLogicalPlacementRect(nodePoint.x, nodePoint.y, textMetrics.width, textMetrics.height, command.placementAnchor);
          includePoint(bounds, rect.x, rect.y);
          includePoint(bounds, rect.x + rect.width, rect.y + rect.height);
        } else if (textOnlyDirectional) {
          const textMetrics = measureText(command.text, nodeFont.fontSize / UNIT_SCALE);
          const rect = getAnchoredRect(nodePoint.x, nodePoint.y, textMetrics.width, textMetrics.height, textLayout.textAnchor, textLayout.dominantBaseline);
          includePoint(bounds, rect.x, rect.y);
          includePoint(bounds, rect.x + rect.width, rect.y + rect.height);
        } else {
          includeText(
            bounds,
            nodePoint.x,
            nodePoint.y,
            command.text,
            nodeFont.fontSize / UNIT_SCALE
          );
        }
        expandBounds(bounds, getCommandPadding(command));
        continue;
      }
      if (command.type === "mindmapedge") {
        for (const point of Object.values(command.path)) {
          includePoint(bounds, point.x, point.y);
        }
        continue;
      }
      let currentPoint = null;
      const startPoint = getLastMovePoint(command.operations);
      for (const operation of command.operations) {
        if (operation.type === "move") {
          currentPoint = resolvePoint(operation.point, nodeRegistry);
          includePoint(bounds, currentPoint.x, currentPoint.y);
          continue;
        }
        if (operation.type === "line") {
          const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
          if (operation.label) {
            const labelPoint = getLineLabelPoint(currentPoint, resolvedPoint);
            includeText(bounds, labelPoint.x, labelPoint.y, operation.label, DEFAULT_FONT_SIZE / UNIT_SCALE);
          }
          currentPoint = resolvedPoint;
          includePoint(bounds, currentPoint.x, currentPoint.y);
          continue;
        }
        if (operation.type === "plot") {
          for (const rawPoint of operation.points) {
            const resolvedPoint = resolvePoint(rawPoint, nodeRegistry);
            const shiftedPoint = applyShift(resolvedPoint, command.options.shiftPoint, nodeRegistry);
            includePoint(bounds, shiftedPoint.x, shiftedPoint.y);
          }
          continue;
        }
        if (operation.type === "node") {
          const style = resolveStyles(operation);
          const textOnlyDirectional = style.stroke === "none" && style.fill === "none" && (operation.anchor || []).length > 0 && !operation.placementAnchor;
          const nodePoint = textOnlyDirectional ? isAnchorAnnotationLabel(operation, command) ? getAnchorAnnotationLabelPoint({ ...operation, point: currentPoint }) : getDirectionalLabelPoint({ ...operation, point: currentPoint }) : getNodePoint(operation);
          const nodeFont = getNodeFont(operation);
          const boxMetrics = getNodeBoxMetrics(operation);
          const textLayout = getTextLayout(operation);
          if (style.stroke !== "none" || style.fill !== "none") {
            const rect = getLogicalPlacementRect(nodePoint.x, nodePoint.y, boxMetrics.width, boxMetrics.height, operation.placementAnchor);
            includePoint(bounds, rect.x, rect.y);
            includePoint(bounds, rect.x + rect.width, rect.y + rect.height);
          } else if (operation.placementAnchor) {
            const textMetrics = measureText(operation.text, nodeFont.fontSize / UNIT_SCALE);
            const rect = getLogicalPlacementRect(nodePoint.x, nodePoint.y, textMetrics.width, textMetrics.height, operation.placementAnchor);
            includePoint(bounds, rect.x, rect.y);
            includePoint(bounds, rect.x + rect.width, rect.y + rect.height);
          } else if (textOnlyDirectional) {
            const textMetrics = measureText(operation.text, nodeFont.fontSize / UNIT_SCALE);
            const rect = getAnchoredRect(nodePoint.x, nodePoint.y, textMetrics.width, textMetrics.height, textLayout.textAnchor, textLayout.dominantBaseline);
            includePoint(bounds, rect.x, rect.y);
            includePoint(bounds, rect.x + rect.width, rect.y + rect.height);
          } else {
            includeText(bounds, nodePoint.x, nodePoint.y, operation.text, nodeFont.fontSize / UNIT_SCALE);
          }
          continue;
        }
        if (operation.type === "rectangle") {
          const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
          includeRectangleArea(bounds, currentPoint, resolvedPoint);
          currentPoint = resolvedPoint;
          continue;
        }
        if (operation.type === "grid") {
          const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
          includeRectangleArea(bounds, currentPoint, resolvedPoint);
          currentPoint = resolvedPoint;
          continue;
        }
        if (operation.type === "curve") {
          const resolvedControlOne = resolvePoint(operation.controlOne, nodeRegistry);
          const resolvedControlTwo = resolvePoint(operation.controlTwo, nodeRegistry);
          const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
          includeCurve(bounds, currentPoint, resolvedControlOne, resolvedControlTwo, resolvedPoint);
          currentPoint = resolvedPoint;
          continue;
        }
        if (operation.type === "arc") {
          includeProjectedEllipse(bounds, operation.center, operation.xRadius || operation.radius, operation.yRadius || operation.radius, coordinateSystem, operation.startAngle, operation.endAngle);
          currentPoint = resolvePoint(operation.point, nodeRegistry);
          continue;
        }
        if (operation.type === "ellipse") {
          includeProjectedEllipse(bounds, currentPoint, operation.xRadius, operation.yRadius, coordinateSystem);
          continue;
        }
        if (operation.type === "close") {
          includePoint(bounds, startPoint.x, startPoint.y);
        }
      }
      expandBounds(bounds, getCommandPadding(command));
    }
    return normalizeBounds(bounds);
  }
  function mapCoordinate(bounds, point, padding) {
    return {
      x: padding.x + (point.x - bounds.minX) * UNIT_SCALE,
      y: padding.y + (bounds.maxY - point.y) * UNIT_SCALE
    };
  }
  function resolveStyles(command) {
    const options = command.options || {};
    let lineWidth = resolveLineWidth(options, 0.55);
    const opacity = options.opacity ? Number.parseFloat(options.opacity) : 1;
    const baseColor = resolveBaseColor(options);
    const ballColor = resolveColorValue(options["ball color"] || baseColor || "currentColor");
    let stroke = "none";
    let fill = "none";
    if (command.type === "draw") {
      stroke = options.draw === false ? "none" : resolveColorValue(options.draw || baseColor || "currentColor");
      fill = resolveColorValue(options.fill || "none");
    } else if (command.type === "fill") {
      fill = resolveColorValue(options.fill || baseColor || "currentColor");
      stroke = resolveColorValue(options.draw || "none");
    } else if (command.type === "node") {
      fill = resolveColorValue(options.fill || "none");
    }
    if (options.draw === true) {
      stroke = resolveColorValue(baseColor || "currentColor");
    }
    if (options.fill === true) {
      fill = resolveColorValue(baseColor || "currentColor");
    }
    return {
      stroke,
      fill,
      textFill: command.type === "node" ? resolveColorValue(options.text || baseColor || "currentColor") : null,
      textAlign: options.align === "center" || options["text centered"] ? "center" : null,
      ballColor,
      shadingBall: options.shading === "ball",
      opacity: Number.isFinite(opacity) ? opacity : 1,
      lineWidth: Number.isFinite(lineWidth) ? lineWidth : 1.5,
      dashed: Boolean(options.dashed),
      dotted: Boolean(options.dotted),
      arrowStart: Boolean(options["<-"] || options["<->"]),
      arrowEnd: Boolean(options["->"] || options["<->"])
    };
  }
  function buildBallGradient(definitions, style, gradientBox) {
    const gradientId = "tikz-ball-gradient-" + definitions.length;
    const highlightColor = lightenColor(style.ballColor, 0.85);
    const brightColor = lightenColor(style.ballColor, 0.25);
    const midColor = darkenColor(style.ballColor, 0.3);
    const darkColor = darkenColor(style.ballColor, 0.5);
    const shadowColor = "black";
    definitions.push(
      '<radialGradient id="' + gradientId + '" gradientUnits="userSpaceOnUse" cx="' + (gradientBox.x + gradientBox.size * 0.5) + '" cy="' + (gradientBox.y + gradientBox.size * 0.5) + '" fx="' + (gradientBox.x + gradientBox.size * 0.4) + '" fy="' + (gradientBox.y + gradientBox.size * 0.4) + '" r="' + gradientBox.size * 0.5 + '"><stop offset="0%" stop-color="' + escapeXml(highlightColor) + '" /><stop offset="18%" stop-color="' + escapeXml(brightColor) + '" /><stop offset="36%" stop-color="' + escapeXml(midColor) + '" /><stop offset="50%" stop-color="' + escapeXml(darkColor) + '" /><stop offset="100%" stop-color="' + escapeXml(shadowColor) + '" /></radialGradient>'
    );
    return gradientId;
  }
  function renderShapeElements(pathData, style, definitions, screenBounds) {
    if (!style.shadingBall) {
      return '<path d="' + pathData + '" ' + renderStyleAttributes(style) + " />";
    }
    const gradientBox = getSquareGradientBox(screenBounds);
    const gradientId = buildBallGradient(definitions, style, gradientBox);
    const clipPathId = "tikz-ball-clip-" + definitions.length;
    definitions.push('<clipPath id="' + clipPathId + '"><path d="' + pathData + '" /></clipPath>');
    const fillPath = '<rect x="' + gradientBox.x + '" y="' + gradientBox.y + '" width="' + gradientBox.size + '" height="' + gradientBox.size + '" clip-path="url(#' + clipPathId + ')" fill="url(#' + gradientId + ')" opacity="' + style.opacity + '" />';
    const strokePath = '<path d="' + pathData + '" ' + renderStyleAttributes({
      ...style,
      fill: "none"
    }) + " />";
    return fillPath + strokePath;
  }
  function createScreenBounds() {
    return {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity
    };
  }
  function includeScreenPoint(bounds, point) {
    bounds.minX = Math.min(bounds.minX, point.x);
    bounds.minY = Math.min(bounds.minY, point.y);
    bounds.maxX = Math.max(bounds.maxX, point.x);
    bounds.maxY = Math.max(bounds.maxY, point.y);
  }
  function getSquareGradientBox(screenBounds) {
    const width = screenBounds.maxX - screenBounds.minX;
    const height = screenBounds.maxY - screenBounds.minY;
    const size = Math.max(width, height) * 2;
    const centerX = (screenBounds.minX + screenBounds.maxX) / 2;
    const centerY = (screenBounds.minY + screenBounds.maxY) / 2;
    return {
      x: centerX - size / 2,
      y: centerY - size / 2,
      size
    };
  }
  function renderStyleAttributes(style) {
    const attributes = [
      'stroke="' + escapeXml(style.stroke) + '"',
      'fill="' + escapeXml(style.fill) + '"',
      'stroke-width="' + style.lineWidth + '"',
      'opacity="' + style.opacity + '"',
      'stroke-linecap="round"',
      'stroke-linejoin="round"'
    ];
    if (style.dashed) {
      attributes.push('stroke-dasharray="6 4"');
    }
    if (style.dotted) {
      attributes.push('stroke-dasharray="1 6"');
      attributes.push('stroke-linecap="round"');
    }
    return attributes.join(" ");
  }
  function renderMarkerAttributes(style) {
    const attributes = [];
    if (style.arrowStart) {
      attributes.push('marker-start="url(#tikz-arrow-start)"');
    }
    if (style.arrowEnd) {
      attributes.push('marker-end="url(#tikz-arrow-end)"');
    }
    return attributes.join(" ");
  }
  function renderArrowDefinitions() {
    return '<defs><marker id="tikz-arrow-end" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker><marker id="tikz-arrow-start" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" /></marker></defs>';
  }
  function commandUsesArrow(command) {
    if (command.type === "node" || command.type === "mindmapedge") {
      return false;
    }
    const style = resolveStyles(command);
    return style.arrowStart || style.arrowEnd;
  }
  function sampleProjectedEllipsePoints(center, xRadius, yRadius, bounds, coordinateSystem, padding, startAngle = 0, endAngle = 360) {
    const segments = 64;
    const points = [];
    const screenBounds = createScreenBounds();
    const startRadians = startAngle * Math.PI / 180;
    const endRadians = endAngle * Math.PI / 180;
    const totalRadians = endRadians - startRadians;
    for (let index = 0; index <= segments; index += 1) {
      const angle = startRadians + index / segments * totalRadians;
      const point = {
        x: center.x + Math.cos(angle) * xRadius * coordinateSystem.xBasis.x + Math.sin(angle) * yRadius * coordinateSystem.yBasis.x,
        y: center.y + Math.cos(angle) * xRadius * coordinateSystem.xBasis.y + Math.sin(angle) * yRadius * coordinateSystem.yBasis.y
      };
      const mappedPoint = mapCoordinate(bounds, point, padding);
      points.push(mappedPoint);
      includeScreenPoint(screenBounds, mappedPoint);
    }
    return {
      points,
      screenBounds
    };
  }
  function renderProjectedEllipse(center, xRadius, yRadius, style, bounds, coordinateSystem, definitions, padding, startAngle = 0, endAngle = 360) {
    const sampled = sampleProjectedEllipsePoints(center, xRadius, yRadius, bounds, coordinateSystem, padding, startAngle, endAngle);
    const points = sampled.points;
    let pathData = "";
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      pathData += (index === 0 ? "M " : "L ") + point.x + " " + point.y + " ";
    }
    return renderShapeElements(pathData.trim(), style, definitions, sampled.screenBounds);
  }
  function renderPlotMark(operation, command, bounds, nodeRegistry, padding) {
    const elements = [];
    const halfSize = 4;
    for (const rawPoint of operation.points) {
      const resolvedPoint = resolvePoint(rawPoint, nodeRegistry);
      const shiftedPoint = applyShift(resolvedPoint, command.options.shiftPoint, nodeRegistry);
      const point = mapCoordinate(bounds, shiftedPoint, padding);
      if (operation.mark === "x") {
        elements.push('<path d="M ' + (point.x - halfSize) + " " + (point.y - halfSize) + " L " + (point.x + halfSize) + " " + (point.y + halfSize) + " M " + (point.x - halfSize) + " " + (point.y + halfSize) + " L " + (point.x + halfSize) + " " + (point.y - halfSize) + '" ' + renderStyleAttributes({ ...resolveStyles(command), fill: "none" }) + " />");
      }
    }
    return elements.join("");
  }
  function renderPathCommand(command, bounds, coordinateSystem, definitions, padding) {
    const style = resolveStyles(command);
    const nodeRegistry = command.nodeRegistry;
    const firstPoint = resolvePoint(command.operations[0].point, nodeRegistry);
    const startPoint = applyShift(firstPoint, command.options.shiftPoint, nodeRegistry);
    let currentPoint = startPoint;
    let pathData = "";
    let hasDrawablePathSegment = false;
    const markerAttributes = renderMarkerAttributes(style);
    const labels = [];
    const inlineNodes = [];
    const shapeElements = [];
    for (const operation of command.operations) {
      if (operation.type === "move") {
        const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
        const shiftedPoint = applyShift(resolvedPoint, command.options.shiftPoint, nodeRegistry);
        const point = mapCoordinate(bounds, shiftedPoint, padding);
        pathData += "M " + point.x + " " + point.y + " ";
        currentPoint = shiftedPoint;
        continue;
      }
      if (operation.type === "line") {
        const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
        const shiftedPoint = applyShift(resolvedPoint, command.options.shiftPoint, nodeRegistry);
        const point = mapCoordinate(bounds, shiftedPoint, padding);
        pathData += "L " + point.x + " " + point.y + " ";
        hasDrawablePathSegment = true;
        if (operation.label) {
          labels.push({
            point: getLineLabelPoint(currentPoint, shiftedPoint),
            text: operation.label
          });
        }
        currentPoint = shiftedPoint;
        continue;
      }
      if (operation.type === "plot") {
        shapeElements.push(renderPlotMark(operation, command, bounds, nodeRegistry, padding));
        if (operation.points.length > 0) {
          const lastResolved = resolvePoint(operation.points[operation.points.length - 1], nodeRegistry);
          currentPoint = applyShift(lastResolved, command.options.shiftPoint, nodeRegistry);
        }
        continue;
      }
      if (operation.type === "curve") {
        const resolvedControlOne = resolvePoint(operation.controlOne, nodeRegistry);
        const resolvedControlTwo = resolvePoint(operation.controlTwo, nodeRegistry);
        const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
        const shiftedControlOne = applyShift(resolvedControlOne, command.options.shiftPoint, nodeRegistry);
        const shiftedControlTwo = applyShift(resolvedControlTwo, command.options.shiftPoint, nodeRegistry);
        const shiftedPoint = applyShift(resolvedPoint, command.options.shiftPoint, nodeRegistry);
        const controlOne = mapCoordinate(bounds, shiftedControlOne, padding);
        const controlTwo = mapCoordinate(bounds, shiftedControlTwo, padding);
        const point = mapCoordinate(bounds, shiftedPoint, padding);
        pathData += "C " + controlOne.x + " " + controlOne.y + " " + controlTwo.x + " " + controlTwo.y + " " + point.x + " " + point.y + " ";
        hasDrawablePathSegment = true;
        currentPoint = shiftedPoint;
        continue;
      }
      if (operation.type === "arc") {
        const sampledArc = sampleProjectedEllipsePoints(
          operation.center,
          operation.xRadius || operation.radius,
          operation.yRadius || operation.radius,
          bounds,
          coordinateSystem,
          padding,
          operation.startAngle,
          operation.endAngle
        );
        for (let index = 1; index < sampledArc.points.length; index += 1) {
          const point = sampledArc.points[index];
          pathData += "L " + point.x + " " + point.y + " ";
        }
        hasDrawablePathSegment = true;
        currentPoint = resolvePoint(operation.point, nodeRegistry);
        continue;
      }
      if (operation.type === "node") {
        inlineNodes.push(renderNodeCommand({ ...operation, point: currentPoint }, bounds, padding, command));
        continue;
      }
      if (operation.type === "rectangle") {
        const mappedStart = mapCoordinate(bounds, currentPoint, padding);
        const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
        const mappedEnd = mapCoordinate(bounds, resolvedPoint, padding);
        const left = Math.min(mappedStart.x, mappedEnd.x);
        const top = Math.min(mappedStart.y, mappedEnd.y);
        const width = Math.abs(mappedEnd.x - mappedStart.x);
        const height = Math.abs(mappedEnd.y - mappedStart.y);
        const rectPath = "M " + left + " " + top + " L " + (left + width) + " " + top + " L " + (left + width) + " " + (top + height) + " L " + left + " " + (top + height) + " Z";
        shapeElements.push(renderShapeElements(rectPath, style, definitions, {
          minX: left,
          minY: top,
          maxX: left + width,
          maxY: top + height
        }));
        currentPoint = resolvedPoint;
        continue;
      }
      if (operation.type === "grid") {
        const resolvedPoint = resolvePoint(operation.point, nodeRegistry);
        const mappedStart = mapCoordinate(bounds, currentPoint, padding);
        const mappedEnd = mapCoordinate(bounds, resolvedPoint, padding);
        const minX = Math.min(currentPoint.x, resolvedPoint.x);
        const maxX = Math.max(currentPoint.x, resolvedPoint.x);
        const minY = Math.min(currentPoint.y, resolvedPoint.y);
        const maxY = Math.max(currentPoint.y, resolvedPoint.y);
        const segments = [];
        for (let x = Math.ceil(minX); x <= Math.floor(maxX); x += 1) {
          const start = mapCoordinate(bounds, { x, y: minY }, padding);
          const end = mapCoordinate(bounds, { x, y: maxY }, padding);
          segments.push("M " + start.x + " " + start.y + " L " + end.x + " " + end.y);
        }
        for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
          const start = mapCoordinate(bounds, { x: minX, y }, padding);
          const end = mapCoordinate(bounds, { x: maxX, y }, padding);
          segments.push("M " + start.x + " " + start.y + " L " + end.x + " " + end.y);
        }
        currentPoint = resolvedPoint;
        shapeElements.push(renderShapeElements(segments.join(" "), style, definitions));
        continue;
      }
      if (operation.type === "ellipse") {
        shapeElements.push(renderProjectedEllipse(currentPoint, operation.xRadius, operation.yRadius, style, bounds, coordinateSystem, definitions, padding));
        continue;
      }
      if (operation.type === "close") {
        const point = mapCoordinate(bounds, startPoint, padding);
        pathData += "L " + point.x + " " + point.y + " Z";
        hasDrawablePathSegment = true;
      }
    }
    const pathElement = hasDrawablePathSegment && pathData.trim() ? '<path d="' + pathData.trim() + '" ' + renderStyleAttributes(style) + (markerAttributes ? " " + markerAttributes : "") + " />" : "";
    const labelElements = labels.map(function(label) {
      const point = mapCoordinate(bounds, label.point, padding);
      return '<text x="' + point.x + '" y="' + point.y + '" text-anchor="middle" dominant-baseline="auto" fill="' + escapeXml(style.stroke === "none" ? "currentColor" : style.stroke) + '" opacity="' + style.opacity + '" font-family="' + escapeXml(DEFAULT_FONT_FAMILY) + '" font-size="' + DEFAULT_FONT_SIZE + '">' + renderTextContent(label.text) + "</text>";
    }).join("");
    return shapeElements.join("") + pathElement + labelElements + inlineNodes.join("");
  }
  function renderNodeCommand(command, bounds, padding, parentCommand = null) {
    const style = resolveStyles(command);
    const textLayout = getTextLayout(command);
    const nodeFont = getNodeFont(command);
    const boxMetrics = getNodeBoxMetrics(command);
    const textOnlyDirectional = style.stroke === "none" && style.fill === "none" && (command.anchor || []).length > 0 && !command.placementAnchor;
    const logicalPoint = textOnlyDirectional ? isAnchorAnnotationLabel(command, parentCommand) ? getAnchorAnnotationLabelPoint(command) : getDirectionalLabelPoint(command) : getNodePoint(command);
    const point = mapCoordinate(bounds, logicalPoint, padding);
    let x = point.x;
    let y = point.y;
    let boxElement = "";
    if (style.stroke !== "none" || style.fill !== "none") {
      const rect = getPlacementRect(x, y, boxMetrics.width * UNIT_SCALE, boxMetrics.height * UNIT_SCALE, command.placementAnchor);
      const strokeWidth = Math.max(style.lineWidth, 0.7);
      const textCenter = getNodeTextCenter(command, rect);
      x = textCenter.x;
      y = textCenter.y;
      boxElement = renderNodeShape(command, rect, style, strokeWidth);
    } else if (command.placementAnchor) {
      const textMetrics = measureText(command.text, nodeFont.fontSize);
      const rect = getPlacementRect(x, y, textMetrics.width, textMetrics.height, command.placementAnchor);
      x = rect.x + rect.width / 2;
      y = rect.y + rect.height / 2;
    }
    const baseline = boxElement ? "central" : textLayout.dominantBaseline;
    const alignmentBaseline = boxElement ? "central" : textLayout.dominantBaseline;
    const textAnchor = getNodeTextAnchor(command, boxElement ? "middle" : textLayout.textAnchor);
    return boxElement + renderNodeText(command, x, y, style, nodeFont, textAnchor);
  }
  function updateRenderedBounds(bounds, x1, y1, x2, y2) {
    if (!Number.isFinite(x1) || !Number.isFinite(y1) || !Number.isFinite(x2) || !Number.isFinite(y2)) {
      return;
    }
    bounds.minX = Math.min(bounds.minX, x1, x2);
    bounds.minY = Math.min(bounds.minY, y1, y2);
    bounds.maxX = Math.max(bounds.maxX, x1, x2);
    bounds.maxY = Math.max(bounds.maxY, y1, y2);
  }
  function collectRenderedElementBounds(elementsMarkup) {
    const bounds = createEmptyBounds();
    for (const match of elementsMarkup.matchAll(/<rect [^>]*x="([^"]+)" y="([^"]+)" width="([^"]+)" height="([^"]+)"[^>]*>/g)) {
      if (match[0].includes("clip-path=")) {
        continue;
      }
      const [x, y, width, height] = match.slice(1).map(Number);
      updateRenderedBounds(bounds, x, y, x + width, y + height);
    }
    for (const match of elementsMarkup.matchAll(/<circle cx="([^"]+)" cy="([^"]+)" r="([^"]+)"/g)) {
      const [cx, cy, radius] = match.slice(1).map(Number);
      updateRenderedBounds(bounds, cx - radius, cy - radius, cx + radius, cy + radius);
    }
    for (const match of elementsMarkup.matchAll(/<ellipse cx="([^"]+)" cy="([^"]+)" rx="([^"]+)" ry="([^"]+)"/g)) {
      const [cx, cy, rx, ry] = match.slice(1).map(Number);
      updateRenderedBounds(bounds, cx - rx, cy - ry, cx + rx, cy + ry);
    }
    for (const match of elementsMarkup.matchAll(/<line x1="([^"]+)" y1="([^"]+)" x2="([^"]+)" y2="([^"]+)"/g)) {
      const [x1, y1, x2, y2] = match.slice(1).map(Number);
      updateRenderedBounds(bounds, x1, y1, x2, y2);
    }
    for (const match of elementsMarkup.matchAll(/<text x="([^"]+)" y="([^"]+)" text-anchor="([^"]+)"[^>]*font-size="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g)) {
      const x = Number(match[1]);
      const y = Number(match[2]);
      const anchor = match[3];
      const fontSize = Number(match[4]);
      const textMarkup = match[5];
      const lineTexts = [...textMarkup.matchAll(/<tspan[^>]*><tspan>([^<]*)<\/tspan><\/tspan>/g)].map(function(item) {
        return item[1];
      });
      const widest = Math.max(...lineTexts.map(function(line) {
        return measureText(line, fontSize).width;
      }), fontSize);
      const height = Math.max(lineTexts.length, 1) * fontSize * 1.1;
      let left = x - widest / 2;
      if (anchor === "start") {
        left = x;
      } else if (anchor === "end") {
        left = x - widest;
      }
      updateRenderedBounds(bounds, left, y - height / 2, left + widest, y + height / 2);
    }
    for (const match of elementsMarkup.matchAll(/<path d="([^"]+)"/g)) {
      const d = match[1];
      for (const cmd of d.matchAll(/[ML] ([0-9.-]+) ([0-9.-]+)/g)) {
        updateRenderedBounds(bounds, Number(cmd[1]), Number(cmd[2]), Number(cmd[1]), Number(cmd[2]));
      }
      for (const cmd of d.matchAll(/C ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+) ([0-9.-]+)/g)) {
        updateRenderedBounds(bounds, Number(cmd[1]), Number(cmd[2]), Number(cmd[1]), Number(cmd[2]));
        updateRenderedBounds(bounds, Number(cmd[3]), Number(cmd[4]), Number(cmd[3]), Number(cmd[4]));
        updateRenderedBounds(bounds, Number(cmd[5]), Number(cmd[6]), Number(cmd[5]), Number(cmd[6]));
      }
      for (const cmd of d.matchAll(/A ([0-9.-]+) ([0-9.-]+) [0-9.-]+ [01] [01] ([0-9.-]+) ([0-9.-]+)/g)) {
        const rx = Number(cmd[1]);
        const ry = Number(cmd[2]);
        const x = Number(cmd[3]);
        const y = Number(cmd[4]);
        updateRenderedBounds(bounds, x - rx, y - ry, x + rx, y + ry);
      }
    }
    return normalizeBounds(bounds);
  }
  function render(ast) {
    const expandedAst = expandMatrices(expandMindmaps(ast));
    const bounds = collectBounds(expandedAst);
    const padding = collectRenderPadding(expandedAst);
    const backgroundElements = [];
    const foregroundElements = [];
    const definitions = [];
    const includeArrowDefinitions = expandedAst.commands.some(commandUsesArrow);
    const nodeRegistry = buildNodeRegistry(expandedAst);
    if (includeArrowDefinitions) {
      definitions.push(renderArrowDefinitions().replace(/^<defs>|<\/defs>$/g, ""));
    }
    for (const command of expandedAst.commands) {
      if (command.type === "node") {
        const element = renderNodeCommand(command, bounds, padding);
        if (command.mindmapConcept) {
          foregroundElements.push(element);
        } else {
          backgroundElements.push(element);
        }
        continue;
      }
      if (command.type === "mindmapedge") {
        backgroundElements.push(renderMindmapEdgeCommand(command, bounds, definitions, padding));
        continue;
      }
      backgroundElements.push(renderPathCommand({ ...command, nodeRegistry }, bounds, ast.coordinateSystem, definitions, padding));
    }
    const content = backgroundElements.join("") + foregroundElements.join("");
    const renderedBounds = collectRenderedElementBounds(content);
    const outerMargin = Math.max(6, Math.min(padding.x, padding.y) * 0.5);
    const viewMinX = Math.floor(renderedBounds.minX - outerMargin);
    const viewMinY = Math.floor(renderedBounds.minY - outerMargin);
    const viewWidth = Math.max(1, Math.ceil(renderedBounds.maxX - renderedBounds.minX + outerMargin * 2));
    const viewHeight = Math.max(1, Math.ceil(renderedBounds.maxY - renderedBounds.minY + outerMargin * 2));
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewMinX + " " + viewMinY + " " + viewWidth + " " + viewHeight + '" width="' + viewWidth + '" height="' + viewHeight + '" role="img">' + (definitions.length ? "<defs>" + definitions.join("") + "</defs>" : "") + content + "</svg>";
  }

  // src/Tikz.js
  function renderToSvg(source, config = {}) {
    const ast = parse(source, config);
    return render(ast, config);
  }

  // src/TikzDom.js
  function escapeHtml(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function renderElement(element) {
    const source = element.dataset.tikzSource || element.textContent || "";
    element.dataset.tikzSource = source;
    try {
      const svg = renderToSvg(source);
      element.innerHTML = svg;
      element.dataset.tikzRendered = "true";
      element.removeAttribute("data-tikz-error");
      return svg;
    } catch (error) {
      element.dataset.tikzRendered = "false";
      element.dataset.tikzError = error.message;
      element.innerHTML = '<div style="padding:12px;border:1px solid #d14343;background:#fff5f5;color:#7a1212;font-family:Arial,sans-serif;font-size:14px;white-space:pre-wrap;"><strong>Tikz render error</strong><br>' + escapeHtml(error.message) + "</div>";
      return null;
    }
  }
  function renderAll(root = document) {
    const elements = root.querySelectorAll(".tikz");
    for (const element of elements) {
      renderElement(element);
    }
  }

  // src/index.js
  function startAutoRender() {
    if (typeof document === "undefined") {
      return;
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        renderAll();
      }, { once: true });
      return;
    }
    renderAll();
  }
  var api = {
    renderToSvg,
    renderAll,
    renderElement
  };
  startAutoRender();
  var index_default = api;
  return __toCommonJS(index_exports);
})();
