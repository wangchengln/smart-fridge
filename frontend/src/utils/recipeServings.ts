/** 根据用餐人数缩放菜谱食材用量 */

import { getIngredientUnitRule, toDisplayQuantity } from './ingredientUnits';

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 12;

export const clampServings = (value: number): number =>
  Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(value)));

export const getBaseServings = (recipeServingSize?: number): number =>
  clampServings(recipeServingSize && recipeServingSize > 0 ? recipeServingSize : 2);

export const getServingScale = (selectedServings: number, baseServings: number): number =>
  selectedServings / baseServings;

export const scaleIngredientQuantity = (
  baseQuantity: number,
  selectedServings: number,
  baseServings: number
): number => {
  const scale = getServingScale(selectedServings, baseServings);
  const scaled = baseQuantity * scale;
  return Math.round(scaled * 10) / 10;
};

export const formatIngredientQuantity = (quantity: number): string => {
  if (Number.isInteger(quantity) || Math.abs(quantity - Math.round(quantity)) < 0.05) {
    return String(Math.round(quantity));
  }
  return quantity.toFixed(1);
};

export const formatIngredientQuantityWithUnit = (
  quantity: number,
  ingredientName: string
): string => {
  const rule = getIngredientUnitRule(ingredientName);
  const displayQty = toDisplayQuantity(quantity, ingredientName);
  return `${formatIngredientQuantity(displayQty)}${rule.unit}`;
};

export { MIN_SERVINGS, MAX_SERVINGS };
