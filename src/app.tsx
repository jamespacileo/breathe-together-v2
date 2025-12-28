import { Canvas } from "@react-three/fiber";
import { BreathingLevel } from "./levels/breathing";
import { KootaSystems } from "./providers";
import { BreathEntity } from "./entities/breath";
import { BreathingHUD } from "./components/BreathingHUD";
import { CameraRig } from "./entities/camera/CameraRig";
import { useHeartbeat } from "./hooks/usePresence";
import { useMemo, useEffect } from "react";
import { QualityProvider, useQuality } from "./contexts/QualityContext";
import { QualitySettings } from "./components/QualitySettings";
import { usePerformanceMonitor } from "./hooks/usePerformanceMonitor";

/**
 * Component that bridges R3F performance monitoring (inside Canvas)
 * with QualityContext (outside Canvas)
 */
function PerformanceMonitorBridge() {
  const metrics = usePerformanceMonitor();
  const { setPerformanceMetrics } = useQuality();

  useEffect(() => {
    setPerformanceMetrics(metrics);
  }, [metrics, setPerformanceMetrics]);

  return null;
}

export function App() {
  const sessionId = useMemo(() => Math.random().toString(36).substring(2, 15), []);
  useHeartbeat(sessionId, 'moment');

  return (
    <QualityProvider>
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
        <PerformanceMonitorBridge />
        <CameraRig />
        <KootaSystems
          breathSystemEnabled={true}
          cursorPositionFromLandSystem={false}
          velocityTowardsTargetSystem={false}
          positionFromVelocitySystem={false}
          cameraFollowFocusedSystem={false}
        >
          <BreathEntity />
          <BreathingLevel />
        </KootaSystems>
      </Canvas>
      <BreathingHUD />
      <QualitySettings />
    </QualityProvider>
  );
}
