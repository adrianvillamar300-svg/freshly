from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Base de datos
    DATABASE_URL: str = "postgresql://user:password@localhost:5432/freshly"

    # JWT
    JWT_SECRET: str = "change-this-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 días

    # Cloudinary (fotos de perfil / facturas)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # AWS Bedrock (IA: voz, facturas, recetas)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    BEDROCK_MODEL_ID: str = "anthropic.claude-3-5-sonnet-20241022-v2:0"

    # CORS - dominio(s) del frontend desplegado
    # Puedes poner múltiples separados por coma:
    # FRONTEND_URL=https://freshly.up.railway.app,https://mifrontend.up.railway.app
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def allowed_origins(self) -> list[str]:
        base = [
            "http://localhost:5173",
            "http://localhost:3000",
        ]
        for url in self.FRONTEND_URL.split(","):
            url = url.strip()
            if url and url not in base:
                base.append(url)
        return base

    class Config:
        env_file = ".env"


settings = Settings()
