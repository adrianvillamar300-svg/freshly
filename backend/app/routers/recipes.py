import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas, auth
from app.services import recipe_service

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _to_recipe_out(recipe: models.RecipeCache) -> schemas.RecipeOut:
    return schemas.RecipeOut(
        id=recipe.id,
        title=recipe.title,
        ingredients=json.loads(recipe.ingredients_json),
        steps=json.loads(recipe.steps_json),
        missing_ingredients=(
            json.loads(recipe.missing_ingredients_json) if recipe.missing_ingredients_json else []
        ),
        created_at=recipe.created_at,
    )


@router.get("/suggestions", response_model=schemas.RecipeSuggestionsOut)
def get_recipe_suggestions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    """Genera sugerencias de recetas con IA a partir del inventario actual.
    No se guardan automáticamente; el usuario elige cuáles guardar."""
    inventory = (
        db.query(models.InventoryItem)
        .filter(models.InventoryItem.user_id == current_user.id, models.InventoryItem.quantity > 0)
        .all()
    )
    inventory_dicts = [
        {"food_name": i.food_name, "quantity": i.quantity, "unit": i.unit} for i in inventory
    ]

    recipes = recipe_service.suggest_recipes(inventory_dicts)
    parsed_recipes = [schemas.RecipeSuggestion(**r) for r in recipes]
    return schemas.RecipeSuggestionsOut(recipes=parsed_recipes)


@router.post("/save", response_model=schemas.RecipeOut, status_code=status.HTTP_201_CREATED)
def save_recipe(
    recipe_in: schemas.RecipeSuggestion,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    recipe = models.RecipeCache(
        user_id=current_user.id,
        title=recipe_in.title,
        ingredients_json=json.dumps(recipe_in.ingredients),
        steps_json=json.dumps(recipe_in.steps),
        missing_ingredients_json=json.dumps(recipe_in.missing_ingredients),
    )
    db.add(recipe)
    db.commit()
    db.refresh(recipe)
    return _to_recipe_out(recipe)


@router.get("/history", response_model=List[schemas.RecipeOut])
def list_saved_recipes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    recipes = (
        db.query(models.RecipeCache)
        .filter(models.RecipeCache.user_id == current_user.id)
        .order_by(models.RecipeCache.created_at.desc())
        .all()
    )
    return [_to_recipe_out(r) for r in recipes]


@router.get("/{recipe_id}", response_model=schemas.RecipeOut)
def get_saved_recipe(
    recipe_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    recipe = (
        db.query(models.RecipeCache)
        .filter(models.RecipeCache.id == recipe_id, models.RecipeCache.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    return _to_recipe_out(recipe)


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_recipe(
    recipe_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    recipe = (
        db.query(models.RecipeCache)
        .filter(models.RecipeCache.id == recipe_id, models.RecipeCache.user_id == current_user.id)
        .first()
    )
    if not recipe:
        raise HTTPException(status_code=404, detail="Receta no encontrada")
    db.delete(recipe)
    db.commit()
    return None
