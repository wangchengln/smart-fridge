import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Camera, Check, X, ImagePlus } from 'lucide-react';
import {
  useUploadAndRecognizeImage,
  useRecognitionStatus,
  useConfirmRecognition,
} from '../hooks/queries/useImageRecognitionQueries';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import MeituanCard from '../components/ui/MeituanCard';
import type { RecognizedIngredientItem } from '../types/api';
import { getUploadErrorMessage, prepareImageForUpload } from '../utils/imageUpload';

type RecognitionType = 'fridge' | 'shopping_bag';

const CameraPage = () => {
  const { userId } = useAuth();
  const [recognitionType, setRecognitionType] = useState<RecognitionType>('fridge');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [recognitionId, setRecognitionId] = useState<number | null>(null);
  const [results, setResults] = useState<RecognizedIngredientItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useUploadAndRecognizeImage();
  const { data: statusData } = useRecognitionStatus(recognitionId);
  const confirmMutation = useConfirmRecognition();

  const isProcessing = Boolean(
    uploadMutation.isPending ||
      (recognitionId &&
        statusData?.status !== 'completed' &&
        statusData?.status !== 'failed')
  );

  const progress = statusData?.progress ?? (uploadMutation.isPending ? 10 : 0);

  useEffect(() => {
    if (!statusData) return;
    if (statusData.status === 'completed') {
      setResults(statusData.ingredients ?? []);
      setError(null);
    } else if (statusData.status === 'failed') {
      setError(statusData.error_message ?? '识别失败');
    }
  }, [statusData]);

  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!userId) {
      setError('请先登录后再上传图片');
      return;
    }

    setIsPreparing(true);
    setResults([]);
    setError(null);
    setRecognitionId(null);

    try {
      const { previewUrl, base64 } = await prepareImageForUpload(file);
      setUploadedImage(previewUrl);

      const data = await uploadMutation.mutateAsync({
        image: base64,
        recognition_type: recognitionType,
        user_id: userId,
      });
      setRecognitionId(data.recognition_id);
    } catch (err) {
      console.error('上传图片失败:', err);
      setError(getUploadErrorMessage(err));
    } finally {
      setIsPreparing(false);
    }
  };

  const handleConfirm = async () => {
    if (!recognitionId || !userId) return;
    try {
      await confirmMutation.mutateAsync({
        recognition_id: recognitionId,
        user_id: userId,
        confirmed_ingredients: results,
      });
      alert('识别结果已确认并添加到库存');
      resetPage();
    } catch (err) {
      console.error('确认识别结果失败:', err);
      alert('确认失败，请稍后重试');
    }
  };

  const handleEdit = (
    index: number,
    field: keyof RecognizedIngredientItem,
    value: string | number
  ) => {
    setResults((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const resetPage = () => {
    setUploadedImage(null);
    setResults([]);
    setRecognitionId(null);
    setError(null);
    setIsPreparing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="animate-fade-in space-y-4">
      <p className="text-sm text-mt-text-secondary">上传图片，AI 智能识别食材并入库</p>

      {/* 类型切换 - 美团分段控件 */}
      <div className="flex rounded-xl bg-white p-1 shadow-sm">
        {(['fridge', 'shopping_bag'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setRecognitionType(type)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-all ${
              recognitionType === type
                ? 'bg-mt-yellow text-mt-text shadow-sm'
                : 'text-mt-text-secondary'
            }`}
          >
            {type === 'fridge' ? '🧊 冰箱识别' : '🛍️ 购物袋识别'}
          </button>
        ))}
      </div>

      {!uploadedImage ? (
        <label className="block cursor-pointer">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-mt-yellow/50 bg-mt-yellow-light/50 py-16 transition-colors hover:border-mt-yellow">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-mt-yellow shadow-float">
              <ImagePlus className="h-8 w-8 text-mt-text" />
            </div>
            <p className="font-medium text-mt-text">点击拍照或上传图片</p>
            <p className="mt-1 text-xs text-mt-text-muted">支持 JPG、PNG，上传前会自动压缩</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
        </label>
      ) : (
        <div className="space-y-4">
          <MeituanCard className="!p-0 overflow-hidden">
            <div className="flex min-h-48 max-h-[min(70vh,28rem)] w-full items-center justify-center bg-mt-gray-100">
              <img
                src={uploadedImage}
                alt="上传的图片"
                className="max-h-[min(70vh,28rem)] w-full object-contain"
              />
            </div>
          </MeituanCard>

          {isPreparing && (
            <MeituanCard>
              <p className="text-center text-sm text-mt-text-secondary">正在处理并上传图片...</p>
            </MeituanCard>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-center">
              <p className="text-sm text-mt-red">{error}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={resetPage}>
                重新上传
              </Button>
            </div>
          )}

          {isProcessing && !error && !isPreparing && (
            <MeituanCard>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-mt-text">AI 识别中</span>
                <span className="text-mt-orange">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-mt-gray-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mt-yellow to-mt-orange transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </MeituanCard>
          )}

          {results.length > 0 && (
            <MeituanCard>
              <h3 className="mb-3 font-bold text-mt-text">
                识别结果 <span className="text-mt-orange">({results.length})</span>
              </h3>
              <div className="space-y-2">
                {results.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-xl bg-mt-gray-50 p-3"
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleEdit(index, 'name', e.target.value)}
                      className="flex-1 rounded-lg border-0 bg-white px-2 py-1.5 text-sm font-medium focus:ring-2 focus:ring-mt-yellow/50"
                    />
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleEdit(index, 'quantity', parseFloat(e.target.value))
                      }
                      className="w-14 rounded-lg border-0 bg-white px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-mt-yellow/50"
                    />
                    <span className="text-xs text-emerald-600 font-medium">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setResults((prev) => prev.filter((_, i) => i !== index))}
                      className="rounded-lg p-1.5 text-mt-red hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={resetPage}>
                  重新上传
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={handleConfirm}
                  disabled={confirmMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                  确认入库
                </Button>
              </div>
            </MeituanCard>
          )}
        </div>
      )}

      <MeituanCard className="bg-mt-yellow-light/50 !p-3">
        <p className="text-xs text-mt-text-secondary">
          <Camera className="mr-1 inline h-3.5 w-3.5" />
          提示：拍摄时保持光线充足，食材清晰可见识别更准确
        </p>
      </MeituanCard>
    </div>
  );
};

export default CameraPage;
