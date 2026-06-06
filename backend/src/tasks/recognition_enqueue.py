"""
图片识别任务入队：优先 Celery，不可用时回退到 FastAPI BackgroundTasks 或同步执行。
"""
import os
from typing import Literal, Optional

from fastapi import BackgroundTasks

EnqueueMode = Literal["celery", "background", "sync"]


def _broker_url() -> str:
    return os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")


def is_celery_broker_available() -> bool:
    """检测 Redis broker 是否可达。"""
    url = _broker_url()
    if not url.startswith("redis://"):
        return False
    try:
        import redis

        client = redis.from_url(
            url,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        client.ping()
        client.close()
        return True
    except Exception:
        return False


def should_use_celery() -> bool:
    mode = os.getenv("USE_CELERY", "auto").lower()
    if mode == "true":
        return True
    if mode == "false":
        return False
    return is_celery_broker_available()


def enqueue_image_recognition(
    recognition_id: int,
    image_path: str,
    recognition_type: str,
    background_tasks: Optional[BackgroundTasks] = None,
) -> EnqueueMode:
    """
    将识别任务提交到 Celery；broker 不可用或未启用时回退。
    """
    from ..services.recognition_runner import run_image_recognition

    if should_use_celery():
        try:
            from .recognition_tasks import process_image_recognition

            process_image_recognition.delay(
                recognition_id, image_path, recognition_type
            )
            return "celery"
        except Exception:
            pass

    if background_tasks is not None:
        background_tasks.add_task(
            run_image_recognition, recognition_id, image_path, recognition_type
        )
        return "background"

    run_image_recognition(recognition_id, image_path, recognition_type)
    return "sync"
