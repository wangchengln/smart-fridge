from sqlalchemy.orm import Session
from ..models.ingredient_base import IngredientBase as IngredientBaseModel

def get_ingredient_by_id(db: Session, ingredient_id: int):
    """根据食材ID查询食材"""
    return db.query(IngredientBaseModel).filter(IngredientBaseModel.id == ingredient_id).first()

def get_ingredient_by_name(db: Session, name: str):
    """根据食材名称查询食材"""
    return db.query(IngredientBaseModel).filter(IngredientBaseModel.name == name).first()

def create_ingredient_base(db: Session, name: str, category: str, shelf_life: int = 7):
    """创建食材基础信息"""
    db_ingredient = IngredientBaseModel(
        name=name,
        category=category,
        shelf_life=shelf_life
    )
    db.add(db_ingredient)
    db.commit()
    db.refresh(db_ingredient)
    return db_ingredient

def get_all_ingredients(db: Session):
    """获取所有食材"""
    return db.query(IngredientBaseModel).all()


DEFAULT_INGREDIENTS = [
    ("西红柿", "蔬菜", 7),
    ("胡萝卜", "蔬菜", 14),
    ("土豆", "蔬菜", 21),
    ("洋葱", "蔬菜", 14),
    ("苹果", "水果", 14),
    ("香蕉", "水果", 7),
    ("猪肉", "肉类", 3),
    ("鸡肉", "肉类", 3),
    ("鸡蛋", "蛋类", 14),
    ("牛奶", "乳制品", 7),
    ("酸奶", "乳制品", 7),
    ("虾", "海鲜", 2),
    ("牛肉", "肉类", 5),
    ("鱼", "海鲜", 2),
    ("豆腐", "豆制品", 7),
    ("蘑菇", "菌类", 7),
    ("大米", "粮食", 365),
    ("玉米", "蔬菜", 7),
    ("鸡翅", "肉类", 3),
    ("可乐", "饮品", 365),
    ("木炭", "用品", 365),
    ("烧烤调料", "调料", 180),
    ("啤酒", "饮品", 180),
    ("黄瓜", "蔬菜", 7),
    ("面包", "粮食", 5),
]


def seed_ingredient_base(db: Session):
    """初始化食材基础库（按名称补全缺失条目）"""
    existing = {item.name: item for item in db.query(IngredientBaseModel).all()}
    next_id = max((item.id for item in existing.values()), default=0) + 1
    changed = False

    for name, category, shelf_life in DEFAULT_INGREDIENTS:
        if name not in existing:
            db.add(
                IngredientBaseModel(
                    id=next_id,
                    name=name,
                    category=category,
                    shelf_life=shelf_life,
                )
            )
            next_id += 1
            changed = True

    if changed:
        db.commit()

def get_or_create_ingredient_base(
    db: Session,
    name: str,
    category: str = "未分类",
    shelf_life: int = 7,
):
    """按名称获取或创建食材基础信息"""
    normalized = name.strip()
    existing = get_ingredient_by_name(db, normalized)
    if existing:
        return existing
    return create_ingredient_base(db, normalized, category, shelf_life)


def update_ingredient_base(db: Session, ingredient_id: int, **kwargs):
    """更新食材基础信息"""
    db_ingredient = db.query(IngredientBaseModel).filter(IngredientBaseModel.id == ingredient_id).first()
    if db_ingredient:
        for key, value in kwargs.items():
            if hasattr(db_ingredient, key):
                setattr(db_ingredient, key, value)
        db.commit()
        db.refresh(db_ingredient)
    return db_ingredient
