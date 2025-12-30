import { Object3D } from 'three';

/**
 * Type definitions for @react-three/uikit components
 * Provides proper typing for uikit Text, Container, and other UI elements
 *
 * Note: @react-three/uikit v1.0.60 does not export component instance types,
 * so we define compatible interfaces based on observed behavior
 */

/**
 * Base uikit component instance
 * All uikit components extend Object3D from Three.js
 */
export interface UikitComponentInstance extends Object3D {
  // Uikit-specific properties may vary by component version
}

/**
 * Text component instance for displaying text in 3D
 * Provides properties for updating text content and styling
 */
export interface UikitTextInstance extends UikitComponentInstance {
  /**
   * Primary way to set text content
   * Used by modern @react-three/uikit versions
   */
  text?: string;
  /**
   * Fallback way to set text content
   * Used by some versions or HTML-compatible mode
   */
  innerText?: string;
}

/**
 * Container component instance for layout
 * Groups child elements and manages dimensions
 */
export interface UikitContainerInstance extends UikitComponentInstance {
  /**
   * Width property for layout
   * Can be set as percentage string or number
   */
  width?: string | number;
  /**
   * Height property for layout
   * Can be set as percentage string or number
   */
  height?: string | number;
  /**
   * Style object for CSS-like properties
   * Fallback when direct properties aren't available
   */
  style?: {
    width?: string | number;
    height?: string | number;
    [key: string]: unknown;
  };
}

/**
 * Type alias for refs to uikit Text components
 * Allows null initial value as is standard with useRef
 */
export type UikitTextRef = React.RefObject<UikitTextInstance | null>;

/**
 * Type alias for refs to uikit Container components
 * Allows null initial value as is standard with useRef
 */
export type UikitContainerRef = React.RefObject<UikitContainerInstance | null>;
