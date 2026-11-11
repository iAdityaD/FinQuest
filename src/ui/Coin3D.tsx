import { GLView } from 'expo-gl';
import type { ExpoWebGLRenderingContext } from 'expo-gl';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { Sprite } from './Sprite';

interface Props {
  size?: number;
  /** Must match the surface behind the coin: the GL view is cleared to this colour. */
  background: string;
}

/**
 * A spinning low-poly coin rendered with three.js on an expo-gl surface.
 * Tap it to make it spin faster. If WebGL is unavailable, or 3D effects are
 * switched off in Settings, it falls back to the flat pixel sprite.
 */
export function Coin3D({ size = 72, background }: Props) {
  const enabled = useStore((s) => s.settings.effects3d);
  const [failed, setFailed] = useState(false);
  const speed = useRef(1);
  const frame = useRef<number | null>(null);
  const dispose = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      dispose.current?.();
    },
    [],
  );

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      const width = gl.drawingBufferWidth;
      const height = gl.drawingBufferHeight;
      // three.js expects a DOM canvas; this is the minimum it touches.
      const canvas = {
        width, height, clientWidth: width, clientHeight: height, style: {},
        addEventListener: () => {}, removeEventListener: () => {}, getContext: () => gl,
      };
      const renderer = new THREE.WebGLRenderer({ canvas: canvas as unknown as HTMLCanvasElement, context: gl as unknown as WebGLRenderingContext, antialias: false });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.setClearColor(new THREE.Color(background), 1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 50);
      camera.position.z = 5;
      scene.add(new THREE.AmbientLight(0xffffff, 1.4));
      const sun = new THREE.DirectionalLight(0xffffff, 2.2);
      sun.position.set(2, 3, 4);
      scene.add(sun);

      // Eight-sided cylinders keep the chunky, low-resolution look.
      const rimGeo = new THREE.CylinderGeometry(1.3, 1.3, 0.3, 8);
      const faceGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.38, 8);
      const rimMat = new THREE.MeshPhongMaterial({ color: 0xffd54a, flatShading: true, shininess: 60 });
      const faceMat = new THREE.MeshPhongMaterial({ color: 0xff9f43, flatShading: true, shininess: 30 });
      const coin = new THREE.Group();
      for (const mesh of [new THREE.Mesh(rimGeo, rimMat), new THREE.Mesh(faceGeo, faceMat)]) {
        mesh.rotation.x = Math.PI / 2; // turn the flat face towards the camera
        coin.add(mesh);
      }
      scene.add(coin);

      dispose.current = () => {
        rimGeo.dispose();
        faceGeo.dispose();
        rimMat.dispose();
        faceMat.dispose();
        renderer.dispose();
      };

      let last = Date.now();
      const tick = () => {
        const now = Date.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        speed.current += (1 - speed.current) * Math.min(1, dt * 1.5); // ease back to normal after a tap
        coin.rotation.y += dt * 1.8 * speed.current;
        coin.position.y = Math.sin(now / 500) * 0.12;
        renderer.render(scene, camera);
        gl.endFrameEXP();
        frame.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      console.warn('FinQuest: 3D coin unavailable, using the sprite instead', e);
      setFailed(true);
    }
  };

  if (!enabled || failed) return <Sprite name="coin" size={size} />;
  return (
    <Pressable onPress={() => (speed.current = 9)} accessibilityLabel="Spin the coin">
      <GLView style={{ width: size, height: size }} onContextCreate={onContextCreate} />
    </Pressable>
  );
}
