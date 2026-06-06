from datetime import datetime

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from .base import Base


class ImageRecognition(Base):
    """图片识别记录表模型"""

    __tablename__ = "image_recognition"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="识别记录ID")
    user_id = Column(
        Integer, ForeignKey("user.id"), nullable=False, default=0, comment="用户ID"
    )
    image_path = Column(String(255), nullable=False, default="", comment="图片存储路径")
    recognition_type = Column(
        String(20), nullable=False, default="fridge", comment="识别类型"
    )
    recognition_result = Column(Text, nullable=True, comment="识别结果(JSON格式)")
    status = Column(String(20), nullable=False, default="pending", comment="识别状态")
    created_at = Column(
        DateTime, nullable=False, default=datetime.utcnow, comment="创建时间"
    )
    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        comment="更新时间",
    )

    user = relationship("User", back_populates="image_recognitions")
