"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function LoginBackground() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;
    let clock: THREE.Clock;
    const mouse = new THREE.Vector2(0.5, 0.5);
    const targetMouse = new THREE.Vector2(0.5, 0.5);
    const uniforms = {
      t: { value: 0.0 },
      r: { value: new THREE.Vector2(1, 1) },
      mouse: { value: new THREE.Vector2(0.5, 0.5) },
    };

    function init() {
      scene = new THREE.Scene();
      clock = new THREE.Clock();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      const mountEl = mountRef.current;
      const width = mountEl?.clientWidth ?? window.innerWidth;
      const height = mountEl?.clientHeight ?? window.innerHeight;
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      uniforms.r.value.set(width, height);
      renderer.domElement.style.position = "absolute";
      renderer.domElement.style.top = "0";
      renderer.domElement.style.left = "0";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      renderer.domElement.style.zIndex = "0";
      mountRef.current?.appendChild(renderer.domElement);
      const geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
        fragmentShader: `
                    uniform vec2 r;
                    uniform float t;
                    uniform vec2 mouse;
                    varying vec2 vUv;
                    #define PI 3.14159265359
                    mat2 rot(float a) {
                        float s = sin(a);
                        float c = cos(a);
                        return mat2(c, -s, s, c);
                    }
                    float wave(vec2 p, float phase, float freq) {
                        return sin(p.x * freq + phase) * 0.3 * sin(p.y * freq * 0.5 + phase * 0.7);
                    }
                    float glowLine(float dist, float thickness, float intensity) {
                        return intensity * thickness / (abs(dist) + thickness * 0.5);
                    }
                    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
                    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
                    float snoise(vec2 v) {
                        const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                        vec2 i = floor(v + dot(v, C.yy));
                        vec2 x0 = v - i + dot(i, C.xx);
                        vec2 i1;
                        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                        vec4 x12 = x0.xyxy + C.xxzz;
                        x12.xy -= i1;
                        i = mod289(i);
                        vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
                        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                        m = m*m;
                        m = m*m;
                        vec3 x = 2.0 * fract(p * C.www) - 1.0;
                        vec3 h = abs(x) - 0.5;
                        vec3 ox = floor(x + 0.5);
                        vec3 a0 = x - ox;
                        m *= (1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h));
                        vec3 g;
                        g.x = a0.x * x0.x + h.x * x0.y;
                        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                        return 130.0 * dot(m, g);
                    }
                    float hash(vec2 p) {
                        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
                    }
                    float starfield(vec2 uv, float time) {
                        vec2 grid = floor(uv * 150.0);
                        vec2 frac = fract(uv * 150.0) - 0.5;
                        float star = hash(grid);
                        if (star < 0.985) return 0.0;
                        float twinkle = sin(time * 2.0 + grid.x + grid.y) * 0.5 + 0.5;
                        float dist = length(frac);
                        float sparkle = smoothstep(0.08, 0.0, dist) * twinkle;
                        return sparkle * (star - 0.985) * 100.0;
                    }
                    void main() {
                        vec2 uv = (vUv - 0.5) * 2.0;
                        uv.x *= r.x / r.y;
                        vec2 uv0 = uv;
                        vec3 col = vec3(0.0);
                        vec3 baseColor = vec3(0.6353, 0.9608, 0.8588);
                        float time = t * 0.4;
                        float noise = (snoise(uv * 0.5 + time * 0.02) + 1.0) * 0.5;
                        col += noise * baseColor * 0.08;
                        vec2 mouse_uv = (mouse - 0.5) * 2.0;
                        mouse_uv.x *= r.x / r.y;
                        float mouseDist = length(uv - mouse_uv);
                        uv += (mouse_uv - uv) * (0.3 / (mouseDist + 0.5));
                        float mouseGlow = 0.1 / (mouseDist + 0.1);
                        mouseGlow *= (sin(t * 1.5) * 0.5 + 0.5) * 0.7 + 0.3;
                        col += mouseGlow * baseColor * 0.2;
                        uv *= rot(time * 0.05);
                        float waveNoise = snoise(uv * 2.0 + time * 0.2) * 0.1;
                        float c1 = sin(time * 0.3 + 0.0) * 0.5 + 0.5;
                        float c2 = sin(time * 0.3 + 2.0) * 0.5 + 0.5;
                        float c3 = sin(time * 0.3 + 4.0) * 0.5 + 0.5;
                        float y1 = uv.y - wave(uv, time * 1.5, 2.0) + waveNoise;
                        float line1 = glowLine(y1, 0.03, 0.8);
                        vec3 color1 = baseColor * (0.75 + 0.35 * c1);
                        col += color1 * line1;
                        float y2 = uv.y + 0.4 - wave(uv + vec2(1.0, 0.5), time * 1.2, 2.5) + waveNoise * 0.8;
                        float line2 = glowLine(y2, 0.03, 0.8);
                        vec3 color2 = baseColor * (0.7 + 0.4 * c2);
                        col += color2 * line2;
                        float y3 = uv.y - 0.4 - wave(uv + vec2(-0.5, 1.0), time * 1.8, 1.8) + waveNoise * 1.2;
                        float line3 = glowLine(y3, 0.03, 0.8);
                        vec3 color3 = baseColor * (0.65 + 0.45 * c3);
                        col += color3 * line3;
                        float dist = length(uv0);
                        float circle = abs(sin(dist * 4.0 - time * 2.0)) * exp(-dist * 0.5);
                        col += baseColor * circle * 0.28;
                        col += starfield(uv0 * 2.0 + time * 0.01, t) * baseColor * 0.65;
                        float centerGlow = exp(-dist * 1.0) * 0.3;
                        col += centerGlow * baseColor * 0.75;
                        float vignette = 1.0 - dist * 0.5;
                        vignette = smoothstep(0.0, 1.0, vignette);
                        col *= vignette;
                        col = pow(col, vec3(0.95));
                        gl_FragColor = vec4(col, 1.0);
                    }
                `,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("resize", onWindowResize);
    }

    function onMouseMove(event: MouseEvent) {
      targetMouse.x = event.clientX / window.innerWidth;
      targetMouse.y = 1.0 - event.clientY / window.innerHeight;
    }

    function onTouchMove(event: TouchEvent) {
      if (event.touches.length > 0) {
        targetMouse.x = event.touches[0].clientX / window.innerWidth;
        targetMouse.y = 1.0 - event.touches[0].clientY / window.innerHeight;
      }
    }

    function onWindowResize() {
      const mountEl = mountRef.current;
      const width = mountEl?.clientWidth ?? window.innerWidth;
      const height = mountEl?.clientHeight ?? window.innerHeight;
      renderer.setSize(width, height);
      uniforms.r.value.set(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
    }

    let animationFrameId = 0;
    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      uniforms.t.value = clock.getElapsedTime();
      mouse.lerp(targetMouse, 0.05);
      uniforms.mouse.value.copy(mouse);
      renderer.render(scene, camera);
    }

    init();
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("resize", onWindowResize);
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />;
}
