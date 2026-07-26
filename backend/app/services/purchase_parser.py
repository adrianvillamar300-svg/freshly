import json

from fastapi import HTTPException

from app.services.bedrock_service import call_claude, call_claude_vision
from app.services.ai_utils import extract_json

SYSTEM_PROMPT = """Eres un asistente que extrae información estructurada de compras \
de alimentos a partir de texto en español, dictado de forma casual por el usuario \
(por ejemplo, transcrito de un mensaje de voz).

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin explicaciones, \
sin backticks de markdown. El formato exacto es:

{"items": [{"food_name": "string", "quantity": number, "unit": "string", "price": number}]}

Reglas:
- "food_name": nombre del alimento en singular y con la primera letra en mayúscula \
(ej: "Papa", "Huevo", "Arroz", "Leche").
- "quantity": la cantidad numérica mencionada. Si dice "una cubeta de 30 huevos", \
quantity=30, unit="unidad", food_name="Huevo" (no "cubeta").
- "unit": usa "kg" para kilos, "g" para gramos, "l" para litros, "ml" para mililitros, \
"unidad" para cosas contables (huevos, panes, latas sueltas), o el nombre del \
empaque si no hay mejor unidad (ej: "paquete", "funda").
- "price": el precio en dólares si se menciona. Si el precio corresponde al total \
de un solo alimento, colócalo ahí. Si hay varios alimentos y un solo precio total, \
repártelo proporcionalmente entre ellos. Si no se menciona ningún precio, usa 0.
- Si el texto no menciona ningún alimento identificable, responde {"items": []}.

Ejemplo de entrada: "hoy gasté 3 dólares en una cubeta de huevos de 30 huevos"
Ejemplo de salida: {"items": [{"food_name": "Huevo", "quantity": 30, "unit": "unidad", "price": 3.0}]}

Ejemplo de entrada: "compré 3 kilos de papa y 2 litros de leche por 5 dólares en total"
Ejemplo de salida: {"items": [{"food_name": "Papa", "quantity": 3, "unit": "kg", "price": 3.0}, \
{"food_name": "Leche", "quantity": 2, "unit": "l", "price": 2.0}]}
"""


RECEIPT_SYSTEM_PROMPT = """Eres un asistente que extrae información estructurada de \
facturas o recibos de compra de alimentos (fotos o PDFs), típicamente de supermercados \
en Ecuador, aunque puede ser de cualquier país.

Responde ÚNICAMENTE con un JSON válido, sin texto adicional, sin explicaciones, \
sin backticks de markdown. El formato exacto es:

{"items": [{"food_name": "string", "quantity": number, "unit": "string", "price": number}]}

Reglas:
- Incluye SOLO alimentos y productos comestibles/bebibles. Ignora productos de \
limpieza, higiene personal, u otros artículos no alimenticios que aparezcan en la \
misma factura.
- "food_name": nombre del alimento en singular y con la primera letra en mayúscula \
(ej: "Papa", "Arroz", "Leche"). Simplifica nombres de marca a su categoría cuando sea \
obvio (ej: "Arroz Gustadina 1kg" → food_name="Arroz", quantity=1, unit="kg").
- "quantity": la cantidad comprada según la línea de la factura (peso o unidades).
- "unit": "kg" para kilos, "g" para gramos, "l" para litros, "ml" para mililitros, \
"unidad" para productos contables por pieza.
- "price": el precio TOTAL pagado por esa línea/alimento (no el precio unitario), \
tal como aparece en la factura para esa fila.
- Ignora líneas de subtotal, IVA, total general, descuentos y métodos de pago; esas \
no son alimentos.
- Si la imagen no es legible o no contiene una factura de alimentos, responde \
{"items": []}.
"""


def parse_purchase_text(text: str) -> list[dict]:
    """Envía el texto a Claude (vía Bedrock) y devuelve una lista de items
    con food_name, quantity, unit y price."""
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="El texto está vacío")

    try:
        raw_response = call_claude(prompt=text, system=SYSTEM_PROMPT, max_tokens=1024)
        data = extract_json(raw_response)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502, detail="No se pudo interpretar la respuesta de la IA"
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Error al conectar con el servicio de IA: {exc}"
        )

    items = data.get("items", [])
    if not items:
        raise HTTPException(
            status_code=422,
            detail="No se pudo identificar ningún alimento en lo que dijiste. Intenta ser más específico.",
        )
    return items


def parse_receipt_file(file_bytes: bytes, media_type: str) -> list[dict]:
    """Envía una foto o PDF de factura a Claude (vía Bedrock) y devuelve una
    lista de items con food_name, quantity, unit y price."""
    prompt = "Extrae los alimentos comprados en esta factura o recibo, siguiendo las reglas indicadas."

    try:
        raw_response = call_claude_vision(
            file_bytes, media_type, prompt=prompt, system=RECEIPT_SYSTEM_PROMPT, max_tokens=1500
        )
        data = extract_json(raw_response)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502, detail="No se pudo interpretar la respuesta de la IA"
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Error al conectar con el servicio de IA: {exc}"
        )

    items = data.get("items", [])
    if not items:
        raise HTTPException(
            status_code=422,
            detail="No se pudo identificar ningún alimento en la factura. Prueba con una foto más clara.",
        )
    return items
