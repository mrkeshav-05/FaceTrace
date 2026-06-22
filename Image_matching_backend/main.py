from fastapi import FastAPI, Form, UploadFile
from typing import List
import uvicorn
import numpy as np
from fastapi.middleware.cors import CORSMiddleware
from embedder import generate_embeddings
import uuid
from dotenv import load_dotenv
import os
from pinecone import Pinecone, ServerlessSpec
import requests
import aiohttp
import asyncio
from io import BytesIO

# Initialize Pinecone
load_dotenv()
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

# Check if index exists, else create it
index_name = "face-recognition"
if index_name not in pc.list_indexes().names():
    pc.create_index(
        name=index_name,
        dimension=512,  # FaceNet embeddings have 512 dimensions
        metric="cosine",
        spec=ServerlessSpec(
            cloud="aws",
            region="us-east-1"
        )
    )

# Connect to the index
index = pc.Index(index_name)

app = FastAPI(root_path="/api")

# allow cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

# Function to check allowed file types
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

async def process_single_image(user_id: str, url: str, session: aiohttp.ClientSession):
    try:
        async with session.get(url, timeout=30) as response:
            response.raise_for_status()
            content = await response.read()

        image_filename = f"{user_id}_{uuid.uuid4()}.jpg"
        upload_file = UploadFile(filename=image_filename, file=BytesIO(content))

        embedding = await generate_embeddings(upload_file)
        return embedding
    except Exception as e:
        print(f"Error processing image from URL {url}: {e}")
        return None

async def process_images(user_id: str, image_urls: List[str]):
    """Common function to process images and generate embeddings in parallel"""
    async with aiohttp.ClientSession() as session:
        tasks = [process_single_image(user_id, url, session) for url in image_urls]
        results = await asyncio.gather(*tasks)

    # Filter out None values
    embeddings = [r for r in results if r is not None]

    if not embeddings:
        return None

    final_embedding = np.mean(embeddings, axis=0)
    return [float(x) for x in final_embedding]

async def search_embeddings(vector, namespace: str, reporter_id: str = None, threshold: float = 0.7):
    """Common function to search embeddings in Pinecone"""
    try:
        query_response = index.query(vector=vector, top_k=10, namespace=namespace, include_metadata=True)
        matches = query_response["matches"]

        # Filter out matches from the same user if reporter_id is provided
        if reporter_id:
            filtered_matches = []
            for match in matches:
                match_metadata = match.get("metadata", {})
                match_reporter_id = match_metadata.get("reporter_id")

                # Only include matches where reporter_id is different or not present
                if not match_reporter_id or match_reporter_id != reporter_id:
                    filtered_matches.append(match)

            matches = filtered_matches

        # Filter matches based on threshold
        matches = [match for match in matches if float(match["score"]) >= threshold]

        # Limit to top 3 matches
        matches = matches[:3]

        if matches and len(matches) > 0:
            match_data = [{
                "id": match["id"],
                "score": float(match["score"]),
                "metadata": match.get("metadata", {})
            } for match in matches]
            return {
                "success": True,
                "message": "User found",
                "match": match_data
            }
        return {"message": "No matches found", "success": False}

    except Exception as e:
        print(f"Error searching embedding: {e}")
        return {"error": str(e)}

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.post("/save-find-missing")
async def save_find_missing(user_id: str = Form(...), image_urls: List[str] = Form(...), reporter_id: str = Form(None)):
    """Stores image of person in find namespace"""
    final_embedding_list = await process_images(user_id, image_urls)
    if not final_embedding_list:
        return {"error": "No valid faces detected in any of the provided images"}

    # Include reporter_id in metadata if provided
    metadata = {"reporter_id": reporter_id} if reporter_id else {}

    index.upsert([(user_id, final_embedding_list, metadata)], namespace="find")
    return {"success": True, "message": "Finding person embeddings saved successfully"}

@app.post("/save-report-missing")
async def save_report_missing(user_id: str = Form(...), image_urls: List[str] = Form(...), reporter_id: str = Form(None)):
    """Stores image of person in report namespace"""
    final_embedding_list = await process_images(user_id, image_urls)
    if not final_embedding_list:
        return {"error": "No valid faces detected in any of the provided images"}

    # Include reporter_id in metadata if provided
    metadata = {"reporter_id": reporter_id} if reporter_id else {}

    index.upsert([(user_id, final_embedding_list, metadata)], namespace="report")
    return {"success": True, "message": "Report missing person embeddings saved successfully"}

@app.post("/search-find-missing")
async def search_find_missing(user_id: str = Form(...), image_urls: List[str] = Form(...), reporter_id: str = Form(None), threshold: float = Form(0.7)):
    """Search for person in report namespace"""
    # Ensure threshold is at least 0.5 (50%)
    threshold = max(0.5, threshold)

    final_embedding_list = await process_images(user_id, image_urls)
    if not final_embedding_list:
        return {"error": "No valid faces detected in any of the provided images"}

    return await search_embeddings(final_embedding_list, "report", reporter_id, threshold)

@app.post("/search-report-missing")
async def search_report_missing(user_id: str = Form(...), image_urls: List[str] = Form(...), reporter_id: str = Form(None), threshold: float = Form(0.7)):
    """Search for person in find namespace"""
    # Ensure threshold is at least 0.5 (50%)
    threshold = max(0.5, threshold)

    final_embedding_list = await process_images(user_id, image_urls)
    if not final_embedding_list:
        return {"error": "No valid faces detected in any of the provided images"}

    return await search_embeddings(final_embedding_list, "find", reporter_id, threshold)

@app.get("/list-embeddings")
async def list_embeddings():
    """Lists all embeddings stored in the index."""
    try:
        print("Listing embeddings")
        reported_stats = index.describe_index_stats()
        namespaces = reported_stats.namespaces

        vector_counts = {
            "reported": namespaces.get("reported", {}).get("vector_count", 0),
            "unconfirmed": namespaces.get("unconfirmed", {}).get("vector_count", 0)
        }

        return {
            "total_vectors": sum(vector_counts.values()),
            "vectors_by_namespace": vector_counts,
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)