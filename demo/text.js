"use strict";

var FbText = {
    NEWLINE: "\n".charCodeAt(0),
    SPACE: " ".charCodeAt(0),
    LEFT: "left",
    CENTER: "center",
    RIGHT: "right",
    layout: function (fontInfo, text, options, callback) {
        var alignment = options === undefined ? FbText.LEFT : options.alignment;
        if (alignment !== FbText.LEFT) {
            var advances = FbText.getLineAdvances(fontInfo, text);
            var maxAdvance = Math.max.apply(null, advances);
            var alignmentRatio = alignment === FbText.CENTER ? 0.5 : 1.0;
        }
        var lineNumber = 0;
        var x = alignment !== FbText.LEFT ? alignmentRatio * (maxAdvance - advances[lineNumber]) : 0;
        var y = 0;
        var inverseTextureSize = 1 / fontInfo.textureSize;
        for (var i = 0; i < text.length; ++i) {
            var codepoint = text.charCodeAt(i);
            if (codepoint === FbText.NEWLINE) {
                lineNumber += 1;
                x = alignment !== FbText.LEFT ? alignmentRatio * (maxAdvance - advances[lineNumber]) : 0;
                y -= fontInfo.lineGap;
            } else {
                if (!fontInfo.glyphs.hasOwnProperty(codepoint))
                    codepoint = FbText.SPACE;
                var glyph = fontInfo.glyphs[codepoint];
                var xMin = x + glyph.left;
                var xMax = xMin + glyph.width;
                var yMax = y + glyph.top;
                var yMin = yMax - glyph.height;
                var uMin = glyph.x * inverseTextureSize;
                var uMax = (glyph.x + glyph.width) * inverseTextureSize;
                var vMin = (glyph.y + glyph.height) * inverseTextureSize;
                var vMax = glyph.y * inverseTextureSize;
                callback(xMin, xMax, yMin, yMax, uMin, uMax, vMin, vMax);
                x += glyph.advance;
            }
        }
    },
    getLineAdvances: function (fontInfo, text) {
        var advances = [];
        var advance = 0;
        for (var i = 0; i < text.length; ++i) {
            var codepoint = text.charCodeAt(i);
            if (codepoint === FbText.NEWLINE) {
                advances.push(advance);
                advance = 0;
            } else {
                if (!fontInfo.glyphs.hasOwnProperty(codepoint))
                    codepoint = FbText.SPACE;
                var glyph = fontInfo.glyphs[codepoint];
                advance += glyph.advance;
            }
        }
        advances.push(advance);
        return advances;
    },
    getExtent: function (fontInfo, text, options) {
        var extent = {
            xMin: Infinity,
            xMax: -Infinity,
            yMin: Infinity,
            yMax: -Infinity
        };
        FbText.layout(fontInfo, text, options, function (xMin, xMax, yMin, yMax) {
            extent.xMin = Math.min(extent.xMin, xMin);
            extent.xMax = Math.max(extent.xMax, xMax);
            extent.yMin = Math.min(extent.yMin, yMin);
            extent.yMax = Math.max(extent.yMax, yMax);
        });
        return extent;
    },
    getLayout: function (fontInfo, text, options) {
        var rects = [];
        FbText.layout(fontInfo, text, options, function (xMin, xMax, yMin, yMax, uMin, uMax, vMin, vMax) {
            rects.push({
                xMin: xMin,
                xMax: xMax,
                yMin: yMin,
                yMax: yMax,
                uMin: uMin,
                uMax: uMax,
                vMin: vMin,
                vMax: vMax
            });
        });
        return rects;
    },
    getTriangles: function (fontInfo, text, options) {
        var trianglesCount = text.replace("\n", "").length;
        var triangles = new Float32Array(4 * 3 * 2 * trianglesCount);
        var position = 0;
        FbText.layout(fontInfo, text, options, function (xMin, xMax, yMin, yMax, uMin, uMax, vMin, vMax) {
            triangles[position++] = xMin;
            triangles[position++] = yMax;
            triangles[position++] = uMin;
            triangles[position++] = vMax;

            triangles[position++] = xMin;
            triangles[position++] = yMin;
            triangles[position++] = uMin;
            triangles[position++] = vMin;

            triangles[position++] = xMax;
            triangles[position++] = yMax;
            triangles[position++] = uMax;
            triangles[position++] = vMax;

            triangles[position++] = xMax;
            triangles[position++] = yMax;
            triangles[position++] = uMax;
            triangles[position++] = vMax;

            triangles[position++] = xMin;
            triangles[position++] = yMin;
            triangles[position++] = uMin;
            triangles[position++] = vMin;

            triangles[position++] = xMax;
            triangles[position++] = yMin;
            triangles[position++] = uMax;
            triangles[position++] = vMin;
        });
        return triangles;
    }
};
