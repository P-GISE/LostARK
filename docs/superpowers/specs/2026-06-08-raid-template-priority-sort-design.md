# Raid Template Priority Sort Design

## Goal

Show raid templates and weekly boss checks in the requested operational order instead of Korean alphabetical order.

## Priority

The global boss-name priority is:

1. 지평의 성당
2. 세르카
3. 카제로스 종막
4. 카제로스 4막
5. 카제로스 3막
6. 카제로스 2막
7. 카제로스 1막
8. 카제로스 서막

Any boss outside this list keeps the existing fallback order: Korean name sort, then difficulty, then gates.

## Implementation

`compareRaidTemplateDisplay` is the shared sorting boundary for template lists and member boss checks. Add a boss-name priority rank there so both screens get the same order without page-specific duplication.

## Testing

Add a unit test for mixed raid names to verify the priority order. Keep existing same-boss difficulty ordering tests.
