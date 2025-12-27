import { Canvas } from "@react-three/fiber";
import { BreathingLevel } from "./levels/breathing";
import { KootaSystems } from "./providers";
import { BreathEntity } from "./entities/breath";
import { BreathingHUD } from "./components/BreathingHUD";
import { CameraRig } from "./entities/camera/CameraRig";
import { useHeartbeat } from "./hooks/usePresence";
import { useMemo } from "react";

export function App() {
  const sessionId = useMemo(() => Math.random().toString(36).substring(2, 15), []);
  useHeartbeat(sessionId, 'moment');

  return (
    <>
      <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
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
    </>
  );
}
