"""
SQLAlchemy 统一声明基类
所有 ORM 模型必须从此处导入 Base，以支持跨表外键与 relationship。
"""
from sqlalchemy.orm import declarative_base

Base = declarative_base()
