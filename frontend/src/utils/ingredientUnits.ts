/** 菜谱食材用量展示单位（与种子数据 required_quantity 语义对应） */

interface IngredientUnitRule {
  unit: string;
  /** 将库存数量换算为展示数值，如 0.5 → 500 克 */
  scale?: number;
}

const INGREDIENT_UNIT_MAP: Record<string, IngredientUnitRule> = {
  鸡蛋: { unit: '个' },
  西红柿: { unit: '个' },
  土豆: { unit: '个' },
  胡萝卜: { unit: '根' },
  洋葱: { unit: '个' },
  苹果: { unit: '个' },
  香蕉: { unit: '根' },
  黄瓜: { unit: '根' },
  玉米: { unit: '根' },
  豆腐: { unit: '块' },
  酸奶: { unit: '盒' },
  面包: { unit: '片' },
  猪肉: { unit: '克', scale: 1000 },
  鸡肉: { unit: '克', scale: 1000 },
  牛肉: { unit: '克', scale: 1000 },
  鸡翅: { unit: '克', scale: 1000 },
  虾: { unit: '克', scale: 1000 },
  鱼: { unit: '克', scale: 1000 },
  蘑菇: { unit: '克', scale: 1000 },
  大米: { unit: '克', scale: 1000 },
  牛奶: { unit: '毫升', scale: 1000 },
  可乐: { unit: '毫升', scale: 1000 },
  啤酒: { unit: '毫升', scale: 1000 },
  木炭: { unit: '克', scale: 1000 },
  烧烤调料: { unit: '克', scale: 1000 },
};

const NAME_KEYWORD_UNITS: { keywords: string[]; rule: IngredientUnitRule }[] = [
  { keywords: ['蛋'], rule: { unit: '个' } },
  { keywords: ['奶', '汁', '饮', '可乐', '啤酒'], rule: { unit: '毫升', scale: 1000 } },
  { keywords: ['肉', '鸡', '鸭', '猪', '牛', '羊', '虾', '鱼', '翅'], rule: { unit: '克', scale: 1000 } },
  { keywords: ['米', '面', '粉'], rule: { unit: '克', scale: 1000 } },
  { keywords: ['豆腐', '豆干', '豆皮'], rule: { unit: '块' } },
  { keywords: ['菇', '蘑'], rule: { unit: '克', scale: 1000 } },
  { keywords: ['香蕉'], rule: { unit: '根' } },
  { keywords: ['苹果', '西红柿', '番茄', '土豆', '洋葱', '蒜'], rule: { unit: '个' } },
];

export const getIngredientUnitRule = (ingredientName: string): IngredientUnitRule => {
  const exact = INGREDIENT_UNIT_MAP[ingredientName];
  if (exact) return exact;

  for (const { keywords, rule } of NAME_KEYWORD_UNITS) {
    if (keywords.some((keyword) => ingredientName.includes(keyword))) {
      return rule;
    }
  }

  return { unit: '份' };
};

export const toDisplayQuantity = (quantity: number, ingredientName: string): number => {
  const rule = getIngredientUnitRule(ingredientName);
  const scaled = rule.scale ? quantity * rule.scale : quantity;
  return Math.round(scaled * 10) / 10;
};
