# Schemaflow

Schemaflow is a visual schema editor for designing relational data models on an interactive canvas.

You can:
- Create and arrange models visually
- Add/edit fields and data types
- Define relationships between fields
- Work with multiple views (tabs)
- Import JSON into the current view
- Export the current view or multiple views as JSON
- Share selected views with a compressed URL

## Local Development

Requirements:
- Node.js 20+ (recommended)
- npm

Install and run:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Sample Sessions

Schemaflow supports hardcoded sample sessions via URL query params.

- Single sample: `/?sample=audiobookshelf`
- Multiple samples (comma-separated): `/?sample=audiobookshelf,grimmory`
- Multiple samples (repeated params): `/?sample=audiobookshelf&sample=storyteller`
- Minified books-focused sample: `/?sample=audiobookshelf-minified`
- Multiple minified samples: `/?sample=audiobookshelf-minified,grimmory-minified,storyteller-minified`

When a sample URL is loaded:
- The current saved session is cleared
- Sample views are loaded as tabs
- The URL is cleaned back to `/`

Available keys include:
- Full: `audiobookshelf`, `grimmory`, `storyteller`
- Minified (books + metadata/progress focused): `audiobookshelf-minified`, `grimmory-minified`, `storyteller-minified`

Sample mappings are defined in [`lib/sample-sessions.ts`](/Users/zachyale/dev/github.com/zachyale/schemaflow/lib/sample-sessions.ts), and JSON payloads live in `public/samples`.

## JSON Formats

Schemaflow currently uses two JSON shapes depending on action:

1. Import into current view: expects a single `Schema` object.
2. Export/share selected views: returns an array of `{ name, schema }`.

### Import JSON (single schema)

Use this in the Import dialog to replace the active view:

```json
{
  "models": [
    {
      "id": "user",
      "name": "User",
      "position": { "x": 120, "y": 80 },
      "fields": [
        { "id": "user-id", "name": "id", "type": "uuid", "primaryKey": true },
        { "id": "user-email", "name": "email", "type": "string", "unique": true },
        { "id": "user-name", "name": "name", "type": "string", "nullable": true }
      ]
    },
    {
      "id": "post",
      "name": "Post",
      "position": { "x": 520, "y": 80 },
      "fields": [
        { "id": "post-id", "name": "id", "type": "uuid", "primaryKey": true },
        { "id": "post-title", "name": "title", "type": "string" },
        { "id": "post-user-id", "name": "userId", "type": "uuid", "foreignKey": true }
      ]
    }
  ],
  "relationships": [
    {
      "id": "rel-post-user",
      "fromModelId": "post",
      "fromFieldId": "post-user-id",
      "toModelId": "user",
      "toFieldId": "user-id",
      "type": "many-to-one"
    }
  ]
}
```

### Export JSON (multiple views)

This is the shape used when exporting selected views:

```json
[
  {
    "name": "Core",
    "schema": {
      "models": [
        {
          "id": "user",
          "name": "User",
          "position": { "x": 120, "y": 80 },
          "fields": [
            { "id": "user-id", "name": "id", "type": "uuid", "primaryKey": true }
          ]
        }
      ],
      "relationships": []
    }
  },
  {
    "name": "Billing",
    "schema": {
      "models": [
        {
          "id": "invoice",
          "name": "Invoice",
          "position": { "x": 160, "y": 120 },
          "fields": [
            { "id": "invoice-id", "name": "id", "type": "uuid", "primaryKey": true },
            { "id": "invoice-user-id", "name": "userId", "type": "uuid", "foreignKey": true }
          ]
        }
      ],
      "relationships": []
    }
  }
]
```

## Notes

- Session state is persisted in browser storage under `schemaflow-session`.
- Import validation expects `models` and `relationships` arrays.
- Share links are URL-compressed and may exceed practical browser limits for large schemas.
