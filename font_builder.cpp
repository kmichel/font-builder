#include "libs/stb_truetype.h"
#include "libs/stb_image_write.h"

#include <cerrno>
#include <cstdint>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <fcntl.h>
#include <sys/stat.h>
#include <unistd.h>

struct Rect {
    uint32_t width;
    uint32_t height;
};

static uint32_t max(uint32_t a, uint32_t b) {
    return a > b ? a : b;
}

static unsigned char* get_file_content(char const* filename) {
    int file_descriptor = open(filename, O_RDONLY);
    if (file_descriptor == -1) {
        if (errno == ENOENT)
            fprintf(stderr, "File not found: %s\n", filename);
        else
            fprintf(stderr, "Failed opening file: %s: %s\n", filename, strerror(errno));
        return nullptr;
    }
    struct stat file_stats;
    int file_stats_status = fstat(file_descriptor, &file_stats);
    if (file_stats_status == -1) {
        fprintf(stderr, "Failed loading file: %s: %s\n", filename, strerror(errno));
        return nullptr;
    }
    unsigned char* file_content = new unsigned char[file_stats.st_size];
    auto read_status = read(file_descriptor, file_content, static_cast<size_t>(file_stats.st_size));
    if (read_status != file_stats.st_size) {
        delete[] file_content;
        if (read_status == -1)
            fprintf(stderr, "Failed loading file: %s: %s\n", filename, strerror(errno));
        else
            fprintf(stderr, "Failed loading file: %s: Inconsistent file size\n", filename);
        close(file_descriptor);
        return nullptr;
    }
    close(file_descriptor);
    return file_content;
}

int main(int argc, char** argv) {
    if (argc != 5) {
        fprintf(stderr, "Usage: %s input_file font_size output_json output_image\n", argv[0]);
        return -1;
    }
    char* filename = argv[1];
    int font_size = atoi(argv[2]);
    unsigned char* file_content = get_file_content(filename);
    if (file_content == nullptr)
        return -1;

    auto font_offset = stbtt_GetFontOffsetForIndex(file_content, 0);
    if (font_offset == -1) {
        fprintf(stderr, "Failed parsing font file: %s: Invalid font offset\n", filename);
        return -1;
    }
    stbtt_fontinfo font_info{};
    int32_t font_status = stbtt_InitFont(&font_info, file_content, font_offset);
    if (font_status == 0) {
        fprintf(stderr, "Failed parsing font file: %s\n", filename);
        return -1;
    }

    FILE* output_json = fopen(argv[3], "wb");
    if (output_json == nullptr) {
        fprintf(stderr, "Failed opening output json file: %s: %s\n", argv[3], strerror(errno));
        return -1;
    }

    float scale = stbtt_ScaleForMappingEmToPixels(&font_info, font_size);

    Rect* glyph_rects = new Rect[127 - 32];
    uint32_t max_height = 0;
    for (uint32_t codepoint = 32; codepoint < 127; ++codepoint) {
        int32_t glyph_x_min;
        int32_t glyph_y_min;
        int32_t glyph_x_max;
        int32_t glyph_y_max;
        int32_t glyph_index = stbtt_FindGlyphIndex(&font_info, static_cast<int32_t>(codepoint));
        stbtt_GetGlyphBitmapBoxSubpixel(
                &font_info, glyph_index, scale, scale, 0, 0, &glyph_x_min, &glyph_y_min, &glyph_x_max, &glyph_y_max);
        Rect& glyph_rect = glyph_rects[codepoint - 32];
        glyph_rect.width = static_cast<uint32_t>(glyph_x_max - glyph_x_min);
        glyph_rect.height = static_cast<uint32_t>(glyph_y_max - glyph_y_min);
        max_height = max(max_height, glyph_rect.height);
    }

    uint32_t margin = 1;
    uint32_t texture_size = 32;
    {
        uint32_t x = margin;
        uint32_t y = margin;
        for (int32_t i = 0; i < 127 - 32; ++i) {
            Rect& glyph_rect = glyph_rects[i];
            if (glyph_rect.width != 0 && glyph_rect.height != 0) {
                if (x + glyph_rect.width + 2 * margin < texture_size) {
                    x += glyph_rect.width + margin;
                } else if (y + max_height + 2 * margin < texture_size) {
                    x = glyph_rect.width + 2 * margin;
                    y += max_height + margin;
                } else {
                    texture_size *= 2;
                    x = margin;
                    y = margin;
                    i = -1;
                }
            }
        }
    }

    int32_t ascent;
    int32_t descent;
    int32_t line_gap;
    stbtt_GetFontVMetrics(&font_info, &ascent, &descent, &line_gap);
    fprintf(output_json, "{\n    \"textureSize\": %i,\n    \"lineGap\": %i,\n", texture_size, static_cast<int32_t>((ascent - descent + line_gap) * scale));
    fprintf(output_json, "    \"glyphs\": {\n");

    unsigned char* pixels = new unsigned char[texture_size * texture_size];

    uint32_t x = margin;
    uint32_t y = margin;
    for (uint32_t codepoint = 32; codepoint < 127; ++codepoint) {
        Rect& glyph_rect = glyph_rects[codepoint - 32];
        if (x + glyph_rect.width + 2 * margin >= texture_size) {
            x = margin;
            y += max_height + margin;
        }
        int32_t glyph_index = stbtt_FindGlyphIndex(&font_info, static_cast<int32_t>(codepoint));
        stbtt_MakeGlyphBitmapSubpixel(
                &font_info, pixels + x + (y * texture_size), static_cast<int32_t>(glyph_rect.width), static_cast<int32_t>(glyph_rect.height),
                static_cast<int32_t>(texture_size), scale, scale, 0, 0, glyph_index);

        int32_t glyph_advance_width;
        int32_t glyph_left_side_bearing;
        stbtt_GetGlyphHMetrics(&font_info, glyph_index, &glyph_advance_width, &glyph_left_side_bearing);
        glyph_advance_width *= scale;
        glyph_left_side_bearing *= scale;

        int32_t glyph_x_min;
        int32_t glyph_y_min;
        int32_t glyph_x_max;
        int32_t glyph_y_max;
        stbtt_GetGlyphBitmapBoxSubpixel(
                &font_info, glyph_index, scale, scale, 0, 0, &glyph_x_min, &glyph_y_min, &glyph_x_max, &glyph_y_max);

        fprintf(
                output_json, "        \"%i\": {\"x\": %i, \"y\": %i, \"left\": %i, \"top\": %i, \"width\": %i, \"height\": %i, \"advance\": %i}%s\n", codepoint,
                x, y, glyph_x_min, -glyph_y_min, static_cast<uint32_t>(glyph_x_max - glyph_x_min), static_cast<uint32_t>(glyph_y_max - glyph_y_min),
                static_cast<uint32_t>(glyph_advance_width), codepoint == 126 ? "" : ",");

        if (glyph_rect.width != 0)
            x += glyph_rect.width + margin;
    }

    fprintf(output_json, "    }\n}\n");
    fclose(output_json);

    stbi_write_png(argv[4], static_cast<int32_t>(texture_size), static_cast<int32_t>(texture_size), 1, pixels, static_cast<int32_t>(texture_size));

    delete[] pixels;
    delete[] glyph_rects;

    return 0;
}
