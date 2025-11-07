import { useEffect, useRef } from 'react';
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  Vector3,
  Color3,
  GlowLayer,
  MeshBuilder,
  Mesh,
  StandardMaterial,
} from '@babylonjs/core';
import '@babylonjs/core/Materials/standardMaterial';
import { CreateGreasedLine } from '@babylonjs/core/Meshes/Builders/greasedLineBuilder';
import type { GreasedLineMesh } from '@babylonjs/core/Meshes/GreasedLine/greasedLineMesh';
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer';

export function LightningScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { freqData, bassLevel } = useAudioAnalyzer();

  // Use refs to access latest audio data in render loop
  const freqDataRef = useRef<Uint8Array>(freqData);
  const bassLevelRef = useRef<number>(bassLevel);

  // Update refs when audio data changes
  useEffect(() => {
    freqDataRef.current = freqData;
    bassLevelRef.current = bassLevel;
  }, [freqData, bassLevel]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color3(0, 0, 0).toColor4();

    // Camera setup - positioned to view circular formation from above at angle
    const camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 4, // More overhead view
      25, // Further out to see full circle
      new Vector3(0, 2, 0), // Look slightly above ground
      scene
    );
    camera.attachControl(canvas, true);

    // Light
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    // Glow layer for lighting effect
    const glowLayer = new GlowLayer('glow', scene);
    glowLayer.intensity = 0.5;

    // Create spectrum bars in circular formation
    const bars: Mesh[] = [];
    const barCount = 32;
    const circleRadius = 8;

    for (let i = 0; i < barCount; i++) {
      const bar = MeshBuilder.CreateBox(
        `bar${i}`,
        { width: 0.4, height: 1, depth: 0.4 },
        scene
      );

      // Calculate position on circle
      const angle = (i / barCount) * Math.PI * 2;
      bar.position.x = Math.cos(angle) * circleRadius;
      bar.position.z = Math.sin(angle) * circleRadius;
      bar.position.y = 0.5;

      // Rotate bar to face center
      bar.rotation.y = -angle;

      const material = new StandardMaterial(`barMat${i}`, scene);
      // Create rainbow gradient: red -> orange -> yellow -> green -> cyan -> blue -> purple
      const hue = i / barCount;
      material.emissiveColor = new Color3(
        Math.sin(hue * Math.PI * 2) * 0.5 + 0.5,
        Math.sin((hue + 0.33) * Math.PI * 2) * 0.5 + 0.5,
        Math.sin((hue + 0.66) * Math.PI * 2) * 0.5 + 0.5
      );
      bar.material = material;

      bars.push(bar);
    }

    // Lightning bolts array
    let lightningBolts: GreasedLineMesh[] = [];
    let lastLightningTime = 0;

    // Function to generate random lightning path
    function generateLightningPath(
      start: Vector3,
      end: Vector3,
      segments: number = 10
    ): Vector3[] {
      const points: Vector3[] = [start];
      const direction = end.subtract(start);
      const segmentLength = 1 / segments;

      for (let i = 1; i < segments; i++) {
        const t = i * segmentLength;
        const basePoint = start.add(direction.scale(t));

        // Add random offset
        const offset = new Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 0.5
        );

        points.push(basePoint.add(offset));
      }

      points.push(end);
      return points;
    }

    // Debug counter
    let debugCounter = 0;

    // Animation loop
    scene.registerBeforeRender(() => {
      const currentFreqData = freqDataRef.current;
      const currentBassLevel = bassLevelRef.current;

      // Debug log every 60 frames (~1 second)
      if (debugCounter++ % 60 === 0) {
        console.log('Render loop - freqData length:', currentFreqData.length, 'first value:', currentFreqData[0], 'bassLevel:', currentBassLevel.toFixed(3));
      }

      // Update spectrum bars based on frequency data
      for (let i = 0; i < Math.min(bars.length, currentFreqData.length); i++) {
        const height = (currentFreqData[i] / 255) * 8 + 0.5; // Increased scale for better visibility
        bars[i].scaling.y = height;
        bars[i].position.y = height / 2;
      }

      // Update glow intensity based on bass
      glowLayer.intensity = 0.5 + currentBassLevel * 2;

      // Generate lightning bolts based on bass level
      const currentTime = Date.now();
      const shouldGenerateLightning =
        currentBassLevel > 0.05 &&
        currentTime - lastLightningTime > 100 / (1 + currentBassLevel * 5);

      if (shouldGenerateLightning) {
        lastLightningTime = currentTime;

        // Remove old lightning bolts
        lightningBolts.forEach(bolt => bolt.dispose());
        lightningBolts = [];

        // Generate new lightning bolt
        const numBolts = Math.floor(currentBassLevel * 3) + 1;

        for (let i = 0; i < numBolts; i++) {
          const startPoint = new Vector3(
            (Math.random() - 0.5) * 10,
            8,
            (Math.random() - 0.5) * 10
          );
          const endPoint = new Vector3(
            (Math.random() - 0.5) * 10,
            -2,
            (Math.random() - 0.5) * 10
          );

          const path = generateLightningPath(startPoint, endPoint, 15);

          const lightning = CreateGreasedLine(
            `lightning${i}`,
            {
              points: path,
            },
            {
              width: 0.1 + currentBassLevel * 0.3,
              color: new Color3(0.8, 0.9, 1),
            },
            scene
          ) as GreasedLineMesh;

          lightningBolts.push(lightning);

          // Auto-remove after short time
          setTimeout(() => {
            lightning.dispose();
            const index = lightningBolts.indexOf(lightning);
            if (index > -1) {
              lightningBolts.splice(index, 1);
            }
          }, 100 + Math.random() * 100);
        }
      }

      // Camera rotation based on bass
      camera.alpha += 0.001 + currentBassLevel * 0.002;
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      lightningBolts.forEach(bolt => bolt.dispose());
      scene.dispose();
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
}
