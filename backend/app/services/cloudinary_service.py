import cloudinary
import cloudinary.uploader

from app.config import settings


def _is_configured() -> bool:
    return bool(settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY)


def _configure():
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )


def upload_file(file_bytes: bytes, folder: str = "freshly/receipts") -> str | None:
    """Sube un archivo (imagen o PDF) a Cloudinary y devuelve su URL segura.
    Si Cloudinary no está configurado (variables de entorno vacías), devuelve
    None silenciosamente en lugar de fallar, para no bloquear el flujo principal."""
    if not _is_configured():
        return None

    _configure()
    result = cloudinary.uploader.upload(file_bytes, folder=folder, resource_type="auto")
    return result.get("secure_url")
