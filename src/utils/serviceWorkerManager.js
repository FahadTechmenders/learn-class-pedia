/**
 * Service Worker Manager
 * Handles registration, messaging, and cache management
 */

let swRegistration = null;
let messageHandlers = new Map();

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('[SW Manager] Service Workers not supported');
    return null;
  }

  try {
    swRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });

    console.log('[SW Manager] ✅ Service Worker registered:', swRegistration.scope);

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration.installing;
      console.log('[SW Manager] 🔄 Service Worker update found');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW Manager] ⚡ New Service Worker available, reload to update');
        }
      });
    });

    navigator.serviceWorker.addEventListener('message', handleMessage);

    await navigator.serviceWorker.ready;
    console.log('[SW Manager] ✅ Service Worker ready');

    return swRegistration;
  } catch (error) {
    console.error('[SW Manager] ❌ Service Worker registration failed:', error);
    return null;
  }
}

export function unregisterServiceWorker() {
  if (swRegistration) {
    swRegistration.unregister().then(() => {
      console.log('[SW Manager] Service Worker unregistered');
    });
  }
}

function handleMessage(event) {
  const { type, ...data } = event.data;

  const handlers = messageHandlers.get(type);
  if (handlers) {
    handlers.forEach(handler => handler(data));
  }
}

export function onServiceWorkerMessage(type, handler) {
  if (!messageHandlers.has(type)) {
    messageHandlers.set(type, new Set());
  }
  messageHandlers.get(type).add(handler);

  return () => {
    const handlers = messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  };
}

export async function sendMessageToServiceWorker(type, data) {
  if (!navigator.serviceWorker.controller) {
    console.warn('[SW Manager] No active Service Worker controller');
    return null;
  }

  navigator.serviceWorker.controller.postMessage({ type, data });
}

export async function sendMessageWithResponse(type, data) {
  if (!navigator.serviceWorker.controller) {
    throw new Error('No active Service Worker controller');
  }

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();

    messageChannel.port1.onmessage = (event) => {
      if (event.data.success) {
        resolve(event.data);
      } else {
        reject(new Error(event.data.error || 'Service Worker error'));
      }
    };

    navigator.serviceWorker.controller.postMessage(
      { type, data },
      [messageChannel.port2]
    );
  });
}

export async function cacheManuscripts(files, baseUrl) {
  const token = localStorage.getItem('adminToken');
  
  const filesWithToken = files.map(file => ({
    url: file.fileUrl || file.url,
    filename: file.filename || '',
    token: token,
    baseUrl: baseUrl
  }));

  await sendMessageToServiceWorker('CACHE_MANUSCRIPTS', filesWithToken);
}

export async function getCacheStats() {
  try {
    const response = await sendMessageWithResponse('GET_CACHE_STATS');
    return response.stats;
  } catch (error) {
    console.error('[SW Manager] Failed to get cache stats:', error);
    return null;
  }
}

export async function clearManuscriptCache() {
  try {
    const response = await sendMessageWithResponse('CLEAR_CACHE');
    return response.deleted;
  } catch (error) {
    console.error('[SW Manager] Failed to clear cache:', error);
    return false;
  }
}

export async function removeFromCache(url) {
  try {
    const response = await sendMessageWithResponse('REMOVE_FROM_CACHE', { url });
    return response.deleted;
  } catch (error) {
    console.error('[SW Manager] Failed to remove from cache:', error);
    return false;
  }
}

export async function getCachedUrls() {
  try {
    const response = await sendMessageWithResponse('GET_CACHED_URLS');
    return response.urls || [];
  } catch (error) {
    console.error('[SW Manager] Failed to get cached URLs:', error);
    return [];
  }
}

export function isServiceWorkerSupported() {
  return 'serviceWorker' in navigator;
}

export function isServiceWorkerActive() {
  return navigator.serviceWorker && navigator.serviceWorker.controller;
}

/**
 * Waits for the Service Worker to take control of the page.
 * On first load the SW is registered/activated but `controller` is null
 * until a `controllerchange` event fires. This resolves once the SW is
 * controlling the page, or false after the timeout.
 */
export async function waitForServiceWorkerActive(timeoutMs = 10000) {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  if (navigator.serviceWorker.controller) {
    return true;
  }

  // Ensure the SW is at least registered and activated
  try {
    await navigator.serviceWorker.ready;
  } catch (e) {
    // ignore
  }

  if (navigator.serviceWorker.controller) {
    return true;
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      clearInterval(pollId);
      clearTimeout(timeoutId);
      resolve(result);
    };

    const onControllerChange = () => finish(true);

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Poll as a fallback in case controllerchange doesn't fire
    const pollId = setInterval(() => {
      if (navigator.serviceWorker.controller) {
        finish(true);
      }
    }, 100);

    const timeoutId = setTimeout(() => finish(!!navigator.serviceWorker.controller), timeoutMs);
  });
}
