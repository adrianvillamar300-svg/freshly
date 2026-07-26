import base64
import json

import boto3

from app.config import settings


def get_bedrock_client():
    kwargs = {"region_name": settings.AWS_REGION}
    if settings.AWS_ACCESS_KEY_ID and settings.AWS_SECRET_ACCESS_KEY:
        kwargs["aws_access_key_id"] = settings.AWS_ACCESS_KEY_ID
        kwargs["aws_secret_access_key"] = settings.AWS_SECRET_ACCESS_KEY
    return boto3.client("bedrock-runtime", **kwargs)


def _invoke(body: dict) -> str:
    client = get_bedrock_client()
    response = client.invoke_model(
        modelId=settings.BEDROCK_MODEL_ID,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    response_body = json.loads(response["body"].read())
    text_parts = [
        block["text"] for block in response_body.get("content", []) if block.get("type") == "text"
    ]
    return "".join(text_parts)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Invoca a Claude en Amazon Bedrock (solo texto) y devuelve la respuesta."""
    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        body["system"] = system
    return _invoke(body)


def call_claude_vision(
    file_bytes: bytes, media_type: str, prompt: str, system: str = "", max_tokens: int = 1500
) -> str:
    """Invoca a Claude con una imagen o PDF adjunto (factura/recibo) y devuelve la respuesta."""
    b64_data = base64.b64encode(file_bytes).decode("utf-8")

    if media_type == "application/pdf":
        file_block = {
            "type": "document",
            "source": {"type": "base64", "media_type": media_type, "data": b64_data},
        }
    else:
        file_block = {
            "type": "image",
            "source": {"type": "base64", "media_type": media_type, "data": b64_data},
        }

    body = {
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": max_tokens,
        "messages": [
            {"role": "user", "content": [file_block, {"type": "text", "text": prompt}]}
        ],
    }
    if system:
        body["system"] = system
    return _invoke(body)
