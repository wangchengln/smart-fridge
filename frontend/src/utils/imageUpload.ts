/** 上传前压缩图片，减小体积并避免请求超时 */

export interface PreparedUploadImage {
  previewUrl: string;
  base64: string;
}

const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;

export async function prepareImageForUpload(file: File): Promise<PreparedUploadImage> {
  const dataUrl = await readFileAsDataUrl(file);
  const compressed = await compressDataUrl(dataUrl, MAX_EDGE, JPEG_QUALITY);
  const base64 = compressed.split(',')[1] ?? '';
  if (!base64) {
    throw new Error('图片处理失败，请换一张图片重试');
  }
  return { previewUrl: compressed, base64 };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('无法读取图片'));
      }
    };
    reader.onerror = () => reject(new Error('无法读取图片'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = src;
  });
}

async function compressDataUrl(
  dataUrl: string,
  maxEdge: number,
  quality: number
): Promise<string> {
  const img = await loadImage(dataUrl);
  const { width, height } = fitWithin(img.width, img.height, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法处理图片');
  }

  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function fitWithin(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) {
    return { width, height };
  }
  const ratio = Math.min(maxEdge / width, maxEdge / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function getUploadErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (/timeout/i.test(msg)) {
      return '上传超时，请检查网络或换一张较小的图片';
    }
    if (/网络|Network|ECONNREFUSED|Failed to fetch/i.test(msg)) {
      return '无法连接服务器，请确认后端服务已启动';
    }
    if (msg && msg !== '请求失败') {
      return msg;
    }
  }
  return '上传图片失败，请稍后重试';
}
