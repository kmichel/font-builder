var FontBuilder = {
    demo: function (canvas, input, alignment) {
        var gl = canvas.getContext("webgl", {alpha: false}) || canvas.getContext("experimental-webgl", {alpha: false});

        FontBuilder.loadString("vertex.glsl", function (vertexSource) {
            FontBuilder.loadString("fragment.glsl", function (fragmentSource) {
                FontBuilder.loadJson("Roboto-Medium.json", function (fontInfo) {
                    FontBuilder.loadTexture(gl, "Roboto-Medium.png", function (fontTexture) {
                        var vertexShader = gl.createShader(gl.VERTEX_SHADER);
                        gl.shaderSource(vertexShader, vertexSource);
                        gl.compileShader(vertexShader);
                        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS))
                            console.error(gl.getShaderInfoLog(vertexShader));

                        var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
                        gl.shaderSource(fragmentShader, fragmentSource);
                        gl.compileShader(fragmentShader);
                        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS))
                            console.error(gl.getShaderInfoLog(fragmentShader));

                        var program = gl.createProgram();
                        gl.attachShader(program, fragmentShader);
                        gl.attachShader(program, vertexShader);
                        gl.linkProgram(program);
                        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
                            console.error(gl.getProgramInfoLog(program));

                        var positionAttribute = gl.getAttribLocation(program, "position");
                        var uvAttribute = gl.getAttribLocation(program, "uv");
                        var viewMatrixUniform = gl.getUniformLocation(program, "viewMatrix");
                        var samplerUniform = gl.getUniformLocation(program, "sampler");

                        gl.useProgram(program);

                        var glBuffer = gl.createBuffer();

                        var time = 0;

                        function draw() {
                            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
                            gl.clearColor(0.22, 0.03, 0.34, 1);
                            gl.enable(gl.BLEND);
                            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
                            gl.clear(gl.COLOR_BUFFER_BIT);

                            time += 1 / 60;

                            var text = input.value;
                            var extent = FbText.getExtent(fontInfo, text, {alignment: alignment.value});

                            if (extent.xMin != Infinity) {

                                var scale = (0.8 + 0.5 * Math.sin(time));
                                gl.uniformMatrix3fv(viewMatrixUniform, false, new Float32Array([
                                    2 / canvas.clientWidth * scale, 0, 0,
                                    0, 2 / canvas.clientHeight * scale, 0,
                                    (50 * Math.cos(time) - extent.xMin - extent.xMax) / canvas.clientWidth * scale,
                                    (50 * Math.sin(3 * time) - extent.yMax - extent.yMin) / canvas.clientHeight * scale, 1
                                ]));

                                gl.uniform1i(samplerUniform, 0);
                                gl.activeTexture(gl.TEXTURE0);
                                gl.bindTexture(gl.TEXTURE_2D, fontTexture);

                                var triangles = FbText.getTriangles(fontInfo, text, {alignment: alignment.value});
                                gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
                                gl.bufferData(gl.ARRAY_BUFFER, triangles, gl.DYNAMIC_DRAW);

                                gl.enableVertexAttribArray(positionAttribute);
                                gl.enableVertexAttribArray(uvAttribute);
                                gl.vertexAttribPointer(positionAttribute, 2, gl.FLOAT, false, 4 * 4, 0);
                                gl.vertexAttribPointer(uvAttribute, 2, gl.FLOAT, false, 4 * 4, 4 * 2);

                                gl.drawArrays(gl.TRIANGLES, 0, triangles.length / 4);
                            }
                            requestAnimationFrame(draw, canvas);
                        }

                        requestAnimationFrame(draw, canvas);
                    });
                });
            });
        });
    },
    loadTexture: function (gl, url, onLoad) {
        var image = new Image();
        image.onload = function () {
            var texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.bindTexture(gl.TEXTURE_2D, null);
            onLoad(texture);
        };
        image.src = url;
    },
    loadString: function (url, onLoad) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = "text";
        request.onload = function () {
            if (request.readyState === 4 && request.status === 200)
                onLoad(request.response);
        };
        request.send();
    },
    loadJson: function (url, onLoad) {
        var request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = "json";
        request.onload = function () {
            if (request.readyState === 4 && request.status === 200)
                onLoad(request.response);
        };
        request.send();
    }
};
