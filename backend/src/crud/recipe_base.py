import json
from typing import List, Tuple

from sqlalchemy.orm import Session

from ..models.recipe_base import RecipeBase as RecipeBaseModel
from ..models.recipe_ingredient_rel import RecipeIngredientRel as RecipeIngredientRelModel
from ..crud.ingredient_base import get_ingredient_by_name
from ..schemas.recipe import RecipeRecommendCreate
from ..data.recipe_seed_data import ADDITIONAL_RECIPES
from ..utils.recipe_images import download_recipe_image, RECIPE_IMAGE_SOURCES

# 菜谱种子数据：参考下厨房、美食天下等家常菜谱的用料与步骤
# 每项: (name, cooking_time, taste, serving_size, steps, ingredients)
# ingredients: [(食材名称, 所需数量), ...]
DEFAULT_RECIPES: List[Tuple] = [
    (
        "西红柿炒鸡蛋",
        15,
        "清淡",
        2,
        [
            {"step": 1, "description": "西红柿洗净切块，鸡蛋加少量盐打散"},
            {"step": 2, "description": "热锅凉油，倒入蛋液快速划散，炒至八成熟盛出"},
            {"step": 3, "description": "锅中补少许油，下西红柿中火翻炒至出汁软烂"},
            {"step": 4, "description": "倒回鸡蛋，加盐和少许糖调味，翻炒均匀出锅"},
        ],
        [("西红柿", 2.0), ("鸡蛋", 3.0)],
    ),
    (
        "番茄土豆炒鸡蛋",
        25,
        "咸鲜",
        3,
        [
            {"step": 1, "description": "土豆切薄片，西红柿切块，鸡蛋打散备用"},
            {"step": 2, "description": "土豆片开水焯3-5分钟至半熟，捞出沥干"},
            {"step": 3, "description": "热锅炒蛋至凝固，盛出备用"},
            {"step": 4, "description": "少油煸土豆片至边缘微黄，盛出"},
            {"step": 5, "description": "下西红柿翻炒出红汁，加土豆和鸡蛋，盐、糖、酱油调味后出锅"},
        ],
        [("西红柿", 2.0), ("土豆", 1.0), ("鸡蛋", 3.0)],
    ),
    (
        "清炒土豆丝",
        20,
        "清淡",
        2,
        [
            {"step": 1, "description": "土豆去皮切细丝，清水浸泡去淀粉后沥干"},
            {"step": 2, "description": "热锅冷油，下土豆丝大火快炒约2分钟"},
            {"step": 3, "description": "加盐、少许醋，炒至断生脆爽即可出锅"},
        ],
        [("土豆", 2.0)],
    ),
    (
        "胡萝卜炒鸡蛋",
        15,
        "清淡",
        2,
        [
            {"step": 1, "description": "胡萝卜切细丝，鸡蛋打散"},
            {"step": 2, "description": "先炒蛋至凝固，盛出"},
            {"step": 3, "description": "少油炒胡萝卜丝至软，倒回鸡蛋加盐炒匀"},
        ],
        [("胡萝卜", 1.0), ("鸡蛋", 2.0)],
    ),
    (
        "洋葱炒鸡蛋",
        12,
        "咸鲜",
        2,
        [
            {"step": 1, "description": "洋葱切丝，鸡蛋打散"},
            {"step": 2, "description": "热油炒蛋至半熟盛出"},
            {"step": 3, "description": "下洋葱中火炒软，倒回鸡蛋加盐快速翻匀"},
        ],
        [("洋葱", 1.0), ("鸡蛋", 2.0)],
    ),
    (
        "土豆烧猪肉",
        45,
        "咸鲜",
        3,
        [
            {"step": 1, "description": "猪肉切小块，土豆切滚刀块"},
            {"step": 2, "description": "猪肉煸炒至表面微黄，加酱油上色"},
            {"step": 3, "description": "放入土豆块，加水没过食材，中小火烧25分钟"},
            {"step": 4, "description": "大火收汁，加盐调味即可"},
        ],
        [("土豆", 2.0), ("猪肉", 0.5)],
    ),
    (
        "胡萝卜土豆炖猪肉",
        50,
        "咸鲜",
        4,
        [
            {"step": 1, "description": "猪肉、胡萝卜、土豆分别切块"},
            {"step": 2, "description": "猪肉焯水去血沫后沥干"},
            {"step": 3, "description": "锅中少油煸猪肉，加热水没过食材"},
            {"step": 4, "description": "下胡萝卜、土豆，小火炖40分钟至软烂"},
            {"step": 5, "description": "加盐调味，汤汁收浓后出锅"},
        ],
        [("胡萝卜", 1.0), ("土豆", 2.0), ("猪肉", 0.5)],
    ),
    (
        "牛奶蒸蛋",
        20,
        "清淡",
        2,
        [
            {"step": 1, "description": "鸡蛋打散，按1:1.5比例加入温牛奶搅匀"},
            {"step": 2, "description": "过筛去泡沫，盖保鲜膜扎小孔"},
            {"step": 3, "description": "水开后上锅蒸12-15分钟，关火焖2分钟"},
        ],
        [("鸡蛋", 3.0), ("牛奶", 0.25)],
    ),
    (
        "酸奶香蕉杯",
        5,
        "酸甜",
        1,
        [
            {"step": 1, "description": "香蕉切片，取一半压成泥"},
            {"step": 2, "description": "杯底铺香蕉片，倒入酸奶"},
            {"step": 3, "description": "顶部再铺香蕉片即可冷藏后食用"},
        ],
        [("香蕉", 2.0), ("酸奶", 1.0)],
    ),
    (
        "虾仁滑蛋",
        15,
        "咸鲜",
        2,
        [
            {"step": 1, "description": "虾去壳留尾，用少许盐抓洗"},
            {"step": 2, "description": "鸡蛋加温水打散，虾仁吸干水分"},
            {"step": 3, "description": "热锅温油，先下虾仁变色，淋入蛋液"},
            {"step": 4, "description": "小火推成滑蛋状，撒盐出锅"},
        ],
        [("虾", 0.2), ("鸡蛋", 2.0)],
    ),
    (
        "苹果酸奶沙拉",
        10,
        "酸甜",
        2,
        [
            {"step": 1, "description": "苹果洗净切小丁，可淋少许柠檬汁防氧化"},
            {"step": 2, "description": "与酸奶拌匀，冷藏5分钟后食用"},
        ],
        [("苹果", 2.0), ("酸奶", 1.0)],
    ),
    (
        "香煎鸡胸肉",
        25,
        "咸鲜",
        2,
        [
            {"step": 1, "description": "鸡胸肉对半切开，用刀背拍松"},
            {"step": 2, "description": "两面撒盐，静置10分钟入味"},
            {"step": 3, "description": "平底锅少油，中火每面煎4-5分钟至金黄"},
            {"step": 4, "description": "切片搭配蔬菜即可"},
        ],
        [("鸡肉", 0.4)],
    ),
    (
        "胡萝卜炖鸡肉",
        40,
        "清淡",
        3,
        [
            {"step": 1, "description": "鸡肉切块焯水，胡萝卜切滚刀块"},
            {"step": 2, "description": "锅中少油煸鸡肉至表面变色"},
            {"step": 3, "description": "加热水、胡萝卜，小火炖30分钟"},
            {"step": 4, "description": "加盐调味，汤汁收至浓稠"},
        ],
        [("鸡肉", 0.5), ("胡萝卜", 1.0)],
    ),
    (
        "洋葱炒猪肉",
        20,
        "咸鲜",
        2,
        [
            {"step": 1, "description": "猪肉切薄片，洋葱切丝"},
            {"step": 2, "description": "热油快炒猪肉至变色盛出"},
            {"step": 3, "description": "下洋葱炒软，倒回猪肉加盐、酱油炒匀"},
        ],
        [("猪肉", 0.3), ("洋葱", 1.0)],
    ),
    (
        "香蕉牛奶昔",
        5,
        "酸甜",
        1,
        [
            {"step": 1, "description": "香蕉切段，与牛奶一起放入搅拌机"},
            {"step": 2, "description": "高速打30秒至顺滑，即可饮用"},
        ],
        [("香蕉", 1.0), ("牛奶", 0.3)],
    ),
]

# 合并基础菜谱与补充菜谱，共 50 道
ALL_SEED_RECIPES = DEFAULT_RECIPES + ADDITIONAL_RECIPES

# 已有菜谱的食材关联修正（启动时同步到数据库）
RECIPE_INGREDIENT_SYNC: dict[str, list[tuple[str, float]]] = {
    "可乐炖鸡肉": [("鸡翅", 0.6), ("可乐", 0.5)],
}

def get_recipe_by_id(db: Session, recipe_id: int):
    """根据菜谱ID查询菜谱"""
    return db.query(RecipeBaseModel).filter(RecipeBaseModel.id == recipe_id).first()

def get_all_recipes(db: Session):
    """获取所有菜谱"""
    return db.query(RecipeBaseModel).all()

def create_recipe_base(db: Session, name: str, cooking_time: int, taste: str, serving_size: int):
    """创建菜谱基础信息"""
    db_recipe = RecipeBaseModel(
        name=name,
        cooking_time=cooking_time,
        taste=taste,
        serving_size=serving_size,
        steps="[]"  # 默认空步骤
    )
    db.add(db_recipe)
    db.commit()
    db.refresh(db_recipe)
    return db_recipe

def update_recipe_base(db: Session, recipe_id: int, **kwargs):
    """更新菜谱基础信息"""
    db_recipe = db.query(RecipeBaseModel).filter(RecipeBaseModel.id == recipe_id).first()
    if db_recipe:
        for key, value in kwargs.items():
            if hasattr(db_recipe, key):
                setattr(db_recipe, key, value)
        db.commit()
        db.refresh(db_recipe)
    return db_recipe

def get_recipes_by_preference(db: Session, taste: str = None):
    """根据口味偏好查询菜谱"""
    query = db.query(RecipeBaseModel)
    if taste:
        query = query.filter(RecipeBaseModel.taste == taste)
    return query.all()


def seed_recipe_base(db: Session):
    """初始化菜谱库及食材关联（按名称补全缺失条目）"""
    existing = {item.name: item for item in db.query(RecipeBaseModel).all()}
    changed = False

    for name, cooking_time, taste, serving_size, steps, ingredients in ALL_SEED_RECIPES:
        if name in existing:
            continue

        image_url = download_recipe_image(name, taste=taste) or ""

        db_recipe = RecipeBaseModel(
            name=name,
            cooking_time=cooking_time,
            taste=taste,
            serving_size=serving_size,
            steps=json.dumps(steps, ensure_ascii=False),
            image_url=image_url,
        )
        db.add(db_recipe)
        db.flush()

        for ingredient_name, quantity in ingredients:
            ingredient = get_ingredient_by_name(db, ingredient_name)
            if not ingredient:
                raise ValueError(
                    f"菜谱「{name}」所需食材「{ingredient_name}」不在 ingredient_base 中，"
                    "请先在 seed_ingredient_base 中补充"
                )
            db.add(
                RecipeIngredientRelModel(
                    recipe_id=db_recipe.id,
                    ingredient_id=ingredient.id,
                    required_quantity=quantity,
                    is_required=True,
                )
            )

        existing[name] = db_recipe
        changed = True

    if changed:
        db.commit()


def sync_recipe_ingredient_relations(db: Session):
    """将 RECIPE_INGREDIENT_SYNC 中的食材关联同步到已有菜谱"""
    from ..crud.ingredient_base import get_or_create_ingredient_base

    changed = False
    for recipe_name, ingredients in RECIPE_INGREDIENT_SYNC.items():
        recipe = (
            db.query(RecipeBaseModel)
            .filter(RecipeBaseModel.name == recipe_name)
            .first()
        )
        if not recipe:
            continue

        db.query(RecipeIngredientRelModel).filter(
            RecipeIngredientRelModel.recipe_id == recipe.id
        ).delete()

        for ingredient_name, quantity in ingredients:
            ingredient = get_ingredient_by_name(db, ingredient_name)
            if not ingredient:
                ingredient = get_or_create_ingredient_base(db, ingredient_name, "食材")
            db.add(
                RecipeIngredientRelModel(
                    recipe_id=recipe.id,
                    ingredient_id=ingredient.id,
                    required_quantity=quantity,
                    is_required=True,
                )
            )
        changed = True

    if changed:
        db.commit()


def sync_recipe_images(db: Session, force_download: bool = False):
    """为已有菜谱同步封面图路径并写入 image_url"""
    from ..utils.recipe_images import RECIPE_IMAGE_DIR, recipe_image_public_path

    recipes = db.query(RecipeBaseModel).all()
    changed = False

    for recipe in recipes:
        if recipe.name not in RECIPE_IMAGE_SOURCES:
            continue

        filename, _ = RECIPE_IMAGE_SOURCES[recipe.name]
        local_target = RECIPE_IMAGE_DIR / filename
        if local_target.exists():
            image_url = recipe_image_public_path(filename)
        elif recipe.image_url and not force_download:
            continue
        else:
            image_url = download_recipe_image(
                recipe.name,
                taste=recipe.taste or "咸鲜",
                force=force_download,
            )

        if image_url and recipe.image_url != image_url:
            recipe.image_url = image_url
            changed = True

    if changed:
        db.commit()
