"""
Servicio de IA usando Groq (gratuito).
Modelos: llama-3.1-8b-instant (texto) y llama-3.2-11b-vision-preview (imágenes).
"""
import base64
import logging
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> Groq:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY no está configurada en las variables de entorno")
    return Groq(api_key=settings.GROQ_API_KEY)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Llama al modelo de texto de Groq y devuelve la respuesta."""
    try:
        client = _get_client()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        logger.info(f"Llamando a Groq modelo={settings.GROQ_MODEL}")
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )
        result = response.choices[0].message.content
        logger.info("Respuesta de Groq recibida correctamente")
        return result
    except Exception as e:
        logger.error(f"ERROR al llamar a Groq: {type(e).__name__}: {e}")
        raise


def call_claude_vision(
    file_bytes: bytes, media_type: str, prompt: str, system: str = "", max_tokens: int = 1500
) -> str:
    """Llama al modelo de visión de Groq con una imagen y devuelve la respuesta."""
    try:
        client = _get_client()
        b64_data = base64.b64encode(file_bytes).decode("utf-8")

        # Groq visión solo soporta imágenes (no PDF), convertimos el media_type
        if media_type == "application/pdf":
            # Para PDFs no soportados, devolvemos vacío y el parser manejará el error
            logger.warning("PDF no soportado en Groq Vision, retornando vacío")
            return '{"items": []}'

        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{media_type};base64,{b64_data}"
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
        })

        logger.info(f"Llamando a Groq Vision modelo={settings.GROQ_VISION_MODEL}")
        response = client.chat.completions.create(
            model=settings.GROQ_VISION_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )
        result = response.choices[0].message.content
        logger.info("Respuesta de Groq Vision recibida correctamente")
        return result
    except Exception as e:
        logger.error(f"ERROR al llamar a Groq Vision: {type(e).__name__}: {e}")
        raise
