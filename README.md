# CYOA

## Data files

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
- `id`: key where the answer is stored
- `text`: question prompt
- `answers`: array of selectable answers

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
