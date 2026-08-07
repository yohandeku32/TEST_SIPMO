export type ApiResult<T> = T & {
  success: boolean;
  message?: string;
};

const assertApiUrl = (apiUrl: string) => {
  if (!apiUrl.trim()) {
    throw new Error('URL Google Apps Script belum diatur.');
  }
};

export async function getReviewAction<T>(
  apiUrl: string,
  action: string,
  params: Record<string, string> = {},
): Promise<ApiResult<T>> {
  assertApiUrl(apiUrl);

  const url = new URL(apiUrl);
  url.searchParams.set('action', action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== '') url.searchParams.set(key, value);
  });

  url.searchParams.set('_t', String(Date.now()));

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Server merespons ${response.status}.`);
  }

  const result = (await response.json()) as ApiResult<T>;
  if (!result.success) {
    throw new Error(result.message || 'Permintaan ke server gagal.');
  }

  return result;
}

export async function postReviewAction<T>(
  apiUrl: string,
  payload: Record<string, unknown>,
): Promise<ApiResult<T>> {
  assertApiUrl(apiUrl);

  const response = await fetch(apiUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Server merespons ${response.status}.`);
  }

  const result = (await response.json()) as ApiResult<T>;
  if (!result.success) {
    throw new Error(result.message || 'Permintaan ke server gagal.');
  }

  return result;
}

export const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1];
      if (!base64) {
        reject(new Error('File gagal dikonversi.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('File gagal dibaca.'));
  });

export const toBoolean = (value: boolean | string): boolean => {
  if (value === true) return true;
  const normalized = String(value || '').trim().toUpperCase();
  return ['TRUE', 'YA', 'SUDAH', '1'].includes(normalized);
};
