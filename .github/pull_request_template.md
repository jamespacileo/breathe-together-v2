## Description

<!-- Provide a brief description of the changes in this PR -->

## Type of Change

<!-- Mark the relevant option with an 'x' -->

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)
- [ ] Documentation update
- [ ] Other (please describe):

## Testing

<!-- Describe the tests you ran and how to reproduce them -->

- [ ] Tested locally in development mode
- [ ] Tested production build
- [ ] Tested on mobile/responsive
- [ ] Added/updated unit tests
- [ ] Added/updated integration tests

## Three.js / WebGL Memory Management

<!-- If you created Three.js resources, ensure proper disposal -->

- [ ] **No Three.js resources created** (skip this section)
- [ ] All `new THREE.*Geometry()` calls have corresponding `.dispose()` or `useDisposeGeometries()`
- [ ] All `new THREE.*Material()` calls have corresponding `.dispose()` or `useDisposeMaterials()`
- [ ] All `new THREE.*Texture()` calls have corresponding `.dispose()` or `useDisposeTextures()`
- [ ] All `new THREE.WebGLRenderTarget()` calls have corresponding `.dispose()` or `useDisposeRenderTargets()`
- [ ] Verified no GPU memory leaks with Chrome DevTools Memory profiler
- [ ] Ran `npm run audit:disposal` and addressed any warnings

## Code Quality

- [ ] Code follows project style guidelines (Biome passes)
- [ ] `npm run typecheck` passes with no errors
- [ ] `npm run check` passes with no errors
- [ ] Added JSDoc comments for new public functions/components
- [ ] Updated CLAUDE.md if architectural patterns changed

## React / Event Handling

- [ ] All `addEventListener` calls have corresponding `removeEventListener` in cleanup
- [ ] All `useEffect` hooks with side effects have cleanup functions
- [ ] No memory leaks from event listeners or timers
- [ ] Proper dependency arrays in `useEffect`, `useMemo`, `useCallback`

## Performance

- [ ] No `new` allocations in `useFrame` or other frame loops
- [ ] No `.clone()` calls in hot paths (use `.copy()` to pre-allocated objects)
- [ ] Temp objects for frame loops declared outside the loop
- [ ] No expensive calculations in render path without `useMemo`

## Accessibility

- [ ] Interactive elements have proper ARIA labels
- [ ] Keyboard navigation works as expected
- [ ] Focus states are visible
- [ ] Color contrast meets WCAG guidelines

## Documentation

- [ ] Updated relevant documentation in CLAUDE.md
- [ ] Added comments explaining complex logic
- [ ] Updated component JSDoc with new props

## Screenshots / Videos

<!-- If applicable, add screenshots or videos demonstrating the changes -->

## Additional Notes

<!-- Any additional information or context about the PR -->

## Checklist

- [ ] I have performed a self-review of my code
- [ ] I have commented my code in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have tested that my changes work as expected
- [ ] I have verified no memory leaks (Three.js disposal, event listeners)
