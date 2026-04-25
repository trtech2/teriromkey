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
      uColor2Weight: { value: 1.8 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uMouseHot: { value: new THREE.Vector3(0.985, 0.55, 0.32) }
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
        uniform vec2 uMouse;
        uniform vec3 uMouseHot;

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

          // Mouse-driven hot spot — a strong, large gradient center under the cursor
          float mouseDist = length(uv - uMouse);
          float mouseInfluence = 1.0 - smoothstep(0.0, 0.55, mouseDist);
          color += uMouseHot * pow(mouseInfluence, 1.4) * 2.6;
          // tight bright core
          float core = 1.0 - smoothstep(0.0, 0.08, mouseDist);
          color += uMouseHot * core * 1.4;

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
      depth: true
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

    this.mouseNorm = { x: 0, y: 0 };
    this.lastMouse = { x: 0, y: 0 };
    this.rotVelocity = { x: 0, y: 0 };
    this.particles = [];
    this.photos = [];

    this.init();
  }

  initPhotos() {
    const files = [
      "images/exhibition.jpg",
      "images/bourse.jpg",
      "images/driveby.jpg",
      "images/upstate.jpg",
      "images/portraits.jpg"
    ];
    const loader = new THREE.TextureLoader();

    // place photos on a ring around the star
    const count = files.length;
    const ringRadius = 18;
    files.forEach((src, i) => {
      const tex = loader.load(src, (t) => {
        // scale plane to image aspect ratio
        const aspect = t.image.width / t.image.height;
        const h = 5;
        mesh.scale.set(h * aspect, h, 1);
      });
      tex.colorSpace = THREE.SRGBColorSpace || tex.colorSpace;

      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide
      });
      const geo = new THREE.PlaneGeometry(1, 1);
      const mesh = new THREE.Mesh(geo, mat);

      const angle = (i / count) * Math.PI * 2;
      mesh.userData = {
        baseAngle: angle,
        baseRadius: ringRadius,
        z: (Math.random() - 0.5) * 16,
        floatSpeed: 0.3 + Math.random() * 0.4,
        floatAmp: 1.5 + Math.random() * 1.5,
        rotSpeed: (Math.random() - 0.5) * 0.4,
        phase: Math.random() * Math.PI * 2
      };

      this.scene.add(mesh);
      this.photos.push(mesh);
    });
  }

  updatePhotos(delta) {
    if (!this.photos.length) return;
    const t = performance.now() * 0.0003;
    // mouse parallax
    const mx = this.mouseNorm.x * 2.5;
    const my = this.mouseNorm.y * 2.5;
    for (const p of this.photos) {
      const d = p.userData;
      const angle = d.baseAngle + t * 0.4;
      const r = d.baseRadius + Math.sin(t * d.floatSpeed * 4 + d.phase) * 1.2;
      const targetX = Math.cos(angle) * r + mx;
      const targetY = Math.sin(angle) * r * 0.55 + Math.sin(t * d.floatSpeed * 3 + d.phase) * d.floatAmp + my;
      const targetZ = d.z + Math.cos(t * d.floatSpeed * 2 + d.phase) * 3;
      p.position.x += (targetX - p.position.x) * 0.05;
      p.position.y += (targetY - p.position.y) * 0.05;
      p.position.z += (targetZ - p.position.z) * 0.05;
      p.rotation.y += d.rotSpeed * delta;
      p.rotation.z = Math.sin(t * d.floatSpeed * 2 + d.phase) * 0.1;
    }
  }

  buildStarGeometry(outer, inner, depth) {
    const shape = new THREE.Shape();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    shape.closePath();
    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: depth * 0.3,
      bevelSize: depth * 0.3,
      bevelSegments: 3,
      curveSegments: 6
    });
  }

  initStar() {
    const geo = this.buildStarGeometry(4.5, 2.0, 1.2);
    geo.center();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf4efe6,
      metalness: 0.85,
      roughness: 0.25,
      emissive: 0xe8633c,
      emissiveIntensity: 0.35
    });
    this.star = new THREE.Mesh(geo, mat);
    this.star.position.set(0, 0, 20);
    this.scene.add(this.star);

    const ambient = new THREE.AmbientLight(0xfff4e6, 0.6);
    const key = new THREE.DirectionalLight(0xfff0d8, 1.4);
    key.position.set(15, 20, 30);
    const fill = new THREE.DirectionalLight(0xe8633c, 0.6);
    fill.position.set(-20, -10, 15);
    this.scene.add(ambient, key, fill);

    // shared geometry for particle stars
    this.particleGeo = this.buildStarGeometry(0.7, 0.3, 0.2);
    this.particleGeo.center();
  }

  spawnParticles(count) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0xf4efe6,
        metalness: 0.7,
        roughness: 0.3,
        emissive: 0xe8633c,
        emissiveIntensity: 0.6,
        transparent: true,
        opacity: 1
      });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(this.star.position);
      const angle = Math.random() * Math.PI * 2;
      const speed = 12 + Math.random() * 14;
      mesh.userData = {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        vz: (Math.random() - 0.5) * 6,
        rx: (Math.random() - 0.5) * 8,
        ry: (Math.random() - 0.5) * 8,
        rz: (Math.random() - 0.5) * 8,
        life: 0,
        maxLife: 1.2 + Math.random() * 0.6
      };
      this.scene.add(mesh);
      this.particles.push(mesh);
    }
  }

  updateStarAndParticles(delta) {
    if (!this.star) return;

    // Smooth rotation toward mouse position; mouse velocity drives extra spin
    const targetX = this.mouseNorm.y * 0.6;
    const targetY = this.mouseNorm.x * 0.9;
    this.star.rotation.x += (targetX - this.star.rotation.x) * 0.08 + this.rotVelocity.x;
    this.star.rotation.y += (targetY - this.star.rotation.y) * 0.08 + this.rotVelocity.y;
    this.star.rotation.z += 0.2 * delta;

    // gentle floating
    this.star.position.y = Math.sin(performance.now() * 0.0008) * 0.6;

    // measure spin speed; emit particles when spinning fast
    const spin = Math.hypot(this.rotVelocity.x, this.rotVelocity.y);
    if (spin > 0.04) {
      const burst = Math.min(4, Math.floor(spin * 30));
      this.spawnParticles(burst);
    }

    // decay rotational velocity (momentum)
    this.rotVelocity.x *= 0.9;
    this.rotVelocity.y *= 0.9;

    // update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const d = p.userData;
      d.life += delta;
      const t = d.life / d.maxLife;
      p.position.x += d.vx * delta;
      p.position.y += d.vy * delta;
      p.position.z += d.vz * delta;
      p.rotation.x += d.rx * delta;
      p.rotation.y += d.ry * delta;
      p.rotation.z += d.rz * delta;
      d.vx *= 0.97;
      d.vy *= 0.97;
      p.material.opacity = 1 - t;
      const s = 1 - t * 0.4;
      p.scale.set(s, s, s);
      if (t >= 1) {
        this.scene.remove(p);
        p.material.dispose();
        this.particles.splice(i, 1);
      }
    }
  }

  init() {
    this.gradientBackground.init();
    this.initStar();
    this.initPhotos();
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
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    this.rotVelocity.x += (ny - this.lastMouse.y) * 0.6;
    this.rotVelocity.y += (nx - this.lastMouse.x) * 0.6;
    this.lastMouse.x = nx;
    this.lastMouse.y = ny;
    this.mouseNorm.x = nx;
    this.mouseNorm.y = ny;

    const ux = e.clientX / window.innerWidth;
    const uy = 1 - e.clientY / window.innerHeight;
    this.touchTexture.addTouch({ x: ux, y: uy });
    this.gradientBackground.uniforms.uMouse.value.set(ux, uy);
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
    this.updateStarAndParticles(delta);
    this.updatePhotos(delta);
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

// Comet cursor — colored head with fading trail drawn on a full-screen canvas
(function comet() {
  const canvas = document.getElementById("cometCanvas");
  const ctx = canvas.getContext("2d");
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const trail = [];
  const MAX_TRAIL = 38;
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let lastT = performance.now();

  // hue cycles slowly so the comet shifts color through coral → cream → teal
  let hue = 18; // start near coral

  window.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });
  window.addEventListener("touchmove", (e) => {
    const t = e.touches[0];
    mouseX = t.clientX;
    mouseY = t.clientY;
  });

  function frame(now) {
    const dt = Math.min((now - lastT) / 1000, 0.05);
    lastT = now;
    hue += dt * 18; // slow color shift

    trail.push({ x: mouseX, y: mouseY, t: 0, hue });
    if (trail.length > MAX_TRAIL) trail.shift();

    // age points
    for (const p of trail) p.t += dt;

    // fade frame so previous draws decay (motion-blur look)
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // draw trail (additive)
    ctx.globalCompositeOperation = "lighter";

    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const lifeRatio = i / trail.length;
      const alpha = lifeRatio * 0.85;
      const radius = 2 + lifeRatio * 14;
      const h = (b.hue + (1 - lifeRatio) * 80) % 360;
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, radius);
      grad.addColorStop(0, `hsla(${h}, 90%, 65%, ${alpha})`);
      grad.addColorStop(1, `hsla(${h}, 90%, 50%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // connector segment between consecutive points
      ctx.strokeStyle = `hsla(${h}, 95%, 70%, ${alpha * 0.7})`;
      ctx.lineWidth = lifeRatio * 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // bright comet head
    const head = trail[trail.length - 1];
    if (head) {
      const headGrad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 28);
      headGrad.addColorStop(0, `hsla(${hue}, 100%, 85%, 1)`);
      headGrad.addColorStop(0.4, `hsla(${hue}, 95%, 60%, 0.6)`);
      headGrad.addColorStop(1, `hsla(${hue}, 95%, 50%, 0)`);
      ctx.fillStyle = headGrad;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 28, 0, Math.PI * 2);
      ctx.fill();

      // crisp inner core
      ctx.fillStyle = `hsla(${hue}, 100%, 95%, 0.9)`;
      ctx.beginPath();
      ctx.arc(head.x, head.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
