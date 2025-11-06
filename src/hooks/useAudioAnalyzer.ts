import { useState, useEffect, useRef } from 'react';

interface AudioData {
  freqData: Uint8Array;
  bassLevel: number;
}

export function useAudioAnalyzer(): AudioData {
  const [freqData, setFreqData] = useState<Uint8Array>(new Uint8Array(32));
  const [bassLevel, setBassLevel] = useState<number>(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initAudio = async () => {
      try {
        // Get microphone access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create audio context and analyzer
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 64; // 32 frequency bins
        analyserRef.current.smoothingTimeConstant = 0.8;

        // Connect microphone to analyzer
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);

        // Start analyzing
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const analyze = () => {
          if (!analyserRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArray);
          setFreqData(new Uint8Array(dataArray));

          // Calculate bass level (first 8 bins = low frequencies)
          let bassSum = 0;
          for (let i = 0; i < 8; i++) {
            bassSum += dataArray[i];
          }
          const avgBass = bassSum / (8 * 255); // Normalize to 0-1
          setBassLevel(avgBass);

          // Debug: log audio levels periodically
          if (Math.random() < 0.01) { // Log ~1% of frames
            const totalLevel = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            console.log('Audio levels - Bass:', avgBass.toFixed(3), 'Total:', (totalLevel / 255).toFixed(3));
          }

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (error) {
        console.error('Error accessing microphone:', error);
      }
    };

    initAudio();

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { freqData, bassLevel };
}
