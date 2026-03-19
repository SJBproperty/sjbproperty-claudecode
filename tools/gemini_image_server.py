#!/usr/bin/env python3
"""
SJB Property Group — Google AI Studio Image Generation MCP Server
Uses google-genai (Gemini 3.1 Flash / Nano Banana 2) to generate images as a tool for Claude Code.
"""

import asyncio
import base64
import os
from datetime import datetime
from pathlib import Path

from google import genai
from google.genai import types
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

API_KEY = os.environ.get("GEMINI_API_KEY", "")
OUTPUT_DIR = Path(os.environ.get("IMAGE_OUTPUT_DIR", str(Path.home() / "sjb_images")))

server = Server("gemini-image-gen")


@server.list_tools()
async def list_tools():
    return [
        Tool(
            name="generate_image",
            description=(
                "Generate an image using Google AI Studio Gemini 3.1 Flash. "
                "Use for social media graphics, property visuals, and branded "
                "content for SJB Property Group."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Detailed description of the image to generate."
                    },
                    "filename": {
                        "type": "string",
                        "description": "Optional filename prefix (no extension). Auto-generated if omitted."
                    },
                    "number_of_images": {
                        "type": "integer",
                        "description": "Number of variations to generate (1–4). Default: 1.",
                        "default": 1,
                        "minimum": 1,
                        "maximum": 4
                    }
                },
                "required": ["prompt"]
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name != "generate_image":
        raise ValueError(f"Unknown tool: {name}")

    if not API_KEY:
        return [TextContent(type="text", text="Error: GEMINI_API_KEY environment variable is not set.")]

    prompt = arguments["prompt"]
    num_images = min(max(int(arguments.get("number_of_images", 1)), 1), 4)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename_prefix = arguments.get("filename", f"sjb_{timestamp}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    try:
        client = genai.Client(api_key=API_KEY)

        saved_paths = []
        for i in range(num_images):
            response = client.models.generate_content(
                model="gemini-3.1-flash-image-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    temperature=1.0,
                )
            )

            image_saved = False
            if response.candidates:
                for part in response.candidates[0].content.parts:
                    if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                        suffix = f"_{i + 1}" if num_images > 1 else ""
                        filepath = OUTPUT_DIR / f"{filename_prefix}{suffix}.png"
                        image_bytes = part.inline_data.data
                        if isinstance(image_bytes, str):
                            image_bytes = base64.b64decode(image_bytes)
                        filepath.write_bytes(image_bytes)
                        saved_paths.append(str(filepath))
                        image_saved = True
                        break

            if not image_saved:
                text_parts = []
                if response.candidates:
                    for part in response.candidates[0].content.parts:
                        if part.text:
                            text_parts.append(part.text)
                debug_info = " | ".join(text_parts) if text_parts else "No image or text in response"
                return [TextContent(type="text", text=f"Error: Model did not return an image. Response: {debug_info}")]

        paths_str = "\n".join(f"  - {p}" for p in saved_paths)
        return [TextContent(
            type="text",
            text=f"Generated {len(saved_paths)} image(s) successfully:\n{paths_str}"
        )]

    except Exception as e:
        return [TextContent(type="text", text=f"Error generating image: {str(e)}")]


async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
