"""
Servicio de IA usando la API oficial de Anthropic (claude-haiku-4-5).
Reemplaza la integración con AWS Bedrock — más simple y más económico.
"""
import base64
import anthropic
from app.config import settings


def _get_client() -> anthropic.Anthropic:
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Llama a Claude con un prompt de texto y devuelve la respuesta."""
    client = _get_client()
    kwargs = {
        "model": settings.CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        kwargs["system"] = system
    response = client.messages.create(**kwargs)
    return response.content[0].text


def call_claude_vision(
    file_bytes: bytes, media_type: str, prompt: str, system: str = "", max_tokens: int = 1500
) -> str:
    """Llama a Claude con una imagen o PDF adjunto (para procesar facturas)."""
    client = _get_client()
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

    kwargs = {
        "model": settings.CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "user", "content": [file_block, {"type": "text", "text": prompt}]}
        ],
    }
    if system:
        kwargs["system"] = system

    response = client.messages.create(**kwargs)
    return response.content[0].text
