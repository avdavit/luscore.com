const quadVertex = `
  attribute vec2 a_position;
  void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
`;

const universeFragment = `
  precision highp float;
  uniform vec2 u_resolution;
  uniform vec2 u_center;
  uniform float u_radius;
  uniform float u_time;
  uniform vec2 u_cursor;
  uniform vec2 u_field;
  uniform vec3 u_pulse;
  uniform vec3 u_accent;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }
  mat2 rotate(float a) { float s = sin(a), c = cos(a); return mat2(c, -s, s, c); }
  float fbm(vec2 p) {
    float n = 0.0, amplitude = .5;
    for (int i = 0; i < 4; i++) { n += amplitude * noise(p); p = rotate(.48) * p * 2.07 + 17.3; amplitude *= .5; }
    return n;
  }
  float stars(vec2 uv, float cellSize, float threshold) {
    vec2 grid = uv / cellSize;
    vec2 cell = floor(grid), f = fract(grid) - .5;
    float seed = hash(cell);
    vec2 point = vec2(hash(cell + 8.3), hash(cell + 21.1)) * .7 - .35;
    float d = length(f - point);
    float star = exp(-d * d * 160.0) * step(threshold, seed);
    return star * (.4 + .6 * hash(cell + 5.7));
  }

  void main() {
    vec2 pixel = gl_FragCoord.xy;
    vec2 screen = pixel / u_resolution;
    vec2 p = (pixel - u_center) / u_radius;
    float t = u_time * .10; // Continuous rotation around the anchored core; no camera movement.
    vec3 color = vec3(.018, .023, .043);

    // Distant stars and slow, very low-contrast interstellar clouds.
    float sky = fbm(screen * vec2(5.0, 3.0) + vec2(t * .03, 2.0));
    color += vec3(.037, .027, .067) * sky * sky;
    vec2 starPixel = pixel;
    float st = stars(starPixel, 22.0, .978) + stars(starPixel + 100.0, 53.0, .975) * 1.3;
    color += vec3(.48, .53, .7) * st * .65;

    vec2 cursor = (u_cursor * u_resolution - u_center) / u_radius;
    vec2 towardCursor = cursor - p;
    float cursorField = exp(-dot(towardCursor, towardCursor) * 5.0) * u_field.x;
    vec2 q = rotate(-.22) * p;
    q.y *= 1.64;
    float r = length(q), a = atan(q.y, q.x);
    float spin = a + log(r + .12) * 2.8 - t;
    vec2 flow = vec2(cos(spin), sin(spin)) * (r * 3.7 + .2);
    float turbulent = fbm(flow + vec2(t * .16, -t * .08));
    float detail = noise(flow * 13.0 + turbulent * 5.0);

    // Layered spiral filaments form an organic, luminous accretion cloud.
    float arms = pow(.5 + .5 * sin(spin * 3.0 + turbulent * 3.5), 4.0);
    float innerArms = pow(.5 + .5 * sin(spin * 5.0 + turbulent * 5.0), 9.0);
    float halo = exp(-r * r * 2.8);
    float edge = 1.0 - smoothstep(.65, 1.65, r);
    float hollow = smoothstep(.085, .22, r);
    float density = (arms * .75 + innerArms * .36 + turbulent * .20) * halo * hollow * edge;
    density *= .45 + detail * .8 + turbulent * .8;
    vec3 blue = vec3(.30, .46, .90);
    vec3 violet = vec3(.63, .31, .68);
    vec3 dustColor = mix(blue, violet, .5 + .5 * sin(a + r * 2.0 + .5));
    dustColor = mix(dustColor, u_accent, .14);
    color += dustColor * density * 1.13;
    color += vec3(.22, .18, .39) * halo * .10;
    color += mix(vec3(.22, .40, .85), u_accent, .5) * cursorField * .025;

    float fineRing = pow(.5 + .5 * sin(r * 155.0 + a * 3.0 + turbulent * 14.0 - t * 2.0), 19.0);
    color += mix(vec3(.80, .55, .61), vec3(.41, .57, .83), smoothstep(.12,.7,r)) * fineRing * halo * hollow * (.12 + arms * .29);

    // A warm, radiant center; light is the material at the heart of the scene.
    float coreR = length(p);
    float coreGlow = .008 / (coreR * coreR + .014);
    float breathing = 1.0 + exp(-dot(cursor, cursor) * 12.0) * u_field.x * .45;
    color += vec3(1.0, .57, .32) * coreGlow * .75 * breathing;
    color += vec3(.59, .36, .65) * exp(-coreR * 4.0) * .18;
    float ring = exp(-pow((r - .148) * 38.0, 2.0));
    color += vec3(1.0, .73, .55) * ring * (.2 + turbulent * .7);
    float coreEdge = .058 + noise(p * 48.0 + t * .3) * .01;
    float sphere = 1.0 - smoothstep(coreEdge - .025, coreEdge + .013, coreR);
    color += vec3(1.7, 1.42, 1.13) * sphere;
    float corona = exp(-pow((coreR - .072) * 65.0, 2.0));
    color += vec3(1.0, .76, .58) * corona * .25;
    float ray = exp(-abs(p.y + p.x * .21) * 170.0) * exp(-abs(p.x) * 3.7);
    color += vec3(.8, .58, .43) * ray * .34;
    // Clicking empty space sends a soft wave of light through the galaxy.
    float pulseAge = u_time - u_pulse.z;
    vec2 pulseOrigin = (u_pulse.xy * u_resolution - u_center) / u_radius;
    float pulseDistance = length(p - pulseOrigin);
    float pulseWave = exp(-pow((pulseDistance - pulseAge * 1.15) * 22.0, 2.0));
    float pulseFade = (1.0 - smoothstep(.15, 1.5, pulseAge)) * step(0.0, pulseAge);
    color += mix(u_accent, vec3(.75, .9, 1.0), .45) * pulseWave * pulseFade * .24;
    // Gentle film grain avoids flat digital gradients.
    color += (hash(pixel) - .5) * .009;
    color = 1.0 - exp(-color * 1.38);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const particleVertex = `
  precision highp float;
  attribute vec4 a_particle;
  attribute vec3 a_color;
  uniform vec2 u_resolution;
  uniform vec2 u_center;
  uniform float u_radius;
  uniform float u_time;
  uniform float u_dpr;
  uniform vec2 u_cursor;
  uniform vec2 u_field;
  uniform vec3 u_pulse;
  varying vec3 v_color;
  varying float v_alpha;
  void main() {
    float r = a_particle.x;
    float a = a_particle.y + u_time * .036 / (r * .35 + .6);
    vec2 p = vec2(cos(a) * r, sin(a) * r / 1.64);
    float c = cos(.22), s = sin(.22);
    p = mat2(c,-s,s,c) * p;
    p.y += a_particle.z * .07;
    vec2 cursor = (u_cursor * u_resolution - u_center) / u_radius;
    vec2 delta = cursor - p;
    float influence = exp(-dot(delta, delta) * 5.0) * u_field.x;
    vec2 pulseOrigin = (u_pulse.xy * u_resolution - u_center) / u_radius;
    vec2 pulseDelta = p - pulseOrigin;
    float pulseAge = u_time - u_pulse.z;
    float wave = exp(-pow((length(pulseDelta) - pulseAge * 1.15) * 14.0, 2.0));
    float pulseFade = (1.0 - smoothstep(.15, 1.5, pulseAge)) * step(0.0, pulseAge);
    vec2 pos = (p * u_radius + u_center) / u_resolution * 2.0 - 1.0;
    gl_Position = vec4(pos, 0.0, 1.0);
    gl_PointSize = clamp(a_particle.w * u_dpr * (1.0 + influence * .6 + wave * pulseFade * .7), .7, 6.0);
    v_color = mix(a_color, vec3(.75, .88, 1.0), influence * .35);
    v_alpha = (.17 + a_particle.w * .10) * (1.0 - smoothstep(.8, 1.7, r)) * (1.0 + influence * .8);
  }
`;

const particleFragment = `
  precision mediump float;
  varying vec3 v_color;
  varying float v_alpha;
  void main() {
    float d = length(gl_PointCoord - .5) * 2.0;
    if (d > 1.0) discard;
    float glow = exp(-d * d * 3.5);
    gl_FragColor = vec4(v_color, glow * v_alpha);
  }
`;

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(result);
    gl.deleteShader(result);
    throw new Error(message);
  }
  return result;
}

function program(gl, vertex, fragment) {
  const result = gl.createProgram();
  const vs = shader(gl, gl.VERTEX_SHADER, vertex);
  const fs = shader(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(result, vs);
  gl.attachShader(result, fs);
  gl.linkProgram(result);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(result));
  return result;
}

function locations(gl, target) {
  return Object.fromEntries(['resolution', 'center', 'radius', 'time', 'accent', 'dpr', 'cursor', 'field', 'pulse'].map(name => [name, gl.getUniformLocation(target, `u_${name}`)]));
}

export class Galaxy {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power', depth: false, stencil: false });
    this.ready = false;
    this.accent = [.66, .42, 1];
    this.targetAccent = [...this.accent];
    this.cursor = [.5, .5];
    this.targetCursor = [.5, .5];
    this.activity = 0;
    this.targetActivity = 0;
    this.pulse = [.5, .5, -10];
    if (!this.gl) return;
    try { this.initialize(); } catch (error) { console.warn('Using the static galaxy fallback.', error.message); }
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.ready = false;
      document.body.classList.remove('webgl-ready');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try { this.initialize(); } catch { this.ready = false; }
    });
  }

  initialize() {
    const gl = this.gl;
    this.background = program(gl, quadVertex, universeFragment);
    this.particles = program(gl, particleVertex, particleFragment);
    this.backgroundUniforms = locations(gl, this.background);
    this.particleUniforms = locations(gl, this.particles);
    this.quadPosition = gl.getAttribLocation(this.background, 'a_position');
    this.particlePosition = gl.getAttribLocation(this.particles, 'a_particle');
    this.particleColor = gl.getAttribLocation(this.particles, 'a_color');
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    this.particleCount = window.innerWidth < 761 ? 8500 : 19000;
    const positions = new Float32Array(this.particleCount * 4);
    const colors = new Float32Array(this.particleCount * 3);
    let seed = 64829;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    for (let i = 0; i < this.particleCount; i++) {
      const r = .12 + Math.pow(random(), 1.45) * 1.48;
      const arm = Math.floor(random() * 3) / 3 * Math.PI * 2;
      const spread = (random() + random() + random() - 1.5) * (.13 + r * .4);
      const angle = arm - Math.log(r + .12) * 2.8 + spread;
      positions.set([r, angle, (random() - .5) * r, .55 + Math.pow(random(), 4) * 2.7], i * 4);
      const warm = Math.max(0, 1 - r * 2.1);
      const purple = .5 + .5 * Math.sin(angle + r * 2);
      colors.set([.40 + purple * .25 + warm * .35, .51 - purple * .12 + warm * .22, .83 - warm * .31], i * 3);
    }
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    this.ready = true;
    this.resize();
    document.body.classList.add('webgl-ready');
  }

  resize() {
    if (!this.ready) return;
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    // Cap fill-rate; the artwork stays crisp through high-resolution point sprites.
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.25, 1600 / this.width);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(time, geometry, { immediate = false, dt = 1 / 60 } = {}) {
    if (!this.ready) return;
    const gl = this.gl;
    const lerp = immediate ? 1 : 1 - Math.exp(-dt * 14);
    for (let i = 0; i < 3; i++) this.accent[i] += (this.targetAccent[i] - this.accent[i]) * lerp;
    for (let i = 0; i < 2; i++) {
      this.cursor[i] += (this.targetCursor[i] - this.cursor[i]) * (immediate ? 1 : 1 - Math.exp(-dt * 24));
    }
    this.activity += (this.targetActivity - this.activity) * lerp;
    const uniforms = (u) => {
      gl.uniform2f(u.resolution, this.canvas.width, this.canvas.height);
      gl.uniform2f(u.center, geometry.x * this.dpr, (this.height - geometry.y) * this.dpr);
      gl.uniform1f(u.radius, geometry.radius * this.dpr);
      gl.uniform1f(u.time, time);
      gl.uniform2fv(u.cursor, this.cursor);
      gl.uniform2f(u.field, this.activity, 0);
      gl.uniform3fv(u.pulse, this.pulse);
      if (u.accent) gl.uniform3fv(u.accent, this.accent);
      if (u.dpr) gl.uniform1f(u.dpr, this.dpr);
    };
    gl.disable(gl.BLEND);
    gl.useProgram(this.background);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    const quadPosition = this.quadPosition;
    gl.enableVertexAttribArray(quadPosition);
    gl.vertexAttribPointer(quadPosition, 2, gl.FLOAT, false, 0, 0);
    uniforms(this.backgroundUniforms);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.disableVertexAttribArray(quadPosition);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.useProgram(this.particles);
    uniforms(this.particleUniforms);
    const particlePosition = this.particlePosition;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(particlePosition);
    gl.vertexAttribPointer(particlePosition, 4, gl.FLOAT, false, 0, 0);
    const particleColor = this.particleColor;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.enableVertexAttribArray(particleColor);
    gl.vertexAttribPointer(particleColor, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    gl.disableVertexAttribArray(particlePosition);
    gl.disableVertexAttribArray(particleColor);
    gl.disable(gl.BLEND);
  }
}
