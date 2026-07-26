"""
Servicios de IA:
- Texto (voz, recetas): Groq con llama-3.1-8b-instant (gratis)
- Visión (fotos de facturas): Google Gemini 1.5 Flash (gratis)
"""
import base64
import logging
from groq import Groq
import google.generativeai as genai
from app.config import settings

logger = logging.getLogger(__name__)


def _get_groq() -> Groq:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY no está configurada")
    return Groq(api_key=settings.GROQ_API_KEY)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Texto con Groq (gratis)."""
    try:
        client = _get_groq()
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
        logger.info("Groq respondió correctamente")
        return result
    except Exception as e:
        logger.error(f"ERROR Groq: {type(e).__name__}: {e}")
        raise


def call_claude_vision(
    file_bytes: bytes, media_type: str, prompt: str, system: str = "", max_tokens: int = 1500
) -> str:
    """Visión con Google Gemini 1.5 Flash (gratis)."""
    try:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY no está configurada")

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_VISION_MODEL)

        # Construir el prompt completo con system + user
        full_prompt = f"{system}\n\n{prompt}" if system else prompt

        if media_type == "application/pdf":
            # Gemini soporta PDFs directamente
            part = {"mime_type": "application/pdf", "data": base64.b64encode(file_bytes).decode()}
        else:
            part = {"mime_type": media_type, "data": base64.b64encode(file_bytes).decode()}

        logger.info(f"Llamando a Gemini Vision modelo={settings.GEMINI_VISION_MODEL}")
        response = model.generate_content([full_prompt, part])
        result = response.text
        logger.info("Gemini Vision respondió correctamente")
        return result
    except Exception as e:
        logger.error(f"ERROR Gemini Vision: {type(e).__name__}: {e}")
        raise
