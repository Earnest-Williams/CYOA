# CYOA

An experimental **choose your own adventure** engine for the browser. The game is
completely data‑driven – story content, player preferences and world state are
expressed as JSON that is loaded at runtime.

## Themes

The interface supports multiple color themes that can be selected from the
dropdown in the UI:

- **Dark** (default)
- **Moss**
- **Autumn**

If no theme has been chosen, the dark theme is applied automatically.

## Stats

Player state is tracked through a simple stats object. Typical fields include
health, stamina and any custom attributes your story requires. Stats are stored
in memory and updated as the player makes choices. Authoring a node can specify
stat checks or stat changes:

- `requires`: minimum stat values needed to access a choice.
- `effects`: stat adjustments applied after a choice is made.

These mechanics allow branching paths based on the character's development.

## Inventory

The engine also supports an inventory for items discovered during the story.
Items are represented as strings and stored in an array on the player object.
Choices can grant or remove items, and future nodes may check for their
presence with `requires` clauses just like stats. The inventory enables puzzle
solving and resource management within narrative flows.

## Procedural Generation

To keep adventures fresh, portions of the story can be procedurally generated.
Random seeds derived from the player's answers feed into helper functions that
create encounters, item drops and other dynamic events. Designers can specify
lists of possibilities in JSON; the engine selects from these lists or
constructs objects on the fly. Procedural content ensures that no two play
sessions are exactly the same.

## Template Structures

Narrative nodes and questions are defined as templates using Handlebars‑style
placeholders. During play, placeholders are replaced with values gathered from
player input and game state.

### `questions.json`

Contains an array of questions used to gather player preferences.

```json
{
  "questions": [
    {
      "id": "genre",
      "text": "Preferred genre?",
      "answers": ["Fantasy", "Sci-Fi", "Mystery"]
    }
  ]
}
```

Each question object includes:

- `id`: key where the answer is stored.
- `text`: question prompt.
- `answers`: array of selectable answers.

### `stories.json`

Maps story length to a set of story nodes.

```
{
  "Short": {
    "start": {
      "text": "You enter a {{tone}} {{genre}} world...",
      "choices": [{ "text": "Go left", "next": "left" }]
    }
  }
}
```

Each node contains:

- `text`: narrative text. `{{tone}}` and `{{genre}}` placeholders are replaced
  with the player's selections (in lowercase).
- `choices`: array of objects with `text` and `next` fields. An empty array
  denotes an ending.

Template substitution combined with stats, inventory and procedural generation
provides a flexible foundation for building rich interactive fiction.
