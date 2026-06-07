# Default Unavailable And Raid Checklist Design

## Goal

Make availability entry faster by treating unmarked slots as unavailable, and add a weekly per-character raid checklist so the group can see which bosses each character still needs.

## Availability Design

Availability keeps sparse storage. The app does not create unavailable rows for every empty slot. Instead, an empty slot is displayed and counted as unavailable. Users start in the available paint mode, then mark available or tentative slots. Selecting unavailable clears the slot back to the default unavailable state.

Group overview also treats missing responses as unavailable so raid leaders see realistic counts without a separate missing bucket.

## Raid Checklist Design

The checklist uses raid templates as the boss source. Each checked item records a character, raid template, and Lost Ark week start date. Lost Ark weeks use the existing Wednesday 06:00 KST reset helper.

Members can update their own characters. Leaders can update any character in their group. Everyone can view the current week's checklist state.

## Data Model

Add `CharacterRaidCheck` with `characterId`, `raidTemplateId`, `weekStartDate`, and `completedAt`. Rows exist only for completed checks. Unchecking deletes the row.

## UI

The members page shows a compact "이번 주 보스 체크" section in each character card, including progress and per-template toggle buttons.
