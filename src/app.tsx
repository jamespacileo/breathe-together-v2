import { Canvas } from "@react-three/fiber";
import { BreathingLevel } from "./levels/breathing";
import { KootaSystems } from "./providers";
import { BreathEntity } from "./entities/breath";
import { BreathingHUD } from "./components/BreathingHUD";

export function App() {
  return (
    <>
      <Canvas shadows>
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
