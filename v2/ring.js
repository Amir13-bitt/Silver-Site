/* Hero: a raymarched sterling-silver ring with a freshwater pearl.
   Hammered band, studio reflections, a thin-film sheen on the pearl.
   Follows the pointer, eases away on scroll, pauses when off screen. */
(function () {
  const canvas = document.querySelector(".hero__canvas");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "high-performance" });
  if (!gl) { document.documentElement.classList.add("no-webgl"); return; }

  const vert = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const frag = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uShift;
uniform float uLift;
uniform float uZoom;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float smin(float a, float b, float k){ float h = clamp(.5 + .5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }

float mapScene(vec3 p, out float mat){
  p.xz *= rot(sin(uTime * .3) * .65 + uMouse.x * .6 + uScroll * 2.2);
  p.yz *= rot(.22 + sin(uTime * .23) * .15 - uMouse.y * .35 + uScroll * .8);
  float ham = sin(p.x * 17. + 1.3) * sin(p.y * 15.) * sin(p.z * 19. + uTime * .4) * .011;
  vec2 q = vec2(length(p.xy) - .95, p.z * 1.25);
  float band = length(q) - .19 + ham;
  float setting = length(p - vec3(0., 1.13, 0.)) - .1;
  float d = smin(band, setting, .14);
  float pearl = length(p - vec3(0., 1.36, 0.)) - .27;
  mat = pearl < d ? 1. : 0.;
  return min(d, pearl);
}

vec3 env(vec3 rd){
  float y = rd.y;
  vec3 c = mix(vec3(.015, .015, .02), vec3(.13, .14, .16), smoothstep(-.7, .9, y));
  c += vec3(1.) * smoothstep(.5, .78, y) * 1.5;
  float a = atan(rd.x, rd.z) + uTime * .12;
  float pole = smoothstep(.96, .62, abs(y));
  c += vec3(.96, .98, 1.) * pow(max(0., cos(a * 2.)), 36.) * 1.7 * smoothstep(-.4, .5, y) * pole;
  c += vec3(.82, .86, 1.) * pow(max(0., cos(a * 3. + 1.)), 70.) * .9 * pole;
  c += vec3(1., .9, .95) * pow(max(0., cos(a * 5. + 2.)), 120.) * .5 * pole;
  c += vec3(.06, .05, .07) * smoothstep(0., -.9, y);
  return c;
}

vec3 normalAt(vec3 p){
  float m; vec2 e = vec2(.0012, -.0012);
  return normalize(e.xyy * mapScene(p + e.xyy, m) + e.yyx * mapScene(p + e.yyx, m) +
                   e.yxy * mapScene(p + e.yxy, m) + e.xxx * mapScene(p + e.xxx, m));
}

vec3 sheen(float x){ return .5 + .5 * cos(6.2831 * (x + vec3(0., .33, .67))); }

void main(){
  vec2 uv = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  uv.x -= uShift;
  uv.y += uScroll * .35 - uLift;
  vec3 ro = vec3(0., 0., uZoom);
  vec3 rd = normalize(vec3(uv, -1.75));

  vec2 m = uMouse * .35;
  float glow = exp(-length(uv - m) * 2.2);
  vec3 col = vec3(.018, .018, .022) + vec3(.1, .1, .12) * glow;

  float t = 0., mat = 0., minD = 9.;
  bool hit = false;
  for (int i = 0; i < 110; i++){
    vec3 p = ro + rd * t;
    float d = mapScene(p, mat);
    minD = min(minD, d);
    if (d < .0012 * t){ hit = true; break; }
    t += d * .9;
    if (t > uZoom + 4.) break;
  }

  if (hit){
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 r = reflect(rd, n);
    float fres = pow(1. - max(dot(n, -rd), 0.), 3.);
    if (mat < .5){
      col = env(r) * vec3(.9, .92, .96);
      col += mix(vec3(1.), sheen(fres * 1.1 + n.y * .25), .45) * fres * .12;
    } else {
      float dif = clamp(dot(n, normalize(vec3(.4, .9, .5))) * .5 + .5, 0., 1.);
      vec3 base = vec3(.9, .88, .9) * (.35 + .65 * dif);
      col = mix(base, env(r), .28) + sheen(fres * 1.6 + dot(n, rd) * .6 + uTime * .05) * (fres * .45 + .08);
    }
  } else {
    col += vec3(.75, .8, .95) * exp(-minD * 9.) * .12;
  }

  col *= 1. - .35 * dot(uv * .8, uv * .8);
  col = pow(col, vec3(.95));
  gl_FragColor = vec4(col, 1.);
}`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  let prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vert));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (e) {
    console.warn(e);
    document.documentElement.classList.add("no-webgl");
    return;
  }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  ["uRes", "uTime", "uMouse", "uScroll", "uShift", "uLift", "uZoom"].forEach((k) => (u[k] = gl.getUniformLocation(prog, k)));

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { mx: 0, my: 0, tx: 0, ty: 0, scroll: 0, shift: 0, lift: 0, zoom: 6.2, visible: true };

  function resize() {
    const small = innerWidth < 760;
    const scale = Math.min(devicePixelRatio || 1, 1.5) * (small ? 0.7 : 0.8);
    canvas.width = Math.round(canvas.clientWidth * scale);
    canvas.height = Math.round(canvas.clientHeight * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    state.shift = small ? 0 : 0.4 * (document.documentElement.dir === "rtl" ? -1 : 1);
    const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    state.lift = small ? 0.17 : -0.02;
    state.zoom = aspect < 0.8 ? 5.6 / aspect : 6.2;
  }
  addEventListener("resize", resize);
  new MutationObserver(resize).observe(document.documentElement, { attributes: true, attributeFilter: ["dir"] });
  resize();

  addEventListener("pointermove", (e) => {
    state.tx = (e.clientX / innerWidth) * 2 - 1;
    state.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  new IntersectionObserver(([en]) => { state.visible = en.isIntersecting; if (state.visible) loop(); })
    .observe(canvas);

  const t0 = performance.now();
  let raf = 0;
  function frame(now) {
    state.mx += (state.tx - state.mx) * 0.05;
    state.my += (state.ty - state.my) * 0.05;
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, reduced ? 2 : (now - t0) / 1000);
    gl.uniform2f(u.uMouse, state.mx, state.my);
    gl.uniform1f(u.uScroll, state.scroll);
    gl.uniform1f(u.uShift, state.shift);
    gl.uniform1f(u.uLift, state.lift);
    gl.uniform1f(u.uZoom, state.zoom);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop() {
    cancelAnimationFrame(raf);
    const tick = (now) => {
      frame(now);
      if (state.visible && !document.hidden && !reduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) loop(); });
  loop();

  window.Ring = {
    setScroll(p) { state.scroll = p; if (reduced) frame(performance.now()); },
  };
})();
