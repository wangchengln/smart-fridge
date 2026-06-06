from sqlalchemy.orm import Session
from ..models.user import User as UserModel
from ..schemas.user import UserCreate, ParentModeUpdate, UserUpdate

def get_user_by_phone(db: Session, phone: str):
    """根据手机号查询用户"""
    return db.query(UserModel).filter(UserModel.phone == phone).first()

def create_user(db: Session, user: UserCreate):
    """创建新用户"""
    db_user = UserModel(
        phone=user.phone,
        nickname=f"用户{user.phone[-4:]}",  # 默认昵称
        family_count=1,
        family_type="default",
        parent_mode=False
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_parent_mode(db: Session, user_id: int, parent_mode: ParentModeUpdate):
    """更新爸妈模式"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if db_user:
        db_user.parent_mode = parent_mode.parent_mode
        db.commit()
        db.refresh(db_user)
    return db_user

def get_user_by_id(db: Session, user_id: int):
    """根据用户ID查询用户"""
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def _sync_parent_mode_from_dietary(db_user):
    """dietary_mode=parents 时同步 parent_mode 开关"""
    mode = getattr(db_user, "dietary_mode", "normal") or "normal"
    db_user.parent_mode = mode == "parents"


def update_user(db: Session, user_id: int, user_update: UserUpdate):
    """更新用户信息"""
    db_user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not db_user:
        return None

    update_data = user_update.model_dump(exclude_unset=True)

    if "dietary_mode" in update_data and update_data["dietary_mode"]:
        mode = update_data["dietary_mode"]
        if mode not in ("normal", "fat_loss", "parents"):
            update_data["dietary_mode"] = "normal"

    for field, value in update_data.items():
        setattr(db_user, field, value)

    if "dietary_mode" in update_data:
        _sync_parent_mode_from_dietary(db_user)
    elif "parent_mode" in update_data and update_data["parent_mode"]:
        db_user.dietary_mode = "parents"
    elif "parent_mode" in update_data and not update_data["parent_mode"]:
        if db_user.dietary_mode == "parents":
            db_user.dietary_mode = "normal"

    db.commit()
    db.refresh(db_user)
    return db_user
