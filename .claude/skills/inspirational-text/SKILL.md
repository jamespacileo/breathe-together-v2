---
name: inspirational-text
description: Manage Above & Beyond style inspirational messages that appear during breathing. Add new messages, adjust timing/styling, debug sync issues.
allowed-tools: [Read, Write, Edit, Glob, Grep]
---

# Inspirational Text Skill

Manage the breathing-synchronized inspirational messages displayed above and below the globe.

## Quick Reference

| File | Purpose |
|------|---------|
| `src/config/inspirationalMessages.ts` | Message content + add new quotes |
| `src/components/InspirationalText.tsx` | Component + animation logic |
| `src/components/GaiaUI.tsx` | Parent container (renders InspirationalText) |

## Adding New Messages

Edit `src/config/inspirationalMessages.ts`:

```typescript
export const MESSAGES: InspirationalMessage[] = [
  // Add your message here:
  { top: 'Your Top Line', bottom: 'Your Bottom Line' },
];
```

### Message Criteria

**DO:**
- Keep SHORT: 2-4 words per line
- Use PRESENT TENSE: "We Are" not "We Were"
- Focus on: Unity, Presence, Positivity
- Make it UNIVERSAL (no cultural/religious specifics)
- Use SIMPLE vocabulary

**DON'T:**
- Use negative words: "don't", "can't", "never"
- Use demanding imperatives: "You Must", "You Should"
- Make lines too long (breaks visual balance)
- Use questions

### Good vs Bad Examples

```typescript
// ✓ GOOD
{ top: 'We Are All', bottom: 'We Need' }      // Unity, complete thought
{ top: 'This Moment', bottom: 'Is Ours' }     // Presence, simple

// ✗ BAD
{ top: 'You Should Not', bottom: 'Be Afraid' }  // Negative, imperative
{ top: 'What If We', bottom: 'Could Fly?' }     // Question, abstract
```

## Animation Timing

Text syncs with the 16-second breathing cycle:

```
|-- Inhale (3s) --|-- Hold-in (5s) --|-- Exhale (5s) --|-- Hold-out (3s) --|
|   fade in 0→1   |   visible (1)    |  fade out 1→0   |   hidden (0)      |
```

**Configuration:**
- `CYCLES_PER_MESSAGE = 3` — Quotes rotate every 3 cycles (~48s)

## Styling Tokens

In `InspirationalText.tsx`:

```typescript
const colors = {
  text: '#5a4d42',                           // Text color
  textGlow: 'rgba(201, 160, 108, 0.7)',      // Warm glow
  subtleGlow: 'rgba(255, 252, 245, 0.95)',   // Light halo
  backdropInner: 'rgba(253, 251, 247, 0.4)', // Center gradient
  backdropOuter: 'rgba(253, 251, 247, 0)',   // Edge (transparent)
};
```

## Debugging Sync Issues

If text doesn't appear/disappear correctly:

1. **Check RAF loop** in `InspirationalText.tsx`:
   - `topWrapperRef` and `bottomWrapperRef` must have opacity set
   - Both wrappers animate independently (not parent container)

2. **Verify phase calculation**:
   - Phase 0 (Inhale): opacity increases 0→1
   - Phase 1 (Hold-in): opacity = 1
   - Phase 2 (Exhale): opacity decreases 1→0
   - Phase 3 (Hold-out): opacity = 0

3. **Backdrop-filter gotcha**:
   - `backdrop-filter` doesn't inherit parent opacity
   - Must animate opacity on the element WITH backdrop-filter
   - That's why we use refs on wrappers, not container

## Performance Notes

- Uses RAF loop (60fps) with direct DOM updates
- No React state changes during animation
- Quote rotation uses React state (only every ~48s)
- Backdrop blur is GPU-accelerated

## Common Tasks

### Change rotation speed
```typescript
// src/config/inspirationalMessages.ts
export const CYCLES_PER_MESSAGE = 5;  // 5 cycles = ~80 seconds
```

### Adjust text size
```typescript
// src/components/InspirationalText.tsx
fontSize: 'clamp(1.6rem, 3.5vw, 2.8rem)',  // min, preferred, max
```

### Change backdrop intensity
```typescript
backdropInner: 'rgba(253, 251, 247, 0.5)',  // Increase 0.4 → 0.5
backdropFilter: 'blur(4px)',                 // Increase 3px → 4px
```

### Adjust vertical position
```typescript
gap: 'min(38vh, 260px)',  // Space between top/bottom text
marginTop: '-3vh',        // Nudge top text up
marginBottom: '-3vh',     // Nudge bottom text down
```
