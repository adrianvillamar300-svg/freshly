"""
Servicios de IA — todo con Groq (gratis):
- Texto (voz, recetas): llama-3.1-8b-instant
- Visión (fotos): openai/gpt-oss-120b (soporta imágenes)
"""
import base64
import logging
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


def _get_groq() -> Groq:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY no está configurada")
    return Groq(api_key=settings.GROQ_API_KEY)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Texto con Groq llama-3.1-8b-instant."""
    try:
        client = _get_groq()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        logger.info(f"Llamando a Groq texto modelo={settings.GROQ_MODEL}")
        response = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )
        result = response.choices[0].message.content
        logger.info("Groq texto OK")
        return result
    except Exception as e:
        logger.error(f"ERROR Groq texto: {type(e).__name__}: {e}")
        raise


def call_claude_vision(
    file_bytes: bytes, media_type: str, prompt: str, system: str = "", max_tokens: int = 1500
) -> str:
    """Visión con Groq openai/gpt-oss-120b (soporta imágenes)."""
    try:
        if media_type == "application/pdf":
            # PDFs no soportados por visión — extraemos texto del nombre
            logger.warning("PDF recibido, procesando como texto sin imagen")
            return call_claude(
                prompt="El usuario subió un PDF de factura pero no se puede procesar como imagen. Responde: {\"items\": []}",
                system=system,
                max_tokens=max_tokens
            )

        client = _get_groq()
        b64_data = base64.b64encode(file_bytes).decode("utf-8")

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

        logger.info("Llamando a Groq visión modelo=openai/gpt-oss-120b")
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.1,
        )
        result = response.choices[0].message.content
        logger.info("Groq visión OK")
        return result
    except Exception as e:
        logger.error(f"ERROR Groq visión: {type(e).__name__}: {e}")
        raise
