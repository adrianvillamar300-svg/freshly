import json

from fastapi import HTTPException

from app.services.bedrock_service import call_claude
from app.services.ai_utils import extract_json

RECIPE_SYSTEM_PROMPT = """Eres un chef que sugiere recetas basadas en el inventario \
de alimentos que el usuario ya tiene en casa.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin backticks de markdown. \
El formato exacto es:

{"recipes": [{"title": "string", "ingredients": ["string", ...], "steps": ["string", ...], \
"missing_ingredients": ["string", ...]}]}

Reglas:
- Sugiere entre 2 y 3 recetas realistas y variadas, priorizando usar lo que el \
usuario YA tiene en su inventario.
- "ingredients": lista de ingredientes con cantidad aproximada necesaria para la \
receta (ej: "2 huevos", "1 taza de arroz"), sin importar si están o no en el \
inventario.
- "steps": pasos de preparación, claros, numerados en el propio texto (ej: \
"1. Pica la cebolla en cuadritos.").
- "missing_ingredients": SOLO los ingredientes que la receta necesita pero que el \
usuario NO tiene (o no tiene suficiente cantidad) según su inventario actual. Si no \
falta nada, deja la lista vacía [].
- Si el inventario está vacío o es muy limitado, sugiere recetas simples que \
requieran pocos ingredientes adicionales, e indícalos en missing_ingredients.
"""


def suggest_recipes(inventory_items: list[dict]) -> list[dict]:
    """Genera sugerencias de recetas a partir del inventario actual del usuario.
    inventory_items: lista de dicts con food_name, quantity, unit."""
    if not inventory_items:
        prompt = "El usuario no tiene ningún alimento registrado en su inventario todavía."
    else:
        lines = [f"- {i['quantity']} {i['unit']} de {i['food_name']}" for i in inventory_items]
        prompt = "Inventario actual del usuario:\n" + "\n".join(lines)

    try:
        raw_response = call_claude(prompt=prompt, system=RECIPE_SYSTEM_PROMPT, max_tokens=2000)
        data = extract_json(raw_response)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502, detail="No se pudo interpretar la respuesta de la IA"
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Error al conectar con el servicio de IA: {exc}"
        )

    recipes = data.get("recipes", [])
    if not recipes:
        raise HTTPException(
            status_code=422, detail="No se pudieron generar recetas con el inventario actual"
        )
    return recipes
