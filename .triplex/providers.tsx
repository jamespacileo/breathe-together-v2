import { type ReactNode } from "react";
import { KootaSystems, RootProviders } from "../src/providers";
import { BreathEntity } from "../src/entities/breath";

export function GlobalProvider({ children }: { children: ReactNode }) {
  return <RootProviders>{children}</RootProviders>;
}

export function CanvasProvider({
  breathSystemEnabled = true,
  cameraFollowFocusedSystem = false,
  children,
  cursorPositionFromLandSystem = false,
  positionFromVelocitySystem = false,
  velocityTowardsTargetSystem = false,
}: {
  breathSystemEnabled?: boolean;
  cameraFollowFocusedSystem?: boolean;
  children: ReactNode;
  cursorPositionFromLandSystem?: boolean;
  positionFromVelocitySystem?: boolean;
  velocityTowardsTargetSystem?: boolean;
}) {
  return (
    <KootaSystems
      breathSystemEnabled={breathSystemEnabled}
      cameraFollowFocusedSystem={cameraFollowFocusedSystem}
      cursorPositionFromLandSystem={cursorPositionFromLandSystem}
      positionFromVelocitySystem={positionFromVelocitySystem}
      velocityTowardsTargetSystem={velocityTowardsTargetSystem}
    >
      <BreathEntity />
      {children}
    </KootaSystems>
  );
}
