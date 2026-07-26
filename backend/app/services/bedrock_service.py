"""
Servicio de IA usando la API oficial de Anthropic (claude-haiku-4-5).
"""
import base64
import logging
import anthropic
from app.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> anthropic.Anthropic:
    if not settings.ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY no está configurada en las variables de entorno")
    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Llama a Claude con un prompt de texto y devuelve la respuesta."""
    try:
        client = _get_client()
        kwargs = {
            "model": settings.CLAUDE_MODEL,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": prompt}],
        }
        if system:
            kwargs["system"] = system
        logger.info(f"Llamando a Claude modelo={settings.CLAUDE_MODEL}")
        response = client.messages.create(**kwargs)
        logger.info("Respuesta de Claude recibida correctamente")
        return response.content[0].text
    except Exception as e:
        logger.error(f"ERROR al llamar a Claude: {type(e).__name__}: {e}")
        raise


def call_claude_vision(
    file_bytes: bytes, media_type: str, prompt: str, system: str = "", max_tokens: int = 1500
) -> str:
    """Llama a Claude con una imagen o PDF adjunto (para procesar facturas)."""
    try:
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

        logger.info(f"Llamando a Claude Vision modelo={settings.CLAUDE_MODEL}")
        response = client.messages.create(**kwargs)
        logger.info("Respuesta de Claude Vision recibida correctamente")
        return response.content[0].text
    except Exception as e:
        logger.error(f"ERROR al llamar a Claude Vision: {type(e).__name__}: {e}")
        raise
