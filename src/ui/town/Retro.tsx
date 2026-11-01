// A retro look for the town: the scene is drawn small (one dot per PIXEL screen pixels), then
// scaled up with hard edges, its colours stepped down with an ordered dither like an old console.
// Drawing fewer pixels makes the town lighter to run, not heavier. Mount it inside the Canvas.
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** How many screen pixels one retro dot covers. */
const PIXEL = 1.5;
/** Colour steps per channel (16 steps = 4,096 colours before dithering). */
const LEVELS = 16;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  uniform sampler2D scene;
  uniform vec2 dots;
  uniform float levels;
  varying vec2 vUv;

  // 4x4 Bayer matrix, 0..15
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0)), y = int(mod(p.y, 4.0));
    int i = x + y * 4;
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return float(m[i]) / 16.0 - 0.5;
  }

  vec3 toSRGB(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
  }

  void main() {
    vec4 texel = texture2D(scene, vUv);
    vec3 c = toSRGB(texel.rgb);
    float steps = levels - 1.0;
    c = floor(c * steps + 0.5 + bayer(floor(vUv * dots)) ) / steps;
    gl_FragColor = vec4(clamp(c, 0.0, 1.0), texel.a);
  }
`;

export function Retro() {
  const { gl, scene, camera, size } = useThree();

  const target = useMemo(
    () => new THREE.WebGLRenderTarget(1, 1, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, samples: 0 }),
    [],
  );
  const quad = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: { scene: { value: target.texture }, dots: { value: new THREE.Vector2() }, levels: { value: LEVELS } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    mesh.frustumCulled = false;
    const holder = new THREE.Scene();
    holder.add(mesh);
    return { holder, material, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
  }, [target]);

  useEffect(() => {
    const w = Math.max(1, Math.round(size.width / PIXEL));
    const h = Math.max(1, Math.round(size.height / PIXEL));
    target.setSize(w, h);
    quad.material.uniforms["dots"]!.value.set(w, h);
  }, [size, target, quad]);

  useEffect(
    () => () => {
      target.dispose();
      quad.material.dispose();
    },
    [target, quad],
  );

  // Priority 1 takes over drawing from React Three Fiber: scene into the small target, then onto the screen.
  useFrame(() => {
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(quad.holder, quad.cam);
  }, 1);

  return null;
}
