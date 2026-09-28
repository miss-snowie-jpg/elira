/**
 * Shader for loading animation
 * @param {WebGL2RenderingContext} ctx WebGL2 Rendering Context
 */
export default function loadingAnimationShader(ctx) {
  const vertexShaderSource = `#version 300 es

    in vec2 aPosition;

    void main() {
      gl_Position = vec4(aPosition, 0.0, 1.0);
    }
  `;

  const fragmentShaderSource = `#version 300 es

    precision highp float;

    uniform float iTime;
    uniform vec2 iResolution;

    out vec4 fragColor;

    const float DOTS = 8.0;
    const vec3 COLOR = vec3(0.788, 0.635, 0.153);

    void main()
    {
        vec2 p = (gl_FragCoord.xy * 2.0 - iResolution.xy)
               / min(iResolution.x, iResolution.y);

        float f = 0.0;

        for (float i = 1.0; i <= DOTS; i++)
        {
            float s = sin(0.7 * iTime + (i * 0.5) * iTime) * 0.2;
            float c = cos(0.2 * iTime + (i * 0.5) * iTime) * 0.2;

            f += 0.01 / abs(length(p * 0.5 + vec2(c, s)));
        }

        fragColor = vec4(COLOR * f, 1.0);
    }
  `;

  // -------------------------
  // Compile vertex shader
  // -------------------------

  const vertexShader = ctx.createShader(ctx.VERTEX_SHADER);

  ctx.shaderSource(vertexShader, vertexShaderSource);
  ctx.compileShader(vertexShader);

  // -------------------------
  // Compile fragment shader
  // -------------------------

  const fragmentShader = ctx.createShader(ctx.FRAGMENT_SHADER);

  ctx.shaderSource(fragmentShader, fragmentShaderSource);
  ctx.compileShader(fragmentShader);

  // -------------------------
  // Create program
  // -------------------------

  const program = ctx.createProgram();

  ctx.attachShader(program, vertexShader);
  ctx.attachShader(program, fragmentShader);

  ctx.linkProgram(program);

  // -------------------------
  // Fullscreen quad
  // -------------------------

  const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,

    -1,  1,
     1, -1,
     1,  1
  ]);

  const buffer = ctx.createBuffer();

  ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);
  ctx.bufferData(ctx.ARRAY_BUFFER, vertices, ctx.STATIC_DRAW);

  const positionLocation = ctx.getAttribLocation(
    program,
    "aPosition"
  );

  // -------------------------
  // Uniforms
  // -------------------------

  const timeLocation = ctx.getUniformLocation(
    program,
    "iTime"
  );

  const resolutionLocation = ctx.getUniformLocation(
    program,
    "iResolution"
  );

  // -------------------------
  // Renderer
  // -------------------------

  return {
    update(time) {
      ctx.useProgram(program);

      ctx.bindBuffer(ctx.ARRAY_BUFFER, buffer);

      ctx.enableVertexAttribArray(positionLocation);

      ctx.vertexAttribPointer(
        positionLocation,
        2,
        ctx.FLOAT,
        false,
        0,
        0
      );

      ctx.uniform1f(
        timeLocation,
        time * 0.001
      );

      ctx.uniform2f(
        resolutionLocation,
        ctx.canvas.width,
        ctx.canvas.height
      );

      ctx.drawArrays(
        ctx.TRIANGLES,
        0,
        6
      );
    },

    remove() {
      ctx.deleteBuffer(buffer);
      ctx.deleteShader(vertexShader);
      ctx.deleteShader(fragmentShader);
      ctx.deleteProgram(program);
    }
  };
}