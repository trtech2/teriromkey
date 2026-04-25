class TouchTexture {
  constructor() {
    this.size = 64;
    this.width = this.height = this.size;
    this.maxAge = 64;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;
    this.initTexture();
  }

  initTexture() {
    this.canvas = document.createElement("canvas");
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.texture = new THREE.Texture(this.canvas);
  }

  update() {
    this.clear();
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const point = this.trail[i];
      let f = point.force * this.speed * (1 - point.age / this.maxAge);
      point.x += point.vx * f;
      point.y += point.vy * f;
      point.age++;
      if (point.age > this.maxAge) {
        this.trail.splice(i, 1);
      } else {
        this.drawPoint(point);
      }
    }
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = "black";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addTouch(point) {
    let force = 0;
    let vx = 0;
    let vy = 0;
    const last = this.last;
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / d;
      vy = dy / d;
      force = Math.min(dd * 20000, 2.0);
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(point) {
    const pos = {
      x: point.x * this.width,
      y: (1 - point.y) * this.height
    };

    let intensity = 1;
    if (point.age < this.maxAge * 0.3) {
      intensity = Math.sin((point.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (point.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= point.force;

    const radius = this.radius;
    const color = `${((point.vx + 1) / 2) * 255}, ${((point.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const offset = this.size * 5;
    this.ctx.shadowOffsetX = offset;
    this.ctx.shadowOffsetY = offset;
    this.ctx.shadowBlur = radius;
    this.ctx.shadowColor = `rgba(${color},${0.2 * intensity})`;
    this.ctx.beginPath();
    this.ctx.fillStyle = "rgba(255,0,0,1)";
    this.ctx.arc(pos.x - offset, pos.y - offset, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

class GradientBackground {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.mesh = null;
    this.uniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      uColor1: { value: new THREE.Vector3(0.910, 0.388, 0.235) },
      uColor2: { value: new THREE.Vector3(0.122, 0.306, 0.373) },
      uColor3: { value: new THREE.Vector3(0.910, 0.388, 0.235) },
      uColor4: { value: new THREE.Vector3(0.122, 0.306, 0.373) },
      uColor5: { value: new THREE.Vector3(0.910, 0.388, 0.235) },
      uColor6: { value: new THREE.Vector3(0.122, 0.306, 0.373) },
      uSpeed: { value: 1.5 },
      uIntensity: { value: 1.8 },
      uTouchTexture: { value: null },
      uGrainIntensity: { value: 0.08 },
      uDarkNavy: { value: new THREE.Vector3(0.122, 0.306, 0.373) },
      uGradientSize: { value: 0.45 },
      uGradientCount: { value: 12.0 },
      uColor1Weight: { value: 0.5 },
      uColor2Weight: { value: 1.8 }
    };
  }

  init() {
    const viewSize = this.sceneManager.getViewSize();
    const geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          vUv = uv;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uColor4;
        uniform vec3 uColor5;
        uniform vec3 uColor6;
        uniform float uSpeed;
        uniform float uIntensity;
        uniform sampler2D uTouchTexture;
        uniform float uGrainIntensity;
        uniform vec3 uDarkNavy;
        uniform float uGradientSize;
        uniform float uGradientCount;
        uniform float uColor1Weight;
        uniform float uColor2Weight;

        varying vec2 vUv;
        #define PI 3.14159265359

        float grain(vec2 uv, float time) {
          vec2 g = uv * uResolution * 0.5;
          return fract(sin(dot(g + time, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
        }

        vec3 getGradientColor(vec2 uv, float time) {
          float gr = uGradientSize;
          vec2 c1  = vec2(0.5 + sin(time*uSpeed*0.40)*0.40, 0.5 + cos(time*uSpeed*0.50)*0.40);
          vec2 c2  = vec2(0.5 + cos(time*uSpeed*0.60)*0.50, 0.5 + sin(time*uSpeed*0.45)*0.50);
          vec2 c3  = vec2(0.5 + sin(time*uSpeed*0.35)*0.45, 0.5 + cos(time*uSpeed*0.55)*0.45);
          vec2 c4  = vec2(0.5 + cos(time*uSpeed*0.50)*0.40, 0.5 + sin(time*uSpeed*0.40)*0.40);
          vec2 c5  = vec2(0.5 + sin(time*uSpeed*0.70)*0.35, 0.5 + cos(time*uSpeed*0.60)*0.35);
          vec2 c6  = vec2(0.5 + cos(time*uSpeed*0.45)*0.50, 0.5 + sin(time*uSpeed*0.65)*0.50);
          vec2 c7  = vec2(0.5 + sin(time*uSpeed*0.55)*0.38, 0.5 + cos(time*uSpeed*0.48)*0.42);
          vec2 c8  = vec2(0.5 + cos(time*uSpeed*0.65)*0.36, 0.5 + sin(time*uSpeed*0.52)*0.44);
          vec2 c9  = vec2(0.5 + sin(time*uSpeed*0.42)*0.41, 0.5 + cos(time*uSpeed*0.58)*0.39);
          vec2 c10 = vec2(0.5 + cos(time*uSpeed*0.48)*0.37, 0.5 + sin(time*uSpeed*0.62)*0.43);
          vec2 c11 = vec2(0.5 + sin(time*uSpeed*0.68)*0.33, 0.5 + cos(time*uSpeed*0.44)*0.46);
          vec2 c12 = vec2(0.5 + cos(time*uSpeed*0.38)*0.39, 0.5 + sin(time*uSpeed*0.56)*0.41);

          float i1  = 1.0 - smoothstep(0.0, gr, length(uv-c1));
          float i2  = 1.0 - smoothstep(0.0, gr, length(uv-c2));
          float i3  = 1.0 - smoothstep(0.0, gr, length(uv-c3));
          float i4  = 1.0 - smoothstep(0.0, gr, length(uv-c4));
          float i5  = 1.0 - smoothstep(0.0, gr, length(uv-c5));
          float i6  = 1.0 - smoothstep(0.0, gr, length(uv-c6));
          float i7  = 1.0 - smoothstep(0.0, gr, length(uv-c7));
          float i8  = 1.0 - smoothstep(0.0, gr, length(uv-c8));
          float i9  = 1.0 - smoothstep(0.0, gr, length(uv-c9));
          float i10 = 1.0 - smoothstep(0.0, gr, length(uv-c10));
          float i11 = 1.0 - smoothstep(0.0, gr, length(uv-c11));
          float i12 = 1.0 - smoothstep(0.0, gr, length(uv-c12));

          vec2 ru1 = uv - 0.5;
          float a1 = time * uSpeed * 0.15;
          ru1 = vec2(ru1.x*cos(a1)-ru1.y*sin(a1), ru1.x*sin(a1)+ru1.y*cos(a1)) + 0.5;
          vec2 ru2 = uv - 0.5;
          float a2 = -time * uSpeed * 0.12;
          ru2 = vec2(ru2.x*cos(a2)-ru2.y*sin(a2), ru2.x*sin(a2)+ru2.y*cos(a2)) + 0.5;

          float ri1 = 1.0 - smoothstep(0.0, 0.8, length(ru1-0.5));
          float ri2 = 1.0 - smoothstep(0.0, 0.8, length(ru2-0.5));

          vec3 color = vec3(0.0);
          color += uColor1 * i1  * (0.55 + 0.45*sin(time*uSpeed      )) * uColor1Weight;
          color += uColor2 * i2  * (0.55 + 0.45*cos(time*uSpeed*1.2  )) * uColor2Weight;
          color += uColor3 * i3  * (0.55 + 0.45*sin(time*uSpeed*0.8  )) * uColor1Weight;
          color += uColor4 * i4  * (0.55 + 0.45*cos(time*uSpeed*1.3  )) * uColor2Weight;
          color += uColor5 * i5  * (0.55 + 0.45*sin(time*uSpeed*1.1  )) * uColor1Weight;
          color += uColor6 * i6  * (0.55 + 0.45*cos(time*uSpeed*0.9  )) * uColor2Weight;
          color += uColor1 * i7  * (0.55 + 0.45*sin(time*uSpeed*1.4  )) * uColor1Weight;
          color += uColor2 * i8  * (0.55 + 0.45*cos(time*uSpeed*1.5  )) * uColor2Weight;
          color += uColor3 * i9  * (0.55 + 0.45*sin(time*uSpeed*1.6  )) * uColor1Weight;
          color += uColor4 * i10 * (0.55 + 0.45*cos(time*uSpeed*1.7  )) * uColor2Weight;
          color += mix(uColor1, uColor3, ri1) * 0.45 * uColor1Weight;
          color += mix(uColor2, uColor4, ri2) * 0.40 * uColor2Weight;

          color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
          float lum = dot(color, vec3(0.299, 0.587, 0.114));
          color = mix(vec3(lum), color, 1.35);
          color = pow(color, vec3(0.92));

          float b1 = length(color);
          color = mix(uDarkNavy, color, max(b1 * 1.2, 0.15));
          float bmax = length(color);
          if (bmax > 1.0) color *= 1.0 / bmax;
          return color;
        }

        void main() {
          vec2 uv = vUv;
          vec4 touch = texture2D(uTouchTexture, uv);
          float vx = -(touch.r * 2.0 - 1.0);
          float vy = -(touch.g * 2.0 - 1.0);
          float intensity = touch.b;
          uv.x += vx * 0.8 * intensity;
          uv.y += vy * 0.8 * intensity;

          float dist = length(uv - 0.5);
          float ripple = sin(dist * 20.0 - uTime * 3.0) * 0.04 * intensity;
          float wave  = sin(dist * 15.0 - uTime * 2.0) * 0.03 * intensity;
          uv += vec2(ripple + wave);

          vec3 color = getGradientColor(uv, uTime);
          color += grain(uv, uTime) * uGrainIntensity;

          float ts = uTime * 0.5;
          color.r += sin(ts) * 0.02;
          color.g += cos(ts * 1.4) * 0.02;
          color.b += sin(ts * 1.2) * 0.02;

          float b2 = length(color);
          color = mix(uDarkNavy, color, max(b2 * 1.2, 0.15));
          color = clamp(color, vec3(0.0), vec3(1.0));
          float bfinal = length(color);
          if (bfinal > 1.0) color *= 1.0 / bfinal;

          gl_FragColor = vec4(color, 1.0);
        }
      `
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.sceneManager.scene.add(this.mesh);
  }

  update(delta) {
    this.uniforms.uTime.value += delta;
  }

  onResize(width, height) {
    const viewSize = this.sceneManager.getViewSize();
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = new THREE.PlaneGeometry(viewSize.width, viewSize.height, 1, 1);
    }
    this.uniforms.uResolution.value.set(width, height);
  }
}

class App {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
      stencil: false,
      depth: false
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = "webGLApp";

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);
    this.camera.position.z = 50;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1f4e5f);
    this.clock = new THREE.Clock();

    this.touchTexture = new TouchTexture();
    this.gradientBackground = new GradientBackground(this);
    this.gradientBackground.uniforms.uTouchTexture.value = this.touchTexture.texture;

    this.init();
  }

  init() {
    this.gradientBackground.init();
    this.tick();

    window.addEventListener("resize", () => this.onResize());
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    window.addEventListener("touchmove", (e) => this.onTouchMove(e));
  }

  onTouchMove(e) {
    const t = e.touches[0];
    this.onMouseMove({ clientX: t.clientX, clientY: t.clientY });
  }

  onMouseMove(e) {
    this.touchTexture.addTouch({
      x: e.clientX / window.innerWidth,
      y: 1 - e.clientY / window.innerHeight
    });
  }

  getViewSize() {
    const fovRad = (this.camera.fov * Math.PI) / 180;
    const height = Math.abs(this.camera.position.z * Math.tan(fovRad / 2) * 2);
    return { width: height * this.camera.aspect, height };
  }

  tick() {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    this.touchTexture.update();
    this.gradientBackground.update(delta);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(() => this.tick());
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.gradientBackground.onResize(window.innerWidth, window.innerHeight);
  }
}

const app = new App();

// Custom cursor
const cursor = document.getElementById("customCursor");
let mouseX = 0, mouseY = 0;
let cursorAnimating = false;

document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  if (!cursorAnimating) {
    cursorAnimating = true;
    animateCursor();
  }
});

function animateCursor() {
  cursor.style.left = mouseX + "px";
  cursor.style.top = mouseY + "px";
  requestAnimationFrame(animateCursor);
}

// Grow cursor over links
document.querySelectorAll("a").forEach((el) => {
  el.addEventListener("mouseenter", () => {
    cursor.style.width = "54px";
    cursor.style.height = "54px";
    cursor.style.borderWidth = "3px";
  });
  el.addEventListener("mouseleave", () => {
    cursor.style.width = "40px";
    cursor.style.height = "40px";
    cursor.style.borderWidth = "2px";
  });
});
