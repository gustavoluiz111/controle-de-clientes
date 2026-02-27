export function initDarkVeil() {
    const canvas = document.createElement('canvas');
    canvas.id = 'darkVeilCanvas';
    Object.assign(canvas.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        zIndex: '-1',
        pointerEvents: 'none',
        background: '#050510' // Deep dark background fallback
    });
    document.body.prepend(canvas);

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) return; // Fallback if WebGL isn't supported

    const vsSource = `
    attribute vec4 aVertexPosition;
    void main() {
      gl_Position = aVertexPosition;
    }
  `;

    // Shader inspired by DarkVeil / noise flow
    const fsSource = `
    precision mediump float;
    uniform vec2 uResolution;
    uniform float uTime;
    
    // Configurable parameters similar to DarkVeil
    const float noiseIntensity = 0.1;
    const float speed = 0.8;
    const float scanlineIntensity = 0.15;
    const float scanlineFrequency = 2.1;
    const float warpAmount = 2.6;
    
    // Hash function for noise
    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    
    // Smooth noise
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    // Fractal Brownian Motion
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
      for (int i = 0; i < 5; i++) {
        v += a * noise(p);
        p = rot * p * 2.0;
        a *= 0.5;
      }
      return v;
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec2 p = uv * 2.0 - 1.0;
        p.x *= uResolution.x / uResolution.y;

        float time = uTime * speed * 0.5;

        // Domain warping
        vec2 q = vec2(0.0);
        q.x = fbm(p + vec2(0.0, time));
        q.y = fbm(p + vec2(1.0, time * 0.8));

        vec2 r = vec2(0.0);
        r.x = fbm(p + warpAmount * q + vec2(1.7, 9.2) + 0.15 * time);
        r.y = fbm(p + warpAmount * q + vec2(8.3, 2.8) + 0.12 * time);

        float f = fbm(p + r);

        // Dark mood colors (Midnight Blue / Purple hue shift)
        vec3 color1 = vec3(0.05, 0.05, 0.15); 
        vec3 color2 = vec3(0.1, 0.0, 0.2);
        vec3 color3 = vec3(0.0, 0.2, 0.4);

        vec3 color = mix(color1, color2, clamp(f * 2.0, 0.0, 1.0));
        color = mix(color, color3, clamp(length(q), 0.0, 1.0));
        color = mix(color, vec3(0.05, 0.02, 0.1), clamp(length(r.x), 0.0, 1.0));

        color = (f * f * f + 0.6 * f * f + 0.5 * f) * color;

        // Add scanlines
        float scanline = sin(uv.y * uResolution.y * scanlineFrequency) * scanlineIntensity;
        color -= scanline;
        
        // Add tiny noise
        color += (hash(uv + time) - 0.5) * noiseIntensity;

        // Vignette
        float vi = uv.x * uv.y * (1.0 - uv.x) * (1.0 - uv.y);
        color *= pow(vi * 15.0, 0.25);

        gl_FragColor = vec4(color, 1.0);
    }
  `;

    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.warn("WebGL Shader Error: ", gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return;

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.warn("WebGL Program Error: ", gl.getProgramInfoLog(program));
        return;
    }
    gl.useProgram(program);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "aVertexPosition");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeLocation = gl.getUniformLocation(program, "uTime");
    const resolutionLocation = gl.getUniformLocation(program, "uResolution");

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    let startTime = performance.now();
    function render(time) {
        gl.uniform1f(timeLocation, (time - startTime) * 0.001);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}
