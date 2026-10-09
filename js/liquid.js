/* Liquid-silver hero background: a domain-warped noise height field rendered
   as polished chrome, with a ripple that follows the pointer. */
(function () {
  const canvas = document.querySelector(".hero__canvas");
  if (!canvas) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) { canvas.classList.add("is-fallback"); return; }

  const vert = `
    attribute vec2 p;
    void main() { gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const frag = `
    precision highp float;
    uniform vec2 uRes;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform float uPress;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
      return v;
    }
    float field(vec2 p) {
      float t = uTime * 0.06;
      vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
      vec2 r = vec2(fbm(p + 1.8 * q + vec2(1.7, 9.2) + t * 1.5), fbm(p + 1.8 * q + vec2(8.3, 2.8)));
      float h = fbm(p + 1.6 * r);
      vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
      float d = length(p / 0.75 - m);
      h += (0.05 + 0.06 * uPress) * exp(-d * d * 7.0) * sin(d * 34.0 - uTime * 3.2);
      return h;
    }

    void main() {
      vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
      vec2 p = uv * 0.75;
      float e = 0.004;
      float h = field(p);
      vec3 n = normalize(vec3(field(p + vec2(e, 0.0)) - field(p - vec2(e, 0.0)),
                              field(p + vec2(0.0, e)) - field(p - vec2(0.0, e)),
                              0.03));
      vec3 R = reflect(vec3(0.0, 0.0, -1.0), n);

      // Studio environment: soft horizontal light bands give the chrome look.
      float bands = 0.5 + 0.5 * sin(R.y * 5.0 + R.x * 1.6 + h * 4.0);
      vec3 dark = vec3(0.05, 0.055, 0.065);
      vec3 mid = vec3(0.45, 0.47, 0.5);
      vec3 light = vec3(0.96, 0.97, 0.99);
      vec3 col = mix(dark, mid, smoothstep(0.15, 0.55, bands));
      col = mix(col, light, smoothstep(0.62, 0.92, bands));

      vec3 L = normalize(vec3(-0.4, 0.6, 0.7));
      float spec = pow(max(dot(R, L), 0.0), 60.0);
      col += spec * 0.9;
      // A faint cool tint in the shadows, warm in the highlights.
      col *= mix(vec3(0.86, 0.9, 1.0), vec3(1.0, 0.99, 0.97), smoothstep(0.3, 0.9, bands));

      float vig = smoothstep(1.25, 0.25, length(uv));
      col *= mix(0.35, 1.0, vig);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) { canvas.classList.add("is-fallback"); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.classList.add("is-fallback"); return; }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uRes = gl.getUniformLocation(prog, "uRes");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uMouse = gl.getUniformLocation(prog, "uMouse");
  const uPress = gl.getUniformLocation(prog, "uPress");

  // Render below native resolution: the surface is soft, and this keeps it smooth on laptops.
  const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
  let w = 0, h = 0;
  function resize() {
    w = Math.max(1, Math.floor(canvas.clientWidth * scale));
    h = Math.max(1, Math.floor(canvas.clientHeight * scale));
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
    gl.uniform2f(uRes, w, h);
  }
  resize();
  window.addEventListener("resize", resize);

  const mouse = { x: w * 0.65, y: h * 0.6, tx: w * 0.65, ty: h * 0.6 };
  let press = 0, pressTarget = 0;
  window.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) * scale;
    mouse.ty = (r.height - (e.clientY - r.top)) * scale;
  });
  window.addEventListener("pointerdown", () => { pressTarget = 1; });
  window.addEventListener("pointerup", () => { pressTarget = 0; });

  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);

  const start = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    if (!visible) return;
    mouse.x += (mouse.tx - mouse.x) * 0.06;
    mouse.y += (mouse.ty - mouse.y) * 0.06;
    press += (pressTarget - press) * 0.08;
    gl.uniform1f(uTime, reduced ? 12.0 : (now - start) / 1000);
    gl.uniform2f(uMouse, mouse.x, mouse.y);
    gl.uniform1f(uPress, press);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
