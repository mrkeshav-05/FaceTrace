import aiohttp
import asyncio
from fastapi import UploadFile

# 60-second timeout for the external embedding API
EMBED_TIMEOUT = aiohttp.ClientTimeout(total=60)

async def generate_embeddings(image: UploadFile):
    """Generate embeddings for a face image using FaceNet."""
    try:
        image_bytes = await image.read()  # Read file content
        
        # Create multipart form data
        form = aiohttp.FormData()
        form.add_field("file", image_bytes, filename=image.filename, content_type=image.content_type)

        # Send request to embedding API with timeout
        async with aiohttp.ClientSession(timeout=EMBED_TIMEOUT) as session:
            async with session.post("https://VaibhavRVerma-absens.hf.space/api/embed", data=form) as resp:
                response = await resp.json()
                return response.get("embedding")  # Return embedding if available

    except asyncio.TimeoutError:
        print("Timeout generating embeddings: HuggingFace API did not respond within 60 seconds")
        return None
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return None
