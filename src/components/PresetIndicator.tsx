/**
 * Quality Preset Indicator
 *
 * Visual badge displaying the active quality preset in Triplex editor.
 * Shows preset name, color coding, and brief description.
 *
 * Color coding:
 * - Amber: "low" preset (mobile-friendly, performance-optimized)
 * - Blue: "medium" preset (production default, balanced quality)
 * - Purple: "high" preset (premium visuals, enhanced effects)
 * - Red: "custom" preset (manual control, all props unlocked)
 *
 * @example
 * ```tsx
 * <PresetIndicator activePreset="medium" />
 * ```
 */

import { Html } from '@react-three/drei';
import type { QualityPreset } from '../types/sceneProps';
import { QUALITY_PRESETS } from '../config/sceneDefaults';

export interface PresetIndicatorProps {
	/** Active quality preset name */
	activePreset: QualityPreset;
}

/**
 * Render preset indicator badge with color coding and description.
 *
 * Uses Html from drei to render HTML inside Canvas context.
 * Displays as fixed-position badge in top-right corner.
 */
export function PresetIndicator({ activePreset }: PresetIndicatorProps) {
	// Color scheme for each preset
	const presetColors = {
		low: {
			background: 'rgba(251, 191, 36, 0.15)',
			border: 'rgba(251, 191, 36, 0.6)',
			text: '#fbbf24',
		},
		medium: {
			background: 'rgba(96, 165, 250, 0.15)',
			border: 'rgba(96, 165, 250, 0.6)',
			text: '#60a5fa',
		},
		high: {
			background: 'rgba(167, 139, 250, 0.15)',
			border: 'rgba(167, 139, 250, 0.6)',
			text: '#a78bfa',
		},
		custom: {
			background: 'rgba(248, 113, 113, 0.15)',
			border: 'rgba(248, 113, 113, 0.6)',
			text: '#f87171',
		},
	} as const;

	const colors = presetColors[activePreset];
	const presetConfig = QUALITY_PRESETS[activePreset];
	const description = presetConfig.description;

	return (
		<Html
			position={[0, 0, 0]}
			scale={1}
			style={{
				pointerEvents: 'none',
			}}
		>
			<div
				style={{
					position: 'fixed',
					top: 16,
					right: 16,
					background: colors.background,
					border: `1px solid ${colors.border}`,
					borderRadius: 6,
					padding: '8px 12px',
					fontFamily: 'monospace',
					fontSize: '11px',
					color: colors.text,
					zIndex: 1000,
					lineHeight: '1.5',
					userSelect: 'none',
					pointerEvents: 'none',
					backdropFilter: 'blur(4px)',
				}}
			>
				<div style={{ fontWeight: 'bold', marginBottom: 4 }}>
					{activePreset.toUpperCase()} PRESET
				</div>
				<div style={{ opacity: 0.8, fontSize: '10px' }}>
					{description}
				</div>
			</div>
		</Html>
	);
}
