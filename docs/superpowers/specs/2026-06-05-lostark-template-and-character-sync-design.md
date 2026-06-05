# Lost Ark Template And Character Sync Design

## Goal

Update raid template presets for the current Lost Ark raid set, and add Lostark OpenAPI character sync so members can register one main character and import the other characters from the same account.

## User Identity

Signup keeps a required display name, but the label changes from a personal/legal-name implication to an internal raid-group identity:

- UI label: "공대 확인용 이름"
- Purpose: help the group identify the person behind a login account
- Display priority in raid workflows: member nickname and character name first, display name only where account identity matters

No legal-name validation is added. The value remains a normal account display name.

## Lostark OpenAPI Integration

The app stores one server-side API token in `LOSTARK_OPEN_API_JWT`. The token is never sent to the browser.

Server functions call the official Lostark OpenAPI:

- `GET /characters/{characterName}/siblings` to fetch all character profiles for the same account
- `GET /armories/characters/{characterName}/profiles` to fetch details for each character, including combat power

The API client normalizes:

- character name
- server name
- class name
- item average level
- combat power

Item level and combat power arrive as formatted strings, so the app stores parsed numeric values for sorting and keeps display formatting in the UI.

Sources:

- https://developer-lostark.game.onstove.com/changelog
- https://developer-lostark.game.onstove.com/usage-guide

## Character Data Model

Extend `Character` with:

- `itemLevel Float`
- `serverName String @default("")`
- `combatPower Int?`
- `isMain Boolean @default(false)`
- `lastSyncedAt DateTime?`

Existing manually-created characters remain valid. `itemLevel` changes from integer to float so imported values like `1773.33` are preserved. `serverName` defaults to empty and `combatPower` can be null for characters not imported through the API.

Character ownership stays unchanged: a character belongs to one `Member`.

## Sync Flow

A logged-in member enters a main character name from the Members page.

The server:

1. Fetches sibling characters for that main character.
2. Uses the main character's server as the default server filter.
3. Imports or updates only characters on that server.
4. Fetches each imported character profile to get combat power and normalized profile data.
5. Marks the submitted character as `isMain = true`.
6. Marks the member's other characters as `isMain = false`.
7. Revalidates the Members page.

If a character already exists for the member, it is updated by character name and server. If not, it is created.

The API sync does not delete local characters. This prevents accidental data loss if the API is temporarily incomplete or a character moves server.

## Members UI

The Members page gains a compact "본캐로 캐릭터 불러오기" form above the manual character form.

The character list shows:

- main character badge
- character name
- class
- server
- item level
- combat power
- preferred role
- notes

Default sorting:

1. main character first
2. item level descending
3. combat power descending
4. character name ascending

Manual add/edit/delete remains available for corrections and non-API cases.

## Raid Template Presets

Default presets are corrected around current top-level content:

- 지평의 성당: 4 players, 2 gates, 1단계/2단계/3단계
- 그림자 레이드: 고통의 마녀 세르카: 4 players, 2 gates, 노말/하드/나이트메어
- 카제로스 서막: 붉어진 백야의 나선: 8 players, 2 gates, 노말/하드
- 카제로스 1막: 대지를 부수는 업화의 궤적: 8 players, 2 gates, 노말/하드
- 카제로스 2막: 부유하는 악몽의 진혼곡: 8 players, 2 gates, 노말/하드
- 카제로스 2막: 아브렐슈드 익스트림: 8 players, 1 gate, 노말/하드/나이트메어
- 카제로스 3막: 칠흑, 폭풍의 밤: 8 players, 3 gates, 노말/하드
- 카제로스 4막: 파멸의 성채: 8 players, 2 gates, 노말/하드
- 카제로스 종막: 최후의 날: 8 players, 2 gates, 노말/하드
- 베히모스: 16 players, 2 gates, 노말
- 카멘: 8 players, 노말 1-3 and 하드 1-4
- 상아탑: 4 players, 3 gates, 노말/하드
- 카양겔: 4 players, 3 gates, 노말/하드

Default slot composition stays simple:

- 4 players: 3 DPS, 1 support
- 8 players: 6 DPS, 2 supports
- 16 players: 12 DPS, 4 supports

The import function keeps its existing duplicate protection by template name, difficulty, and gates.

## Error Handling

The app reports clear Korean messages for:

- missing `LOSTARK_OPEN_API_JWT`
- official API unauthorized response
- official API rate limit
- character not found
- empty sibling list
- malformed item level or combat power
- temporary official API outage

API failures never modify local character data.

## Testing

Tests cover:

- API client sends bearer authorization and parses sibling/profile responses
- character sync imports same-server characters and ignores other-server characters
- sync updates existing local characters instead of duplicating them
- sync marks one main character and clears prior main flags
- character list sorting uses main, item level, combat power, name
- template presets include the corrected raids and expected slot counts
- missing API key and API failure paths throw Korean errors

## Implementation Notes

Use TDD for server behavior first. UI tests can validate labels, imported character fields, and sorting display after the server contract is stable.

No public user lookup API is added in this change. All Lostark API calls run on the server using the current member session.
