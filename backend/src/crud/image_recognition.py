from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
import json
import os
import uuid
from PIL import Image
import base64
from io import BytesIO
from ..models.image_recognition import ImageRecognition as ImageRecognitionModel
from ..models.ingredient_base import IngredientBase as IngredientBaseModel
from ..models.user_ingredient import UserIngredient as UserIngredientModel
from ..schemas.image_recognition import (
    ImageUploadCreate, UpdateRecognitionResultRequest, 
    ConfirmRecognitionRequest, RecognizedIngredientItem
)
from ..schemas.ingredient import StockUpdateCreate

# 图片存储配置
IMAGE_STORAGE_PATH = "static/images"
os.makedirs(IMAGE_STORAGE_PATH, exist_ok=True)

def save_image_from_base64(base64_string: str) -> str:
    """
    将base64图片保存到文件系统
    :param base64_string: base64编码的图片字符串
    :return: 保存的图片路径
    """
    try:
        # 移除data URL前缀（如果存在）
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        # 解码base64字符串
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data)).convert("RGB")
        image.thumbnail((1920, 1920), Image.Resampling.LANCZOS)

        # 生成唯一文件名
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join(IMAGE_STORAGE_PATH, filename)

        # 保存压缩后的图片
        image.save(filepath, "JPEG", quality=85, optimize=True)
        
        return filepath
    except Exception as e:
        raise Exception(f"图片保存失败: {str(e)}")

def create_image_recognition_record(db: Session, user_id: int, image_path: str, recognition_type: str):
    """
    创建图片识别记录
    :param db: 数据库会话
    :param user_id: 用户ID
    :param image_path: 图片路径
    :param recognition_type: 识别类型
    :return: 创建的识别记录
    """
    db_recognition = ImageRecognitionModel(
        user_id=user_id,
        image_path=image_path,
        recognition_type=recognition_type,
        status='pending'
    )
    db.add(db_recognition)
    db.commit()
    db.refresh(db_recognition)
    return db_recognition

def get_image_recognition_by_id(db: Session, recognition_id: int):
    """
    根据ID获取图片识别记录
    :param db: 数据库会话
    :param recognition_id: 识别记录ID
    :return: 识别记录
    """
    return db.query(ImageRecognitionModel).filter(ImageRecognitionModel.id == recognition_id).first()

def get_user_image_recognitions(db: Session, user_id: int, limit: int = 10):
    """
    获取用户的图片识别记录列表
    :param db: 数据库会话
    :param user_id: 用户ID
    :param limit: 返回记录数量限制
    :return: 识别记录列表
    """
    return db.query(ImageRecognitionModel).filter(
        ImageRecognitionModel.user_id == user_id
    ).order_by(ImageRecognitionModel.created_at.desc()).limit(limit).all()

def update_recognition_result(db: Session, recognition_id: int, ingredients: list):
    """
    更新识别结果
    :param db: 数据库会话
    :param recognition_id: 识别记录ID
    :param ingredients: 食材列表
    :return: 更新后的识别记录
    """
    db_recognition = get_image_recognition_by_id(db, recognition_id)
    if db_recognition:
        db_recognition.recognition_result = json.dumps(ingredients, ensure_ascii=False)
        db_recognition.status = 'pending'  # 保持待确认状态
        db_recognition.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_recognition)
    return db_recognition

def confirm_recognition_results(db: Session, recognition_id: int, user_id: int, confirmed_ingredients: list):
    """
    确认识别结果并创建库存记录
    :param db: 数据库会话
    :param recognition_id: 识别记录ID
    :param user_id: 用户ID
    :param confirmed_ingredients: 确认的食材列表
    :return: 创建的库存记录ID列表
    """
    db_recognition = get_image_recognition_by_id(db, recognition_id)
    if not db_recognition:
        raise Exception("识别记录不存在")
    
    stock_ids = []
    
    for ingredient_data in confirmed_ingredients:
        # 检查食材是否已存在于基础库
        ingredient = db.query(IngredientBaseModel).filter(
            IngredientBaseModel.name == ingredient_data.name
        ).first()
        
        if not ingredient:
            # 创建新的食材基础信息
            ingredient = IngredientBaseModel(
                name=ingredient_data.name,
                category=ingredient_data.category or 'unknown',
                shelf_life=7  # 默认保鲜期7天
            )
            db.add(ingredient)
            db.commit()
            db.refresh(ingredient)
        
        # 创建用户库存记录
        stock = StockUpdateCreate(
            ingredient_id=ingredient.id,
            quantity=float(ingredient_data.quantity),
            freshness='fresh'
        )
        
        db_stock = UserIngredientModel(
            user_id=user_id,
            ingredient_id=ingredient.id,
            quantity=stock.quantity,
            freshness=stock.freshness,
            storage_method='ai_recognition',
            near_expiry=False,
            storage_date=datetime.utcnow()
        )
        db.add(db_stock)
        db.commit()
        db.refresh(db_stock)
        stock_ids.append(db_stock.id)
    
    # 更新识别记录状态
    db_recognition.status = 'confirmed'
    db_recognition.updated_at = datetime.utcnow()
    db.commit()
    
    return stock_ids

def update_recognition_status(db: Session, recognition_id: int, status: str, recognition_result: str = None):
    """
    更新识别状态
    :param db: 数据库会话
    :param recognition_id: 识别记录ID
    :param status: 新状态
    :param recognition_result: 识别结果（可选）
    :return: 更新后的识别记录
    """
    db_recognition = get_image_recognition_by_id(db, recognition_id)
    if db_recognition:
        db_recognition.status = status
        if recognition_result:
            db_recognition.recognition_result = recognition_result
        db_recognition.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(db_recognition)
    return db_recognition

def delete_image_recognition(db: Session, recognition_id: int):
    """
    删除图片识别记录
    :param db: 数据库会话
    :param recognition_id: 识别记录ID
    :return: 是否删除成功
    """
    db_recognition = get_image_recognition_by_id(db, recognition_id)
    if db_recognition:
        # 删除图片文件
        if db_recognition.image_path and os.path.exists(db_recognition.image_path):
            try:
                os.remove(db_recognition.image_path)
            except:
                pass  # 忽略文件删除错误
        
        db.delete(db_recognition)
        db.commit()
        return True
    return False
