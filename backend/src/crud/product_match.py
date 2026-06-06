from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from ..models.product_match import ProductMatch as ProductMatchModel

def get_product_by_id(db: Session, product_id: str):
    """根据商品ID获取商品"""
    return db.query(ProductMatchModel).filter(ProductMatchModel.product_id == product_id).first()

def get_products_by_ingredient(db: Session, ingredient_id: int, limit: int = 20):
    """根据食材ID获取匹配商品"""
    return db.query(ProductMatchModel).filter(
        ProductMatchModel.ingredient_id == ingredient_id
    ).order_by(ProductMatchModel.match_score.desc()).limit(limit).all()

def create_product_match(db: Session, product_data: dict):
    """创建商品匹配记录"""
    db_product = ProductMatchModel(**product_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def batch_create_product_matches(db: Session, products_data: list):
    """批量创建商品匹配记录"""
    db_products = [ProductMatchModel(**data) for data in products_data]
    db.add_all(db_products)
    db.commit()
    
    # 刷新获取ID
    for product in db_products:
        db.refresh(product)
    
    return db_products

def update_product_match(db: Session, product_id: str, **kwargs):
    """更新商品匹配信息"""
    db_product = get_product_by_id(db, product_id)
    if db_product:
        for key, value in kwargs.items():
            if hasattr(db_product, key):
                setattr(db_product, key, value)
        db.commit()
        db.refresh(db_product)
    return db_product

def delete_product_match(db: Session, product_id: str):
    """删除商品匹配记录"""
    db_product = get_product_by_id(db, product_id)
    if db_product:
        db.delete(db_product)
        db.commit()
    return db_product

def search_products(db: Session, ingredient_id: int, sort_by: str = 'match_score', limit: int = 10):
    """搜索商品并按指定方式排序"""
    query = db.query(ProductMatchModel).filter(ProductMatchModel.ingredient_id == ingredient_id)
    
    if sort_by == 'price':
        query = query.order_by(ProductMatchModel.price.asc())
    elif sort_by == 'rating':
        query = query.order_by(ProductMatchModel.rating.desc())
    elif sort_by == 'sales':
        query = query.order_by(ProductMatchModel.sales_count.desc())
    else:  # match_score
        query = query.order_by(ProductMatchModel.match_score.desc())
    
    return query.limit(limit).all()

def get_products_by_ids(db: Session, product_ids: list):
    """根据商品ID列表获取商品"""
    return db.query(ProductMatchModel).filter(
        ProductMatchModel.product_id.in_(product_ids)
    ).all()
