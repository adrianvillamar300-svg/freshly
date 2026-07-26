"""
Calcula días de duración estimada de alimentos según tipo y lugar de almacenamiento.
"""

# Días de duración según alimento y lugar de almacenamiento
EXPIRY_RULES: dict[str, dict[str, int]] = {
    # Lácteos
    "leche": {"refrigerator": 7, "pantry": 1, "freezer": 30},
    "yogurt": {"refrigerator": 14, "pantry": 1, "freezer": 30},
    "queso": {"refrigerator": 14, "pantry": 2, "freezer": 60},
    "mantequilla": {"refrigerator": 30, "pantry": 3, "freezer": 120},
    "crema": {"refrigerator": 7, "pantry": 1, "freezer": 30},
    # Carnes
    "pollo": {"refrigerator": 3, "pantry": 1, "freezer": 90},
    "carne": {"refrigerator": 3, "pantry": 1, "freezer": 90},
    "res": {"refrigerator": 3, "pantry": 1, "freezer": 90},
    "cerdo": {"refrigerator": 3, "pantry": 1, "freezer": 90},
    "pescado": {"refrigerator": 2, "pantry": 1, "freezer": 60},
    "camarón": {"refrigerator": 2, "pantry": 1, "freezer": 60},
    "atún": {"refrigerator": 3, "pantry": 1, "freezer": 60},
    # Huevos
    "huevo": {"refrigerator": 30, "pantry": 14, "freezer": 365},
    "huevos": {"refrigerator": 30, "pantry": 14, "freezer": 365},
    # Frutas
    "manzana": {"refrigerator": 30, "pantry": 7, "freezer": 180},
    "banana": {"refrigerator": 7, "pantry": 5, "freezer": 90},
    "plátano": {"refrigerator": 7, "pantry": 5, "freezer": 90},
    "naranja": {"refrigerator": 21, "pantry": 7, "freezer": 120},
    "mango": {"refrigerator": 7, "pantry": 4, "freezer": 90},
    "fresa": {"refrigerator": 5, "pantry": 2, "freezer": 90},
    "uva": {"refrigerator": 7, "pantry": 2, "freezer": 90},
    "papaya": {"refrigerator": 5, "pantry": 3, "freezer": 90},
    "piña": {"refrigerator": 7, "pantry": 3, "freezer": 90},
    "limón": {"refrigerator": 21, "pantry": 7, "freezer": 120},
    "tomate": {"refrigerator": 10, "pantry": 5, "freezer": 60},
    # Verduras
    "papa": {"refrigerator": 30, "pantry": 14, "freezer": 365},
    "cebolla": {"refrigerator": 30, "pantry": 21, "freezer": 365},
    "ajo": {"refrigerator": 30, "pantry": 30, "freezer": 365},
    "zanahoria": {"refrigerator": 21, "pantry": 5, "freezer": 180},
    "lechuga": {"refrigerator": 7, "pantry": 2, "freezer": 30},
    "espinaca": {"refrigerator": 5, "pantry": 1, "freezer": 30},
    "brócoli": {"refrigerator": 7, "pantry": 2, "freezer": 60},
    "pepino": {"refrigerator": 7, "pantry": 3, "freezer": 60},
    "pimiento": {"refrigerator": 7, "pantry": 4, "freezer": 60},
    "aguacate": {"refrigerator": 5, "pantry": 4, "freezer": 60},
    # Granos y secos
    "arroz": {"refrigerator": 365, "pantry": 365, "freezer": 365, "cabinet": 365},
    "frijol": {"refrigerator": 365, "pantry": 365, "freezer": 365, "cabinet": 365},
    "lenteja": {"refrigerator": 365, "pantry": 365, "freezer": 365, "cabinet": 365},
    "harina": {"refrigerator": 180, "pantry": 180, "freezer": 365, "cabinet": 180},
    "azúcar": {"refrigerator": 730, "pantry": 730, "freezer": 730, "cabinet": 730},
    "sal": {"refrigerator": 730, "pantry": 730, "freezer": 730, "cabinet": 730},
    "aceite": {"refrigerator": 365, "pantry": 180, "cabinet": 180},
    "pasta": {"refrigerator": 365, "pantry": 365, "cabinet": 365},
    "pan": {"refrigerator": 14, "pantry": 5, "freezer": 60},
    # Hierbas y especias
    "manzanilla": {"refrigerator": 7, "pantry": 3, "cabinet": 180},
    "cilantro": {"refrigerator": 7, "pantry": 2, "freezer": 30},
    # Default
    "default": {"refrigerator": 7, "pantry": 3, "freezer": 30, "cabinet": 30},
}


def estimate_expiry_days(food_name: str, storage_location: str) -> int:
    """Estima cuántos días dura un alimento según su nombre y donde se almacena."""
    name_lower = food_name.lower().strip()
    location = storage_location or "pantry"

    # Buscar coincidencia exacta o parcial
    rules = None
    for key in EXPIRY_RULES:
        if key in name_lower or name_lower in key:
            rules = EXPIRY_RULES[key]
            break

    if not rules:
        rules = EXPIRY_RULES["default"]

    return rules.get(location, rules.get("pantry", 7))


def get_expiry_status(days_remaining: int) -> str:
    """Retorna el estado de caducidad."""
    if days_remaining < 0:
        return "expired"
    elif days_remaining <= 2:
        return "critical"
    elif days_remaining <= 5:
        return "warning"
    else:
        return "ok"
