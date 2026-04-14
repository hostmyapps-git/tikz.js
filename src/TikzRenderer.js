const UNIT_SCALE = 40;
const DEFAULT_FONT_SIZE = 13.333;
const DEFAULT_NODE_OFFSET = 0.18;
const DEFAULT_FONT_FAMILY = '"Latin Modern Roman", "LM Roman 10", "CMU Serif", "Computer Modern Serif", "TeX Gyre Termes", "Times New Roman", Times, serif';
const INNER_SEP_SCALE = 1.17;
const COLOR_MIX_RGB = {
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
const NAMED_COLORS = new Set([
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
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

function includeCircle(bounds, x, y, radius) {
  includePoint(bounds, x - radius, y - radius);
  includePoint(bounds, x + radius, y + radius);
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

    let adjustedAngle = normalizedAngle;
    if (adjustedAngle < start) {
      adjustedAngle += 360;
    }

    return adjustedAngle >= start && adjustedAngle <= end;
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

function includeArc(bounds, operation, startPoint) {
  includePoint(bounds, startPoint.x, startPoint.y);
  includePoint(bounds, operation.point.x, operation.point.y);

  const sweepPositive = operation.endAngle >= operation.startAngle;
  for (const angle of [0, 90, 180, 270]) {
    if (isAngleBetween(angle, operation.startAngle, operation.endAngle, sweepPositive)) {
      const radians = angle * Math.PI / 180;
      includePoint(
        bounds,
        operation.center.x + Math.cos(radians) * operation.radius,
        operation.center.y + Math.sin(radians) * operation.radius
      );
    }
  }
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
  return inverse * inverse * inverse * start +
    3 * inverse * inverse * t * controlOne +
    3 * inverse * t * t * controlTwo +
    t * t * t * end;
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

  const parameters = new Set([
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

function getAnchorOffset(anchor) {
  const offset = { x: 0, y: 0 };

  if (!anchor) {
    return offset;
  }

  if (anchor.includes("left")) {
    offset.x = -DEFAULT_NODE_OFFSET;
  } else if (anchor.includes("right")) {
    offset.x = DEFAULT_NODE_OFFSET;
  }

  if (anchor.includes("above")) {
    offset.y = DEFAULT_NODE_OFFSET;
  } else if (anchor.includes("below")) {
    offset.y = -DEFAULT_NODE_OFFSET;
  }

  return offset;
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
  const textBlocks = getTextBlocks(command).map(function (lines) {
    return wrapLinesToWidth(lines, textWidthOption, fontSize);
  });
  const blockMetrics = textBlocks.map(function (lines) {
    return measureTextBlock(lines, fontSize);
  });
  const totalLineCount = textBlocks.reduce(function (sum, lines) {
    return sum + Math.max(lines.length, 1);
  }, 0);
  const textWidth = Math.max(...blockMetrics.map(function (metrics) {
    return metrics.width;
  }), fontSize) + layoutHints.extraWidth;
  const textHeight = blockMetrics.reduce(function (sum, metrics) {
    return sum + metrics.height;
  }, 0);
  const shape = getNodeShape(command);
  const innerSep = typeof options["inner sep"] === "string" ? parseLength(options["inner sep"]) : null;
  const innerXSep = typeof options["inner xsep"] === "string" ? parseLength(options["inner xsep"]) : innerSep;
  const innerYSep = typeof options["inner ysep"] === "string" ? parseLength(options["inner ysep"]) : innerSep;
  const xPad = innerXSep !== null ? innerXSep * 2 * INNER_SEP_SCALE : null;
  const yPad = innerYSep !== null ? innerYSep * 2 * INNER_SEP_SCALE : null;
  const baseTextWidth = textWidthOption !== null ? Math.max(textWidthOption, textWidth) : textWidth;

  if (shape === "ellipse") {
    return {
      width: baseTextWidth + (xPad !== null ? xPad : 0.52),
      height: textHeight + (yPad !== null ? yPad : 0.49)
    };
  }

  if (shape === "semicircle") {
    const width = baseTextWidth * 0.62 + (xPad !== null ? xPad : 0.24);
    const minWidthForHeight = (textHeight + (yPad !== null ? yPad : 0.49)) * 2;
    const diameter = Math.max(width, minWidthForHeight);
    return {
      width: diameter,
      height: diameter / 2
    };
  }

  if (shape === "circular sector") {
    const width = baseTextWidth * 1.28 + (xPad !== null ? xPad : 0.42);
    return {
      width,
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.62), width * 0.92)
    };
  }

  if (shape === "dart") {
    return {
      width: baseTextWidth * 1.18 + (xPad !== null ? xPad : 0.34),
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.95), (baseTextWidth * 1.18 + (xPad !== null ? xPad : 0.34)) * 0.83)
    };
  }

  if (shape === "kite") {
    const width = baseTextWidth * 0.9 + (xPad !== null ? xPad : 0.3);
    return {
      width,
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.55), width * 1.16)
    };
  }

  if (shape === "diamond") {
    const size = Math.max(
      baseTextWidth + (xPad !== null ? xPad : 0.28),
      textHeight + (yPad !== null ? yPad : 0.4)
    );

    return {
      width: size,
      height: size
    };
  }

  if (shape === "isosceles triangle") {
    const width = baseTextWidth * 1.08 + (xPad !== null ? xPad : 0.34);
    return {
      width,
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.5), width * 0.9)
    };
  }

  if (shape === "trapezium") {
    const width = baseTextWidth * 1.18 + (xPad !== null ? xPad : 0.34);
    return {
      width,
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.22), width * 0.26)
    };
  }

  if (shape === "tape") {
    const width = baseTextWidth * 0.86 + (xPad !== null ? xPad : 0.24);
    const extraLines = Math.max(0, totalLineCount - 1);
    const multilinePadding = extraLines * 0.38;
    return {
      width,
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.46) + multilinePadding, width * (1.32 + extraLines * 0.16))
    };
  }

  if (shape === "magnetic tape") {
    const size = Math.max(
      baseTextWidth * 1.22 + (xPad !== null ? xPad : 0.34),
      textHeight + (yPad !== null ? yPad : 0.46)
    );
    return {
      width: size,
      height: size
    };
  }

  if (shape === "cylinder") {
    const width = baseTextWidth * 1.05 + (xPad !== null ? xPad : 0.34);
    return {
      width,
      height: textHeight + (yPad !== null ? yPad : 0.3)
    };
  }

  if (shape === "rectangle split") {
    return {
      width: baseTextWidth * 0.62 + (xPad !== null ? xPad : 0.14),
      height: textHeight + (yPad !== null ? yPad : 0.18)
    };
  }

  if (shape === "circle split") {
    const width = baseTextWidth * 0.62 + (xPad !== null ? xPad : 0.14);
    const height = textHeight + (yPad !== null ? yPad : 0.18);
    const diameter = Math.max(width, height);
    return {
      width: diameter,
      height: diameter
    };
  }

  if (shape === "circle") {
    const width = baseTextWidth + (xPad !== null ? xPad : 0.18);
    const height = textHeight + (yPad !== null ? yPad : 0.14);
    const diameter = Math.max(width, height);
    return {
      width: diameter,
      height: diameter
    };
  }

  if (shape === "forbidden sign") {
    const width = baseTextWidth + (xPad !== null ? xPad : 0.28);
    const height = textHeight + (yPad !== null ? yPad : 0.28);
    const diameter = Math.max(width, height) * 0.82;
    return {
      width: diameter,
      height: diameter
    };
  }

  if (["regular polygon", "star", "cloud"].includes(shape)) {
    const width = baseTextWidth + (xPad !== null ? xPad : 0.28);
    const height = textHeight + (yPad !== null ? yPad : 0.28);
    const diameter = Math.max(width, height);
    return {
      width: diameter,
      height: diameter
    };
  }

  if (shape === "starburst") {
    const width = baseTextWidth * 1.95 + (xPad !== null ? xPad : 0.36);
    return {
      width,
      height: Math.max(textHeight + (yPad !== null ? yPad : 0.5), width * 0.48)
    };
  }

  return {
    width: baseTextWidth + (xPad !== null ? xPad : 0.18),
    height: textHeight + (yPad !== null ? yPad : 0.28)
  };
}

function getTextBlocks(command) {
  return command.text.split("\uE003").map(function (part) {
    return part.split("\n");
  });
}

function measureTextBlock(lines, fontSize) {
  return {
    width: Math.max(...lines.map(function (line) {
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

  let path = 'M ' + points[0].x + ' ' + points[0].y + ' ';
  for (let index = 1; index < points.length; index += 1) {
    path += 'L ' + points[index].x + ' ' + points[index].y + ' ';
  }
  return path + 'Z';
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
  const rowHeights = command.rows.map(function (row) {
    return Math.max(...row.map(function (cell) {
      return getNodeBoxMetrics(cell).height;
    }));
  });
  const columnCount = Math.max(...command.rows.map(function (row) { return row.length; }), 0);
  const columnWidths = Array.from({ length: columnCount }, function (_, columnIndex) {
    return Math.max(...command.rows.map(function (row) {
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

function buildNodeRegistry(ast) {
  const registry = new Map();

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
      x: center.x + (dx / length) * halfWidth,
      y: center.y + (dy / length) * halfHeight
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
  const anchor = command.anchor || [];
  const innerSep = parseLength(command.options?.["inner sep"] || "0") || 0;
  const labelDistance = parseLength(command.options?.["label distance"] || "0") || 0;
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
    parentCommand &&
    parentCommand.options &&
    parentCommand.options.shiftPoint &&
    isNodeReference(parentCommand.options.shiftPoint) &&
    stylelessNode(command) &&
    /^\(.*\)$/.test(command.text)
  );
}

function stylelessNode(command) {
  const style = resolveStyles(command);
  return style.stroke === "none" && style.fill === "none";
}

function getAnchorAnnotationLabelPoint(command) {
  const anchor = command.anchor || [];
  const nodeFont = getNodeFont(command);
  const textMetrics = measureText(command.text, nodeFont.fontSize / UNIT_SCALE);
  const innerSep = parseLength(command.options?.["inner sep"] || "0") || 0;
  const labelDistance = parseLength(command.options?.["label distance"] || "0") || 0;
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
      const dxAttribute = pendingDx ? ' dx="' + pendingDx + '"' : '';
      parts += '<tspan' + dxAttribute + '>' + escapeXml(before) + '</tspan>';
      pendingDx = 0;
    }

    pendingDx += (parseLength(match[1]) || 0) * UNIT_SCALE;
    lastIndex = match.index + match[0].length;
  }

  const trailing = text.slice(lastIndex);
  if (trailing) {
    const dxAttribute = pendingDx ? ' dx="' + pendingDx + '"' : '';
    parts += '<tspan' + dxAttribute + '>' + escapeXml(trailing) + '</tspan>';
    pendingDx = 0;
  }

  if (!parts && pendingDx) {
    return '<tspan dx="' + pendingDx + '"></tspan>';
  }

  return parts || '<tspan></tspan>';
}

function renderTextLines(lines, x, centerY, style, nodeFont, textAnchor) {
  const lineHeight = nodeFont.fontSize * 1.1;
  const startY = centerY - (Math.max(lines.length, 1) - 1) * lineHeight / 2;
  const alignCenter = style.textAlign === "center";
  const maxWidth = Math.max(...lines.map(function (line) {
    return measureText(line, nodeFont.fontSize / UNIT_SCALE).width * UNIT_SCALE;
  }), 0);
  const tspans = lines.map(function (line, index) {
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

    return '<tspan x="' + lineX + '" dy="' + (index === 0 ? 0 : lineHeight) + '" text-anchor="' + lineAnchor + '">' + renderTextContent(line) + '</tspan>';
  }).join('');

  return '<text x="' + x + '" y="' + startY + '" text-anchor="' + textAnchor + '" dominant-baseline="middle" fill="' + escapeXml(style.textFill || "currentColor") + '" opacity="' + style.opacity + '" font-family="' + escapeXml(nodeFont.fontFamily) + '" font-size="' + nodeFont.fontSize + '">' + tspans + '</text>';
}

function renderNodeText(command, x, y, style, nodeFont, textAnchor) {
  const fontSize = nodeFont.fontSize / UNIT_SCALE;
  const textWidthOption = parseNodeLength(command.options?.["text width"], fontSize);
  const blocks = getTextBlocks(command).map(function (lines) {
    return wrapLinesToWidth(lines, textWidthOption, fontSize);
  });

  if (blocks.length === 1) {
    return renderTextLines(blocks[0], x, y, style, nodeFont, textAnchor);
  }

  const offset = nodeFont.fontSize * 0.65;
  return renderTextLines(blocks[0], x, y - offset, style, nodeFont, textAnchor) + renderTextLines(blocks[1], x, y + offset, style, nodeFont, textAnchor);
}

function getNodeTextBlockHeight(command) {
  const nodeFont = getNodeFont(command);
  const fontSize = nodeFont.fontSize / UNIT_SCALE;
  const textWidthOption = parseNodeLength(command.options?.["text width"], fontSize);
  const blocks = getTextBlocks(command).map(function (lines) {
    return wrapLinesToWidth(lines, textWidthOption, fontSize);
  });

  return blocks.reduce(function (sum, lines) {
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
    return '<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + (rect.width / 2) + '" ry="' + (rect.height / 2) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "diamond" || shape === "kite") {
    const points = shape === "kite"
      ? [
          { x: cx, y: rect.y },
          { x: rect.x + rect.width, y: rect.y + rect.height * 0.25 },
          { x: cx, y: rect.y + rect.height },
          { x: rect.x, y: rect.y + rect.height * 0.25 }
        ]
      : [
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
    const sides = Math.max(3, Number.parseInt(command.options["regular polygon sides"] || '5', 10));
    const radius = Math.min(rect.width, rect.height) / 2;
    const startAngle = sides % 2 === 0 ? (-90 + 180 / sides) : -90;
    return '<path d="' + pointsToPath(getRegularPolygonPoints(cx, cy, radius, sides, startAngle)) + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "semicircle") {
    const radius = rect.width / 2;
    return '<path d="M ' + rect.x + ' ' + (rect.y + rect.height) + ' A ' + radius + ' ' + radius + ' 0 0 1 ' + (rect.x + rect.width) + ' ' + (rect.y + rect.height) + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
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
    return '<path d="M ' + centerX + ' ' + centerY + ' L ' + topX + ' ' + topY + ' A ' + radius + ' ' + radius + ' 0 0 1 ' + bottomX + ' ' + bottomY + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "rectangle split") {
    return '<rect x="' + rect.x + '" y="' + rect.y + '" width="' + rect.width + '" height="' + rect.height + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />' +
      '<line x1="' + rect.x + '" y1="' + cy + '" x2="' + (rect.x + rect.width) + '" y2="' + cy + '" stroke="' + escapeXml(style.stroke) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "circle split") {
    const radius = Math.max(rect.width, rect.height) / 2;
    const inset = radius - strokeWidth / 2;
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />' +
      '<line x1="' + (cx - inset) + '" y1="' + cy + '" x2="' + (cx + inset) + '" y2="' + cy + '" stroke="' + escapeXml(style.stroke) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "forbidden sign") {
    const radius = Math.max(rect.width, rect.height) / 2;
    const offset = (radius - strokeWidth / 2) / Math.sqrt(2);
    return '<circle cx="' + cx + '" cy="' + cy + '" r="' + radius + '" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />' +
      '<line x1="' + (cx - offset) + '" y1="' + (cy + offset) + '" x2="' + (cx + offset) + '" y2="' + (cy - offset) + '" stroke="' + escapeXml(style.stroke) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
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
    return '<path d="M ' + (rect.x + rect.width * 0.2) + ' ' + (rect.y + rect.height * 0.8) + ' C ' + (rect.x - rect.width * 0.05) + ' ' + (rect.y + rect.height * 0.8) + ' ' + (rect.x - rect.width * 0.05) + ' ' + (rect.y + rect.height * 0.3) + ' ' + (rect.x + rect.width * 0.22) + ' ' + (rect.y + rect.height * 0.35) + ' C ' + (rect.x + rect.width * 0.25) + ' ' + (rect.y + rect.height * 0.05) + ' ' + (rect.x + rect.width * 0.55) + ' ' + (rect.y + rect.height * 0.02) + ' ' + (rect.x + rect.width * 0.62) + ' ' + (rect.y + rect.height * 0.26) + ' C ' + (rect.x + rect.width * 0.92) + ' ' + (rect.y + rect.height * 0.22) + ' ' + (rect.x + rect.width * 1.02) + ' ' + (rect.y + rect.height * 0.6) + ' ' + (rect.x + rect.width * 0.78) + ' ' + (rect.y + rect.height * 0.75) + ' C ' + (rect.x + rect.width * 0.7) + ' ' + (rect.y + rect.height * 0.95) + ' ' + (rect.x + rect.width * 0.35) + ' ' + (rect.y + rect.height * 0.98) + ' ' + (rect.x + rect.width * 0.2) + ' ' + (rect.y + rect.height * 0.8) + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "cylinder") {
    const ry = rect.height / 2;
    const cap = rect.height * 0.42;
    const left = rect.x;
    const right = rect.x + rect.width;
    const bodyRight = right - cap;
    return '<path d="M ' + (left + ry) + ' ' + rect.y + ' H ' + bodyRight + ' A ' + cap + ' ' + ry + ' 0 0 1 ' + bodyRight + ' ' + (rect.y + rect.height) + ' H ' + (left + ry) + ' A ' + ry + ' ' + ry + ' 0 0 1 ' + (left + ry) + ' ' + rect.y + ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />' +
      '<ellipse cx="' + bodyRight + '" cy="' + cy + '" rx="' + cap + '" ry="' + ry + '" stroke="' + escapeXml(style.stroke) + '" fill="none" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
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

    return '<path d="M ' + leftX + ' ' + midY +
      ' L ' + leftX + ' ' + (bottomY - side) +
      ' C ' + (leftX + waveX) + ' ' + (bottomY - side + waveY) + ' ' + (midX - waveX) + ' ' + (bottomY - side + waveY) + ' ' + midX + ' ' + (bottomY - side) +
      ' C ' + (midX + waveX) + ' ' + (bottomY - side - waveY) + ' ' + (rightX - waveX) + ' ' + (bottomY - side - waveY) + ' ' + rightX + ' ' + (bottomY - side) +
      ' L ' + rightX + ' ' + (topY + side) +
      ' C ' + (rightX - waveX) + ' ' + (topY + side - waveY) + ' ' + (midX + waveX) + ' ' + (topY + side - waveY) + ' ' + midX + ' ' + (topY + side) +
      ' C ' + (midX - waveX) + ' ' + (topY + side + waveY) + ' ' + (leftX + waveX) + ' ' + (topY + side + waveY) + ' ' + leftX + ' ' + (topY + side) +
      ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
  }

  if (shape === "magnetic tape") {
    const radius = Math.min(rect.width, rect.height) / 2;
    const cx = rect.x + radius;
    const cy = rect.y + radius;
    const sx = radius / 31.32513;
    const sy = radius / 31.32513;
    function px(x) { return cx + x * sx; }
    function py(y) { return cy - y * sy; }

    return '<path d="M ' + px(16.50046) + ' ' + py(-26.6251) +
      ' C ' + px(25.7154) + ' ' + py(-20.9143) + ' ' + px(31.32513) + ' ' + py(-10.8416) + ' ' + px(31.32513) + ' ' + py(0) +
      ' C ' + px(31.32513) + ' ' + py(17.3006) + ' ' + px(17.3006) + ' ' + py(31.32513) + ' ' + px(0) + ' ' + py(31.32513) +
      ' C ' + px(-17.3006) + ' ' + py(31.32513) + ' ' + px(-31.32513) + ' ' + py(17.3006) + ' ' + px(-31.32513) + ' ' + py(0) +
      ' C ' + px(-31.32513) + ' ' + py(-17.3006) + ' ' + px(-17.3006) + ' ' + py(-31.32513) + ' ' + px(0) + ' ' + py(-31.32513) +
      ' L ' + px(31.32513) + ' ' + py(-31.32513) +
      ' L ' + px(31.32513) + ' ' + py(-26.62653) +
      ' L ' + px(16.50046) + ' ' + py(-26.6251) +
      ' Z" stroke="' + escapeXml(style.stroke) + '" fill="' + escapeXml(style.fill) + '" stroke-width="' + strokeWidth + '" opacity="' + style.opacity + '" />';
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
  const mixMatch = trimmed.match(/^([a-z]+)!([0-9]{1,3})$/i);

  if (mixMatch) {
    const base = mixMatch[1].toLowerCase();
    const percentage = Math.max(0, Math.min(100, Number.parseInt(mixMatch[2], 10)));
    const rgb = COLOR_MIX_RGB[base];

    if (rgb) {
      const factor = percentage / 100;
      return formatRgbColor(
        Math.round(255 - (255 - rgb[0]) * factor),
        Math.round(255 - (255 - rgb[1]) * factor),
        Math.round(255 - (255 - rgb[2]) * factor)
      );
    }

    return base;
  }

  return trimmed;
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
    const parsed = Number.parseFloat(options["line width"]);
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
        const nodePoint = textOnlyDirectional
          ? (isAnchorAnnotationLabel(operation, command) ? getAnchorAnnotationLabelPoint({ ...operation, point: currentPoint }) : getDirectionalLabelPoint({ ...operation, point: currentPoint }))
          : getNodePoint(operation);
        const nodeFont = getNodeFont(operation);
        const boxMetrics = getNodeBoxMetrics(operation);
        const textLayout = getTextLayout(operation);

        if (style.stroke !== "none" || style.fill !== "none") {
          const rect = getLogicalPlacementRect(nodePoint.x, nodePoint.y, boxMetrics.width, boxMetrics.height, operation.placementAnchor);
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

function resolveShapeFill(style, definitions) {
  if (!style.shadingBall) {
    return style.fill;
  }

  return style.fill;
}

function buildBallGradient(definitions, style, gradientBox) {
  const gradientId = "tikz-ball-gradient-" + definitions.length;

  const highlightColor = lightenColor(style.ballColor, 0.85);
  const brightColor = lightenColor(style.ballColor, 0.25);
  const midColor = darkenColor(style.ballColor, 0.3);
  const darkColor = darkenColor(style.ballColor, 0.5);
  const shadowColor = "black";

  definitions.push(
    '<radialGradient id="' + gradientId + '" gradientUnits="userSpaceOnUse" cx="' + (gradientBox.x + gradientBox.size * 0.5) + '" cy="' + (gradientBox.y + gradientBox.size * 0.5) + '" fx="' + (gradientBox.x + gradientBox.size * 0.4) + '" fy="' + (gradientBox.y + gradientBox.size * 0.4) + '" r="' + (gradientBox.size * 0.5) + '">' +
      '<stop offset="0%" stop-color="' + escapeXml(highlightColor) + '" />' +
      '<stop offset="18%" stop-color="' + escapeXml(brightColor) + '" />' +
      '<stop offset="36%" stop-color="' + escapeXml(midColor) + '" />' +
      '<stop offset="50%" stop-color="' + escapeXml(darkColor) + '" />' +
      '<stop offset="100%" stop-color="' + escapeXml(shadowColor) + '" />' +
    '</radialGradient>'
  );

  return gradientId;
}

function renderShapeElements(pathData, style, definitions, screenBounds) {
  if (!style.shadingBall) {
    return '<path d="' + pathData + '" ' + renderStyleAttributes(style) + ' />';
  }

  const gradientBox = getSquareGradientBox(screenBounds);
  const gradientId = buildBallGradient(definitions, style, gradientBox);
  const clipPathId = "tikz-ball-clip-" + definitions.length;

  definitions.push('<clipPath id="' + clipPathId + '"><path d="' + pathData + '" /></clipPath>');

  const fillPath = '<rect x="' + gradientBox.x + '" y="' + gradientBox.y + '" width="' + gradientBox.size + '" height="' + gradientBox.size + '" clip-path="url(#' + clipPathId + ')" fill="url(#' + gradientId + ')" opacity="' + style.opacity + '" />';
  const strokePath = '<path d="' + pathData + '" ' + renderStyleAttributes({
    ...style,
    fill: "none"
  }) + ' />';

  return fillPath + strokePath;
}

function renderShapeStyleAttributes(style, fillValue) {
  return renderStyleAttributes({
    ...style,
    fill: fillValue
  });
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
  if (command.type === "node") {
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
      elements.push('<path d="M ' + (point.x - halfSize) + ' ' + (point.y - halfSize) + ' L ' + (point.x + halfSize) + ' ' + (point.y + halfSize) + ' M ' + (point.x - halfSize) + ' ' + (point.y + halfSize) + ' L ' + (point.x + halfSize) + ' ' + (point.y - halfSize) + '" ' + renderStyleAttributes({ ...resolveStyles(command), fill: "none" }) + ' />');
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

      const rectPath = 'M ' + left + ' ' + top + ' L ' + (left + width) + ' ' + top + ' L ' + (left + width) + ' ' + (top + height) + ' L ' + left + ' ' + (top + height) + ' Z';
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
        segments.push('M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y);
      }

      for (let y = Math.ceil(minY); y <= Math.floor(maxY); y += 1) {
        const start = mapCoordinate(bounds, { x: minX, y }, padding);
        const end = mapCoordinate(bounds, { x: maxX, y }, padding);
        segments.push('M ' + start.x + ' ' + start.y + ' L ' + end.x + ' ' + end.y);
      }

      currentPoint = resolvedPoint;
      shapeElements.push(renderShapeElements(segments.join(' '), style, definitions));
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

  const pathElement = hasDrawablePathSegment && pathData.trim()
    ? '<path d="' + pathData.trim() + '" ' + renderStyleAttributes(style) + (markerAttributes ? ' ' + markerAttributes : '') + ' />'
    : '';
  const labelElements = labels.map(function (label) {
    const point = mapCoordinate(bounds, label.point, padding);
    return '<text x="' + point.x + '" y="' + point.y + '" text-anchor="middle" dominant-baseline="auto" fill="' + escapeXml(style.stroke === "none" ? "currentColor" : style.stroke) + '" opacity="' + style.opacity + '" font-family="' + escapeXml(DEFAULT_FONT_FAMILY) + '" font-size="' + DEFAULT_FONT_SIZE + '">' + renderTextContent(label.text) + '</text>';
  }).join("");

  return shapeElements.join("") + pathElement + labelElements + inlineNodes.join("");
}

function renderNodeCommand(command, bounds, padding, parentCommand = null) {
  const style = resolveStyles(command);
  const textLayout = getTextLayout(command);
  const nodeFont = getNodeFont(command);
  const boxMetrics = getNodeBoxMetrics(command);
  const textOnlyDirectional = style.stroke === "none" && style.fill === "none" && (command.anchor || []).length > 0 && !command.placementAnchor;
  const logicalPoint = textOnlyDirectional
    ? (isAnchorAnnotationLabel(command, parentCommand) ? getAnchorAnnotationLabelPoint(command) : getDirectionalLabelPoint(command))
    : getNodePoint(command);
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
  }

  const baseline = boxElement ? 'central' : textLayout.dominantBaseline;
  const alignmentBaseline = boxElement ? 'central' : textLayout.dominantBaseline;
  const textAnchor = getNodeTextAnchor(command, boxElement ? 'middle' : textLayout.textAnchor);

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
    if (match[0].includes('clip-path=')) {
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
    const lineTexts = [...textMarkup.matchAll(/<tspan[^>]*><tspan>([^<]*)<\/tspan><\/tspan>/g)].map(function (item) {
      return item[1];
    });
    const widest = Math.max(...lineTexts.map(function (line) {
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
  const expandedAst = expandMatrices(ast);
  const bounds = collectBounds(expandedAst);
  const padding = collectRenderPadding(expandedAst);
  const elements = [];
  const definitions = [];
  const includeArrowDefinitions = expandedAst.commands.some(commandUsesArrow);
  const nodeRegistry = buildNodeRegistry(expandedAst);

  if (includeArrowDefinitions) {
    definitions.push(renderArrowDefinitions().replace(/^<defs>|<\/defs>$/g, ""));
  }

  for (const command of expandedAst.commands) {
    if (command.type === "node") {
      elements.push(renderNodeCommand(command, bounds, padding));
      continue;
    }

    elements.push(renderPathCommand({ ...command, nodeRegistry }, bounds, ast.coordinateSystem, definitions, padding));
  }

  const content = elements.join("");
  const renderedBounds = collectRenderedElementBounds(content);
  const outerMargin = Math.max(6, Math.min(padding.x, padding.y) * 0.5);
  const viewMinX = Math.floor(renderedBounds.minX - outerMargin);
  const viewMinY = Math.floor(renderedBounds.minY - outerMargin);
  const viewWidth = Math.max(1, Math.ceil(renderedBounds.maxX - renderedBounds.minX + outerMargin * 2));
  const viewHeight = Math.max(1, Math.ceil(renderedBounds.maxY - renderedBounds.minY + outerMargin * 2));

  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + viewMinX + ' ' + viewMinY + ' ' + viewWidth + ' ' + viewHeight + '" width="' + viewWidth + '" height="' + viewHeight + '" role="img">' + (definitions.length ? '<defs>' + definitions.join("") + '</defs>' : '') + content + '</svg>';
}

export { render };
