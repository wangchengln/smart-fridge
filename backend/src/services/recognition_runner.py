"""
图片识别任务执行逻辑（Celery / BackgroundTasks / 同步回退共用）
"""
import json
from datetime import datetime

from ..crud.image_recognition import update_recognition_status
from ..services.ai_recognition import ai_recognition_service
from ..utils.database import session_scope


def run_image_recognition(recognition_id: int, image_path: str, recognition_type: str) -> dict:
    """执行一次完整的图片识别流程，使用 session_scope 管理数据库连接。"""
    with session_scope() as db:
        try:
            update_recognition_status(db, recognition_id, "processing")

            recognized_ingredients = ai_recognition_service.recognize_ingredients(
                image_path, recognition_type
            )
            validation_result = ai_recognition_service.validate_recognition_result(
                recognized_ingredients
            )

            result_data = {
                "ingredients": [
                    {
                        "name": item.name,
                        "quantity": float(item.quantity),
                        "confidence": item.confidence,
                        "category": item.category,
                    }
                    for item in recognized_ingredients
                ],
                "validation": validation_result,
                "processed_at": datetime.utcnow().isoformat(),
            }

            recognition_result_json = json.dumps(result_data, ensure_ascii=False)
            update_recognition_status(
                db,
                recognition_id,
                "completed",
                recognition_result_json,
            )

            return {
                "recognition_id": recognition_id,
                "status": "completed",
                "ingredients_count": len(recognized_ingredients),
            }

        except Exception as e:
            error_result = json.dumps(
                {"error": str(e), "failed_at": datetime.utcnow().isoformat()},
                ensure_ascii=False,
            )
            update_recognition_status(db, recognition_id, "failed", error_result)
            return {
                "recognition_id": recognition_id,
                "status": "failed",
                "error": str(e),
            }
