"""
Servicios de IA:
- Texto (voz, recetas): Groq llama-3.1-8b-instant (gratis)
- Visión (fotos): OpenRouter google/gemini-flash-1.5 (gratis con $1 crédito inicial)
"""
import base64
import logging
import httpx
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


def _get_groq() -> Groq:
    if not settings.GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY no está configurada")
    return Groq(api_key=settings.GROQ_API_KEY)


def call_claude(prompt: str, system: str = "", max_tokens: int = 1024) -> str:
    """Texto con Groq."""
    try:
        client = _get_groq()
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        logger.info(f"Groq texto modelo={settings.GROQ_MODEL}")
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
    """Visión con OpenRouter (gemini-flash gratis)."""
    try:
        if not settings.OPENROUTER_API_KEY:
            raise ValueError("OPENROUTER_API_KEY no está configurada")

        b64_data = base64.b64encode(file_bytes).decode("utf-8")

        messages = []
        if system:
            messages.append({"role": "system", "content": system})

        if media_type == "application/pdf":
            # PDFs: mandamos solo texto
            messages.append({"role": "user", "content": prompt + "\n\nNota: se subió un PDF, responde con lista vacía: {\"items\": []}"})
        else:
            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{b64_data}"
                        }
                    },
                    {"type": "text", "text": prompt}
                ]
            })

        logger.info("OpenRouter visión modelo=google/gemini-flash-1.5")
        resp = httpx.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://freshly.app",
                "X-Title": "Freshly",
                "Content-Type": "application/json",
            },
            json={
                "model": "openrouter/free",
                "messages": messages,
                "max_tokens": max_tokens,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        result = resp.json()["choices"][0]["message"]["content"]
        logger.info("OpenRouter visión OK")
        return result
    except Exception as e:
        logger.error(f"ERROR OpenRouter visión: {type(e).__name__}: {e}")
        raise
