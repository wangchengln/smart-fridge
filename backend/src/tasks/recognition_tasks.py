import os
from datetime import datetime, timedelta

from celery import Celery

from ..services.recognition_runner import run_image_recognition
from ..utils.database import session_scope

_broker = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
_backend = os.getenv("CELERY_RESULT_BACKEND", _broker)

celery_app = Celery(
    "recognition_tasks",
    broker=_broker,
    backend=_backend,
)


@celery_app.task
def process_image_recognition(
    recognition_id: int, image_path: str, recognition_type: str
):
    """异步处理图片识别任务（由 Celery Worker 执行）。"""
    return run_image_recognition(recognition_id, image_path, recognition_type)


@celery_app.task
def cleanup_old_recognition_records(days: int = 30):
    """清理旧的识别记录"""
    try:
        with session_scope() as db:
            from ..models.image_recognition import ImageRecognition

            cutoff_date = datetime.utcnow() - timedelta(days=days)
            old_records = (
                db.query(ImageRecognition)
                .filter(ImageRecognition.created_at < cutoff_date)
                .all()
            )

            deleted_count = 0
            for record in old_records:
                if record.image_path:
                    import os as _os

                    try:
                        if _os.path.exists(record.image_path):
                            _os.remove(record.image_path)
                    except OSError:
                        pass

                db.delete(record)
                deleted_count += 1

            db.commit()

            return {
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat(),
            }

    except Exception as e:
        return {"error": str(e)}
