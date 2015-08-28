# Font Builder

A very crude offline helper for drawing text in WebGL.

This reads a ttf file and build a texture and a json descriptor file which can then be used
to layout and draw text as shown in [the demo](https://kmichel.github.io/font-builder).

This is a very simple and limited PoC, only the basic ASCII chars from 32 to 126 are rendered
and packing could be improved.
 
I might improve it one day, but the only goal for now is to have something ready to
help me during game jams ;)

## Usage

```shellsession
$ font_builder <font-file.ttf> <font-size> <output.json> <output.png>
```

## License

This project is licensed under the terms of the MIT license.

The [stb libraries](https://github.com/nothings/stb) are in the public domain.
