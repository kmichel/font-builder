"use strict";

var FbText = {
    newline : "\n".charCodeAt(0),
    space: " ".charCodeAt(0),
    layout: function(fontInfo, text, callback) {
        var x=0;
        var y=0;
        var inverseTextureSize = 1 / fontInfo.textureSize;
        for (var i =0; i<text.length; ++i) {
            var codepoint = text.charCodeAt(i);
            if (codepoint === FbText.newline) {
                x = 0;
                y -= fontInfo.lineGap;
            } else {
                if (!fontInfo.glyphs.hasOwnProperty(codepoint))
                    codepoint = FbText.space;
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
    getExtent: function(fontInfo, text) {
        var extent = {
            xMin: Infinity,
            xMax: -Infinity,
            yMin: Infinity,
            yMax: -Infinity
        };
        FbText.layout(fontInfo, text, function(xMin, xMax, yMin, yMax) {
            extent.xMin = Math.min(extent.xMin, xMin);
            extent.xMax = Math.max(extent.xMax, xMax);
            extent.yMin = Math.min(extent.yMin, yMin);
            extent.yMax = Math.max(extent.yMax, yMax);
        });
        return extent;
    },
    getLayout: function(fontInfo, text) {
        var rects = [];
        FbText.layout(fontInfo, text, function(xMin, xMax, yMin, yMax, uMin, uMax, vMin, vMax) {
            rects.push({
                xMin: xMin,
                xMax: xMax,
                yMin: yMin,
                yMax: yMax,
                uMin: uMin,
                uMax: uMax,
                vMin: vMin,
                vMax: vMax});
        });
        return rects;
    },
    getTriangles: function(fontInfo, text) {
        var trianglesCount = text.replace("\n","").length;
        var triangles = new Float32Array(4 * 3 * 2 * trianglesCount);
        var position = 0;
        FbText.layout(fontInfo, text, function(xMin, xMax, yMin, yMax, uMin, uMax, vMin, vMax) {
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
