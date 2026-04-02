import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
const API_BASE_URL = 'https://1313api.top';
const server = new Server({
    name: 'mcp-suno',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function fetchWithAuth(url, options = {}) {
    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
        throw new Error('SUNO_API_KEY environment variable is not set');
    }
    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    return fetch(url, {
        ...options,
        headers,
    });
}
async function pollTask(taskId, maxAttempts = 60, interval = 3000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const response = await fetchWithAuth(`${API_BASE_URL}/suno/fetch/${taskId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch task: ${response.statusText}`);
        }
        const result = await response.json();
        if (result.code !== 'success') {
            throw new Error(`Task failed: ${result.message || 'Unknown error'}`);
        }
        const taskData = result.data;
        if (taskData.status === 'SUCCESS') {
            return taskData.data;
        }
        if (taskData.status === 'FAILED') {
            throw new Error(`Task failed: ${taskData.fail_reason || 'Unknown error'}`);
        }
        await sleep(interval);
    }
    throw new Error('Task timeout: exceeded maximum polling attempts');
}
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'generate_lyrics',
                description: 'Generate lyrics based on a description or theme. Returns the generated lyrics with title.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        prompt: {
                            type: 'string',
                            description: 'Description or theme for the lyrics (e.g., "dance", "love song", "epic battle")',
                        },
                    },
                    required: ['prompt'],
                },
            },
            {
        name: 'generate_music',
        description: '生成自定义音乐。返回生成的歌曲,包含音频URL、视频URL和封面图片。纯音乐模式下prompt留空,make_instrumental为true',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: {
              type: 'string',
              description: '音乐创歌词。纯音乐模式下留空。如果是歌词格式必须是Suno格式（包含[Verse]、[Chorus]、[Bridge]标签）',
            },
            title: {
              type: 'string',
              description: '歌曲标题',
            },
            tags: {
              type: 'string',
              description: '音乐风格标签 (例如: "pop, upbeat, female vocals", "rock, energetic")',
            },
            make_instrumental: {
              type: 'boolean',
              description: '是否生成纯音乐，不包含任何乐器声音。true表示生成纯音乐，false表示生成包含演唱的音乐。',
              default: false,
            },
            gpt_description_prompt: {
              type: 'string',
              description: '是否使用GPT生成音乐描述。#灵感模式专用#,只要是灵感模式都用无论是否生成纯音乐',
            },
            mv: {
              type: 'string',
              description: '模型版本 (默认: "chirp-v4",可选: "chirp-v4", "chirp-auk","chirp-bluejay","chirp-crow")',
              default: 'chirp-v4',
            },
          },
          required: ['title', 'tags'],
        },
      },
        ],
    };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === 'generate_lyrics') {
            const { prompt } = args;
            const response = await fetchWithAuth(`${API_BASE_URL}/suno/submit/lyrics`, {
                method: 'POST',
                body: JSON.stringify({ prompt }),
            });
            if (!response.ok) {
                throw new Error(`Failed to submit lyrics generation: ${response.statusText}`);
            }
            const submitResult = await response.json();
            if (submitResult.code !== 'success') {
                throw new Error(`Failed to submit lyrics: ${submitResult.message || 'Unknown error'}`);
            }
            const taskId = submitResult.data;
            const lyricsData = await pollTask(taskId);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            task_id: taskId,
                            title: lyricsData.title,
                            lyrics: lyricsData.text,
                            status: lyricsData.status,
                        }, null, 2),
                    },
                ],
            };
        }
        if (name === 'generate_music') {
            {
                const { prompt, title, tags, mv = 'chirp-v4' } = args;
                const requestBody = {
                    prompt,
                    title,
                    mv,
                };
                if (tags) {
                    requestBody.tags = tags;
                }
                const response = await fetchWithAuth(`${API_BASE_URL}/suno/submit/music`, {
                    method: 'POST',
                    body: JSON.stringify(requestBody),
                });
                if (!response.ok) {
                    throw new Error(`Failed to submit music generation: ${response.statusText}`);
                }
                const submitResult = await response.json();
                let taskId;
                if (submitResult.code === 'success' && typeof submitResult.data === 'string') {
                    taskId = submitResult.data;
                }
                else if (submitResult.data && typeof submitResult.data.task_id === 'string') {
                    taskId = submitResult.data.task_id;
                }
                else if (typeof submitResult.id === 'string') {
                    taskId = submitResult.id;
                }
                else {
                    throw new Error(`Could not find task ID in response: ${JSON.stringify(submitResult)}`);
                }
                const musicData = await pollTask(taskId);
                const songs = Array.isArray(musicData) ? musicData : [musicData];
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                task_id: taskId,
                                songs: songs.map((song) => ({
                                    id: song.id,
                                    title: song.title,
                                    tags: song.tags,
                                    audio_url: song.audio_url,
                                    video_url: song.video_url,
                                    image_url: song.image_url,
                                    image_large_url: song.image_large_url,
                                    duration: song.duration,
                                    model_name: song.model_name,
                                    status: song.status,
                                    lyrics: song.prompt,
                                })),
                            }, null, 2),
                        },
                    ],
                };
            }
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        error: error instanceof Error ? error.message : 'Unknown error occurred',
                    }),
                },
            ],
            isError: true,
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP Suno server running on stdio');
}
main().catch(console.error);
//# sourceMappingURL=index.js.map