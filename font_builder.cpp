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

static uint32_t max(uint32_t a, uint32_t b) {
    return a > b ? a : b;
}

static uint32_t next_power_of_two(uint32_t value) {
    value--;
    value |= value >> 1;
    value |= value >> 2;
    value |= value >> 4;
    value |= value >> 8;
    value |= value >> 16;
    value++;
    return value;
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

    uint32_t margin = 1;

    int32_t font_xmin;
    int32_t font_ymin;
    int32_t font_xmax;
    int32_t font_ymax;
    stbtt_GetFontBoundingBox(&font_info, &font_xmin, &font_ymin, &font_xmax, &font_ymax);
    float scaled_width = scale * (font_xmax - font_xmin);
    float scaled_height = scale * (font_ymax - font_ymin);
    uint32_t tile_width = static_cast<uint32_t>(ceilf(scaled_width));
    uint32_t tile_height = static_cast<uint32_t>(ceilf(scaled_height));
    uint32_t outer_tile_width = tile_width + margin;
    uint32_t outer_tile_height = tile_height + margin;
    uint32_t texture_size = next_power_of_two(2 * margin + 10 * max(outer_tile_width, outer_tile_height));
    int32_t ascent;
    int32_t descent;
    int32_t line_gap;
    stbtt_GetFontVMetrics(&font_info, &ascent, &descent, &line_gap);
    fprintf(output_json, "{\n    \"textureSize\": %i, \"lineGap\": %i,\n", texture_size, static_cast<int32_t>((ascent - descent + line_gap) * scale));
    fprintf(output_json, "    \"glyphs\": {\n");

    unsigned char* pixels = new unsigned char[texture_size * texture_size];

    for (uint32_t codepoint = 32; codepoint < 127; ++codepoint) {
        uint32_t x = margin + ((codepoint - 32) % 10) * outer_tile_width;
        uint32_t y = margin + ((codepoint - 32) / 10) * outer_tile_height;

        int32_t glyph_index = stbtt_FindGlyphIndex(&font_info, static_cast<int32_t>(codepoint));
        stbtt_MakeGlyphBitmapSubpixel(
                &font_info, pixels + x + (y * texture_size), static_cast<int32_t>(tile_width), static_cast<int32_t>(tile_height),
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
    }

    fprintf(output_json, "    }\n}\n");
    fclose(output_json);

    stbi_write_png(argv[4], static_cast<int32_t>(texture_size), static_cast<int32_t>(texture_size), 1, pixels, static_cast<int32_t>(texture_size));

    delete[] pixels;

    return 0;
}
