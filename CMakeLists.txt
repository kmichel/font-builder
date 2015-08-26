cmake_minimum_required(VERSION 3.2)
project(font_builder)

add_library(stb
    libs/stb.c)

set_target_properties(stb PROPERTIES language c)

add_executable(font_builder
    font_builder.cpp)

target_link_libraries(font_builder
    stb)

target_compile_options(font_builder PRIVATE
    -fno-rtti -fstrict-aliasing
    -std=c++11 -Werror -pedantic -fvisibility=hidden -fvisibility-inlines-hidden
    $<$<NOT:$<CONFIG:DEBUG>>:-flto>
    $<$<OR:$<CXX_COMPILER_ID:AppleClang>,$<CXX_COMPILER_ID:Clang>>:-stdlib=libc++ -Weverything -Wno-c++98-compat -Wno-c++98-compat-pedantic -Wno-padded -Wno-float-equal -Wno-selector>
    $<$<CXX_COMPILER_ID:GNU>:-Wall -Wextra -Wno-missing-field-initializers>)
