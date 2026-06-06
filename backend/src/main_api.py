"""
FastAPI 应用主入口
"""
from pathlib import Path

from dotenv import load_dotenv

# 加载 backend/.env（DeepSeek API Key 等）
BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_ROOT / ".env")

from src.config.settings import get_settings

get_settings.cache_clear()

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .routes import (
    user_router,
    ingredient_router,
    image_recognition_router,
    recipe_router,
    purchase_router,
    coupon_router,
    scenario_router,
    fridge_agent_router,
)
from .utils.response_wrapper import (
    UnifiedResponseMiddleware,
    http_exception_handler,
    validation_exception_handler,
)

# 确保静态文件目录存在
(BACKEND_ROOT / "static" / "images").mkdir(parents=True, exist_ok=True)
(BACKEND_ROOT / "static" / "images" / "recipes").mkdir(parents=True, exist_ok=True)
(BACKEND_ROOT / "static" / "images" / "ingredients").mkdir(parents=True, exist_ok=True)
(BACKEND_ROOT / "static" / "images" / "ingredients" / "categories").mkdir(parents=True, exist_ok=True)
(BACKEND_ROOT / "static" / "images" / "home").mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="智能云冰箱API",
    description="智能云冰箱后端API接口",
    version="1.0.0",
)

# 先注册响应包装，再注册 CORS（最外层），避免包装层重建 Response 时丢失 CORS 头
app.add_middleware(UnifiedResponseMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://127.0.0.1:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)

app.include_router(user_router)
app.include_router(ingredient_router)
app.include_router(image_recognition_router)
app.include_router(recipe_router)
app.include_router(purchase_router)
app.include_router(coupon_router)
app.include_router(scenario_router)
app.include_router(fridge_agent_router)

app.mount("/static", StaticFiles(directory=str(BACKEND_ROOT / "static")), name="static")


@app.get("/")
def read_root():
    """根路径接口"""
    return {"message": "智能云冰箱API服务运行中"}


@app.get("/health")
def health_check():
    """健康检查接口"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
