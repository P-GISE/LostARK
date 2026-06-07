# Weekly Boss Name Raid Check Design

## Goal

Limit the weekly character raid checklist so each character can complete only one template per boss name each Lost Ark week.

## Rule

All raid templates with the same trimmed `RaidTemplate.name` are one weekly boss bucket. A character can check exactly one template in that bucket for the current week. Selecting another difficulty or gate variant for the same boss replaces the previous check.

## Server Behavior

`setCharacterRaidCheck` remains the write boundary. When completing a template, it deletes existing checks for the same character, week, group, and template name before creating the selected check. Clearing a check only removes the selected template row.

## UI Behavior

The members page groups checklist templates by boss name. Progress counts completed boss buckets, not raw templates. Within each boss bucket, difficulty and gate variants remain visible as buttons so users can see which variant was completed and switch to another one.

## Testing

Server tests cover replacing one checked difficulty with another for the same boss while preserving different boss checks. Members page tests cover grouped progress and variant controls.
