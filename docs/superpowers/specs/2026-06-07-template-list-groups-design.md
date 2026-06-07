# Template List Groups Design

## Goal

Make the raid template list easier to scan by grouping templates with the same boss name into collapsible sections.

## Design

The templates page keeps its current server component structure. After loading and sorting templates, the page groups them by `template.name`. Each boss group renders as an open `<details>` section by default so the page remains immediately readable, while still allowing users to collapse bosses they are not editing.

Inside a boss group, each template row keeps the existing difficulty badges, gate badge, slot count, and delete action. The boss name is shown only in the group header, reducing repeated text for bosses with normal, hard, stage, or extreme variants.

## Behavior

- Empty state remains unchanged.
- Non-leader state remains unchanged.
- Schedule creation template selection remains unchanged.
- Deleting a template still acts on the exact template row.
- Accessibility labels remain available for each concrete template and each boss group.

## Testing

Add a TemplatesPage regression test that provides two templates for the same boss and verifies they render inside one labeled boss group, with the boss name visible once and each template still addressable by its full label.
