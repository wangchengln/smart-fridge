from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import json

from ..schemas.image_recognition import (
    ImageUploadCreate, ImageRecognitionResponse, ImageRecognitionResult,
    UpdateRecognitionResultRequest, UpdateRecognitionResultResponse,
    ConfirmRecognitionRequest, ConfirmRecognitionResponse, RecognitionStatusResponse
)
from ..crud.image_recognition import (
    save_image_from_base64, create_image_recognition_record,
    get_image_recognition_by_id, get_user_image_recognitions,
    update_recognition_result, confirm_recognition_results,
    delete_image_recognition
)
from ..tasks.recognition_enqueue import enqueue_image_recognition
from ..utils.database import get_db

router = APIRouter(prefix="/api/image-recognition", tags=["图片识别"])

@router.post("/upload", response_model=ImageRecognitionResponse)
async def upload_and_recognize_image(
    upload_data: ImageUploadCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    上传图片并开始识别
    """
    try:
        # 保存图片
        image_path = save_image_from_base64(upload_data.image)
        
        # 创建识别记录
        recognition_record = create_image_recognition_record(
            db, 
            upload_data.user_id, 
            image_path, 
            upload_data.recognition_type
        )
        
        # Celery 优先；Redis/Worker 不可用时回退到 BackgroundTasks
        enqueue_image_recognition(
            recognition_record.id,
            image_path,
            upload_data.recognition_type,
            background_tasks=background_tasks,
        )
        
        return {
            "recognition_id": recognition_record.id,
            "image_path": recognition_record.image_path,
            "status": recognition_record.status,
            "created_at": recognition_record.created_at.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"图片上传失败: {str(e)}"
        )

@router.get("/status/{recognition_id}", response_model=RecognitionStatusResponse)
def get_recognition_status(
    recognition_id: int,
    db: Session = Depends(get_db)
):
    """
    获取识别状态和结果
    """
    recognition_record = get_image_recognition_by_id(db, recognition_id)
    if not recognition_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="识别记录不存在"
        )
    
    # 解析识别结果
    ingredients = None
    error_message = None
    progress = 0
    
    if recognition_record.recognition_result:
        try:
            result_data = json.loads(recognition_record.recognition_result)
            if recognition_record.status == 'completed':
                ingredients = result_data.get('ingredients', [])
                progress = 100
            elif recognition_record.status == 'failed':
                error_message = result_data.get('error', '识别失败')
                progress = 0
        except:
            error_message = "识别结果解析失败"
    
    # 根据状态设置进度
    if recognition_record.status == 'pending':
        progress = 10
    elif recognition_record.status == 'processing':
        progress = 50
    elif recognition_record.status == 'confirmed':
        progress = 100
    
    return {
        "recognition_id": recognition_record.id,
        "status": recognition_record.status,
        "progress": progress,
        "ingredients": ingredients,
        "error_message": error_message,
        "created_at": recognition_record.created_at.isoformat(),
        "updated_at": recognition_record.updated_at.isoformat()
    }

@router.get("/user/{user_id}", response_model=List[ImageRecognitionResponse])
def get_user_recognition_history(
    user_id: int,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """
    获取用户的识别历史
    """
    recognition_records = get_user_image_recognitions(db, user_id, limit)
    
    return [
        {
            "recognition_id": record.id,
            "image_path": record.image_path,
            "status": record.status,
            "created_at": record.created_at.isoformat()
        }
        for record in recognition_records
    ]

@router.post("/update-result", response_model=UpdateRecognitionResultResponse)
def update_recognition_result_endpoint(
    update_request: UpdateRecognitionResultRequest,
    db: Session = Depends(get_db)
):
    """
    更新识别结果（用户手动修改）
    """
    recognition_record = get_image_recognition_by_id(db, update_request.recognition_id)
    if not recognition_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="识别记录不存在"
        )
    
    # 准备更新数据
    update_data = [
        {
            "name": item.name,
            "quantity": float(item.quantity),
            "confidence": item.confidence,
            "category": item.category
        }
        for item in update_request.ingredients
    ]
    
    # 更新识别结果
    updated_record = update_recognition_result(
        db, 
        update_request.recognition_id, 
        update_data
    )
    
    if not updated_record:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新识别结果失败"
        )
    
    return {
        "recognition_id": updated_record.id,
        "updated_count": len(update_request.ingredients),
        "success": True,
        "message": "识别结果更新成功"
    }

@router.post("/confirm", response_model=ConfirmRecognitionResponse)
def confirm_recognition_results_endpoint(
    confirm_request: ConfirmRecognitionRequest,
    db: Session = Depends(get_db)
):
    """
    确认识别结果并创建库存记录
    """
    try:
        # 确认识别结果并创建库存
        stock_ids = confirm_recognition_results(
            db,
            confirm_request.recognition_id,
            confirm_request.user_id,
            confirm_request.confirmed_ingredients
        )
        
        return {
            "recognition_id": confirm_request.recognition_id,
            "confirmed_count": len(confirm_request.confirmed_ingredients),
            "stock_ids": stock_ids,
            "success": True,
            "message": f"成功创建{len(stock_ids)}个库存记录"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"确认识别结果失败: {str(e)}"
        )

@router.delete("/{recognition_id}")
def delete_recognition_record_endpoint(
    recognition_id: int,
    db: Session = Depends(get_db)
):
    """
    删除识别记录
    """
    success = delete_image_recognition(db, recognition_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="识别记录不存在"
        )
    
    return {"message": "识别记录删除成功"}

@router.get("/result/{recognition_id}", response_model=ImageRecognitionResult)
def get_recognition_result_endpoint(
    recognition_id: int,
    db: Session = Depends(get_db)
):
    """
    获取识别结果详情
    """
    recognition_record = get_image_recognition_by_id(db, recognition_id)
    if not recognition_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="识别记录不存在"
        )
    
    ingredients = []
    if recognition_record.recognition_result:
        try:
            result_data = json.loads(recognition_record.recognition_result)
            ingredients = result_data.get('ingredients', [])
        except:
            pass
    
    processed_at = None
    if recognition_record.recognition_result:
        try:
            result_data = json.loads(recognition_record.recognition_result)
            processed_at = result_data.get('processed_at')
        except:
            pass
    
    return {
        "recognition_id": recognition_record.id,
        "status": recognition_record.status,
        "ingredients": ingredients,
        "processed_at": processed_at
    }
