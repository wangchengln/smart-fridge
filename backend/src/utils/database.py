"""
数据库连接与会话管理
"""
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

# 导入所有模型，注册到统一 Base.metadata
from ..models.all import Base  # noqa: F401

BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent
SQLALCHEMY_DATABASE_URL = f"sqlite:///{BACKEND_ROOT / 'smart_fridge.db'}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _set_sqlite_foreign_keys(dbapi_connection, connection_record):
    """SQLite 默认不启用外键约束，需在连接时打开。"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _ensure_recipe_image_url_column():
    """SQLite 兼容：为已有库补 image_url 列"""
    with engine.connect() as conn:
        columns = conn.execute(text("PRAGMA table_info(recipe_base)")).fetchall()
        column_names = {row[1] for row in columns}
        if "image_url" not in column_names:
            conn.execute(
                text("ALTER TABLE recipe_base ADD COLUMN image_url VARCHAR(500) DEFAULT ''")
            )
            conn.commit()


def _ensure_user_dietary_columns():
    """SQLite 兼容：为用户表补 dietary_mode / on_antihypertensive 列"""
    with engine.connect() as conn:
        columns = conn.execute(text("PRAGMA table_info(user)")).fetchall()
        column_names = {row[1] for row in columns}
        if "dietary_mode" not in column_names:
            conn.execute(
                text("ALTER TABLE user ADD COLUMN dietary_mode VARCHAR(20) DEFAULT 'normal'")
            )
        if "on_antihypertensive" not in column_names:
            conn.execute(
                text("ALTER TABLE user ADD COLUMN on_antihypertensive BOOLEAN DEFAULT 0")
            )
        conn.commit()


def init_db():
    """创建所有数据表（单一 metadata）"""
    Base.metadata.create_all(bind=engine)
    _ensure_recipe_image_url_column()
    _ensure_user_dietary_columns()
    db = SessionLocal()
    try:
        from ..crud.ingredient_base import seed_ingredient_base
        from ..crud.recipe_base import (
            seed_recipe_base,
            sync_recipe_images,
            sync_recipe_ingredient_relations,
        )

        from ..crud.coupon import seed_coupon_data
        from ..crud.inventory_savings import seed_initial_savings_logs

        seed_ingredient_base(db)
        seed_recipe_base(db)
        sync_recipe_ingredient_relations(db)
        sync_recipe_images(db)
        seed_coupon_data(db)
        seed_initial_savings_logs(db)
    finally:
        db.close()


init_db()


def get_db():
    """FastAPI 依赖：获取数据库会话，请求结束后自动关闭。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def session_scope():
    """
    非 FastAPI 场景（Celery、脚本）使用的会话上下文，确保 close。
    CRUD 层自行 commit；异常时 rollback。
    """
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
