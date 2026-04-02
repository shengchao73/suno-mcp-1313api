# MCP-Suno

MCP (Model Context Protocol) server for Suno music generation API.

## Features

- **Generate Lyrics**: Create lyrics based on a description or theme
- **Generate Music**: Create custom songs with lyrics, style tags, and model selection
- **Automatic Polling**: Built-in polling mechanism for async task completion

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

3. Set up your API key by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Suno API key:

```
SUNO_API_KEY=your_actual_api_key_here
```

## Building

```bash
npm run build
```

## Running

```bash
npm start
```

Or for development:

```bash
npm run dev
```

## MCP Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "suno": {
      "type": "stdio",
      "command": "node",
      "args": ["E:\\xxx\\xxx\\xxx\\suno-mcp-1313api\\dist\\index.js"],
      "env": {
        "SUNO_API_KEY": "your_api_key_here"
      }
      "timeout": 600,
    }
  }
}
```

## Available Tools

### generate_lyrics

Generate lyrics based on a description or theme.

**Parameters:**
- `prompt` (required): Description or theme for lyrics (e.g., "dance", "love song", "epic battle")

**Returns:**
- `task_id`: The task ID for tracking
- `title`: Generated song title
- `lyrics`: Full lyrics text
- `status`: Task completion status

**Example:**
```json
{
  "prompt": "a romantic sunset song about two lovers meeting"
}
```

### generate_music

Generate music with custom lyrics.

**Parameters:**
- `prompt` (required): The lyrics for the song in Suno format (with [Verse], [Chorus], [Bridge] tags)
- `title` (required): Title of the song
- `tags` (optional): Music style tags (e.g., "pop, upbeat, female vocals", "rock, energetic")
- `mv` (optional): Model version (default: "chirp-v4")

**Returns:**
- `task_id`: The task ID for tracking
- `songs`: Array of generated songs with:
  - `id`: Song ID
  - `title`: Song title
  - `tags`: Style tags
  - `audio_url`: MP3 audio file URL
  - `video_url`: MP4 video file URL
  - `image_url`: Cover image URL
  - `image_large_url`: Large cover image URL
  - `duration`: Song duration in seconds
  - `model_name`: Model used
  - `status`: Generation status
  - `lyrics`: Full lyrics text

**Example:**
```json
{
  "prompt": "[Verse]\nWalking down the street\nFeeling the beat\nMusic in my soul\nTaking control\n\n[Chorus]\nThis is my song\nSinging all night long\nFeel the rhythm\nMoving along",
  "title": "My Song",
  "tags": "pop, upbeat, electronic",
  "mv": "chirp-v4"
}
```

## API Endpoints

This MCP server uses the following API endpoints:

- **Submit Lyrics**: `POST https://1313api.top/suno/submit/lyrics`
- **Submit Music**: `POST https://1313api.top/suno/submit/music`
- **Fetch Task**: `GET https://1313api.top/suno/fetch/{task_id}`

## Polling Behavior

The server automatically polls for task completion with the following settings:
- **Max Attempts**: 60
- **Polling Interval**: 3 seconds
- **Total Timeout**: ~3 minutes

Tasks are polled until they reach `SUCCESS` or `FAILED` status, or timeout is reached.

## Error Handling

The server returns error messages in the following format:

```json
{
  "error": "Error message description"
}
```

Common errors:
- `SUNO_API_KEY environment variable is not set`: API key not configured
- `Failed to submit lyrics generation`: API request failed
- `Task failed`: Generation failed on the server
- `Task timeout`: Generation took too long

## License

MIT
