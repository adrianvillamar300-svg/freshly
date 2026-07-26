import json
import re


def extract_json(text: str) -> dict:
    """Limpia backticks de markdown que a veces envuelven la respuesta del
    modelo y parsea el JSON."""
    text = text.strip()
    text = re.sub(r"^```(json)?", "", text).strip()
    text = re.sub(r"```$", "", text).strip()
    return json.loads(text)
