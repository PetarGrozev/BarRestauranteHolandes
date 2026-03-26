export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export function isSupportedProductImageType(type: string) {
  return SUPPORTED_IMAGE_TYPES.includes(type.toLowerCase());
}

export function isValidRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidProductImageValue(value: string) {
  if (!value) {
    return true;
  }

  if (value.startsWith('data:image/')) {
    return value.length <= MAX_PRODUCT_IMAGE_BYTES * 1.5 && /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(value);
  }

  return isValidRemoteImageUrl(value);
}

export async function fileToProductImageDataUrl(file: File) {
  if (!isSupportedProductImageType(file.type)) {
    throw new Error('UNSUPPORTED_TYPE');
  }

  if (file.size > MAX_PRODUCT_IMAGE_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:image/')) {
        reject(new Error('INVALID_FILE'));
        return;
      }

      resolve(result);
    };

    reader.onerror = () => reject(new Error('READ_FAILED'));
    reader.readAsDataURL(file);
  });
}