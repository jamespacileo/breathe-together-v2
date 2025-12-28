// Template: Triplex-Compatible Props Interface
// Copy this and customize for your component

interface MyComponentProps {
  /**
   * [Description of what this prop does]
   *
   * **When to adjust**: [Context: when and why to change]
   * **Typical range**: [Visual landmarks, e.g., "0.1-1.0 subtle, 1.0-2.0 dramatic"]
   * **Interacts with**: [Other props that affect or are affected by this]
   * **Performance note**: [Only if significant GPU/CPU cost]
   *
   * @type slider (remove if obvious from TypeScript type)
   * @min [lowest acceptable value]
   * @max [highest acceptable value]
   * @step [increment, e.g., 0.1 for fine control, 10 for coarse]
   * @default [production-ready default value]
   */
  propName?: number;

  /**
   * [Boolean prop description]
   *
   * @type boolean
   * @default true
   */
  booleanProp?: boolean;

  /**
   * [Color prop description]
   *
   * @type color
   * @default "#ffffff"
   */
  colorProp?: string;

  /**
   * [Vector3 X component - use individual floats for Triplex]
   *
   * @min -10
   * @max 10
   * @step 0.1
   * @default 0
   */
  positionX?: number;

  /**
   * [Vector3 Y component]
   *
   * @min -10
   * @max 10
   * @step 0.1
   * @default 0
   */
  positionY?: number;

  /**
   * [Vector3 Z component]
   *
   * @min -10
   * @max 10
   * @step 0.1
   * @default 0
   */
  positionZ?: number;
}

/**
 * My Component - Triplex-Editable Visual Entity
 *
 * Props are fully editable in Triplex visual editor.
 * All props should be flat (no nested objects) for Triplex compatibility.
 */
export function MyComponent(props: MyComponentProps = {}): JSX.Element {
  const {
    propName = 1.0,
    booleanProp = true,
    colorProp = '#ffffff',
    positionX = 0,
    positionY = 0,
    positionZ = 0,
  } = props;

  // Internal grouping for readability (convert flat props back to grouped)
  const position = [positionX, positionY, positionZ];

  return (
    <group position={position}>
      {/* Your Three.js components here */}
    </group>
  );
}

// Export type for use elsewhere
export type MyComponentProps = MyComponentProps;
