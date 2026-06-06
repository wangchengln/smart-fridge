from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import datetime, timedelta
from ..models.recipe_recommendation import RecipeRecommendation as RecipeRecommendationModel
from ..schemas.recipe import RecipeRecommendCreate

def create_recipe_recommendation(db: Session, recommendation_data: dict):
    """
    创建菜谱推荐记录
    """
    db_recommendation = RecipeRecommendationModel(**recommendation_data)
    db.add(db_recommendation)
    db.commit()
    db.refresh(db_recommendation)
    return db_recommendation

def batch_create_recommendations(db: Session, recommendations_data: list):
    """
    批量创建菜谱推荐记录
    """
    db_recommendations = [
        RecipeRecommendationModel(**data) for data in recommendations_data
    ]
    db.add_all(db_recommendations)
    db.commit()
    
    # 刷新获取ID
    for rec in db_recommendations:
        db.refresh(rec)
    
    return db_recommendations

def get_user_recommendations(db: Session, user_id: int, limit: int = 20):
    """
    获取用户的推荐记录
    """
    return db.query(RecipeRecommendationModel).filter(
        RecipeRecommendationModel.user_id == user_id
    ).order_by(
        RecipeRecommendationModel.match_score.desc(),
        RecipeRecommendationModel.created_at.desc()
    ).limit(limit).all()

def get_recommendations_by_type(db: Session, user_id: int, recommendation_type: str):
    """
    根据推荐类型获取推荐记录
    """
    return db.query(RecipeRecommendationModel).filter(
        and_(
            RecipeRecommendationModel.user_id == user_id,
            RecipeRecommendationModel.recommendation_type == recommendation_type
        )
    ).order_by(
        RecipeRecommendationModel.existing_ingredients_ratio.desc()
    ).all()

def update_recommendation_selection(db: Session, recommendation_id: int, is_selected: bool):
    """
    更新推荐选择状态
    """
    db_recommendation = db.query(RecipeRecommendationModel).filter(
        RecipeRecommendationModel.id == recommendation_id
    ).first()
    
    if db_recommendation:
        db_recommendation.is_selected = is_selected
        db.commit()
        db.refresh(db_recommendation)
    
    return db_recommendation

def delete_all_user_recommendations(db: Session, user_id: int) -> int:
    """删除用户全部推荐记录（清除推荐缓存）"""
    records = db.query(RecipeRecommendationModel).filter(
        RecipeRecommendationModel.user_id == user_id
    ).all()

    deleted_count = len(records)
    for record in records:
        db.delete(record)

    db.commit()
    return deleted_count


def delete_expired_recommendations(db: Session, user_id: int):
    """
    删除过期的推荐记录（24小时前）
    """
    expire_time = datetime.utcnow() - timedelta(hours=24)
    
    expired_records = db.query(RecipeRecommendationModel).filter(
        and_(
            RecipeRecommendationModel.user_id == user_id,
            RecipeRecommendationModel.created_at < expire_time
        )
    ).all()
    
    for record in expired_records:
        db.delete(record)
    
    db.commit()
    return len(expired_records)

def get_latest_recommendation_for_recipe(db: Session, user_id: int, recipe_id: int):
    """获取用户某菜谱最新一条推荐记录"""
    return db.query(RecipeRecommendationModel).filter(
        and_(
            RecipeRecommendationModel.user_id == user_id,
            RecipeRecommendationModel.recipe_id == recipe_id,
        )
    ).order_by(RecipeRecommendationModel.created_at.desc()).first()


def get_latest_recommendation_id(
    db: Session,
    user_id: int,
    recipe_id: int,
    recommendation_type: str = None,
):
    """获取用户某菜谱最新的推荐记录 ID，可按推荐类型区分"""
    query = db.query(RecipeRecommendationModel).filter(
        and_(
            RecipeRecommendationModel.user_id == user_id,
            RecipeRecommendationModel.recipe_id == recipe_id,
        )
    )
    if recommendation_type:
        query = query.filter(
            RecipeRecommendationModel.recommendation_type == recommendation_type
        )
    record = query.order_by(RecipeRecommendationModel.created_at.desc()).first()
    return record.id if record else None


def attach_recommendation_ids(db: Session, user_id: int, recommendations: list):
    """为推荐项附加 recommendation_id（按菜谱+推荐类型匹配）"""
    for rec in recommendations:
        legacy_type = rec.get("legacy_recommendation_type") or rec.get("recommendation_type")
        rec_id = get_latest_recommendation_id(
            db, user_id, rec["recipe_id"], legacy_type
        )
        if rec_id:
            rec["recommendation_id"] = rec_id


def get_recommendation_stats(db: Session, user_id: int):
    """
    获取推荐统计信息
    """
    total_recommendations = db.query(RecipeRecommendationModel).filter(
        RecipeRecommendationModel.user_id == user_id
    ).count()
    
    type_stats = {}
    for rec_type in [
        'no_purchase',
        'small_purchase',
        'takeout_alternative',
        'premade_fresh',
        'cook_self',
        'flash_purchase_cook',
        'takeout_delivery',
    ]:
        count = db.query(RecipeRecommendationModel).filter(
            and_(
                RecipeRecommendationModel.user_id == user_id,
                RecipeRecommendationModel.recommendation_type == rec_type
            )
        ).count()
        type_stats[rec_type] = count
    
    selected_count = db.query(RecipeRecommendationModel).filter(
        and_(
            RecipeRecommendationModel.user_id == user_id,
            RecipeRecommendationModel.is_selected == True
        )
    ).count()
    
    return {
        'total_recommendations': total_recommendations,
        'type_breakdown': type_stats,
        'selected_count': selected_count
    }
