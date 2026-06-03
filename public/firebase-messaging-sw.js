self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const notification = payload.notification || payload.webpush?.notification || {};
  const data = {
    ...(payload.data || {}),
    ...(notification.data || {}),
  };
  const title = notification.title || data.title || 'fit.persona';
  const body = notification.body || data.body || '';

  event.waitUntil(self.registration.showNotification(title, {
    body,
    icon: notification.icon || '/fit-icon-192.png',
    badge: notification.badge || '/fit-icon-192.png',
    data: {
      url: data.url || '/',
      entity_type: data.entity_type || '',
      entity_id: data.entity_id || '',
      client_id: data.client_id || '',
      job_id: data.job_id || '',
      type: data.type || '',
    },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const targetUrl = new URL(data.url || '/', self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({
      includeUncontrolled: true,
      type: 'window',
    });

    for (const client of windowClients) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin !== self.location.origin) {
        continue;
      }

      if ('navigate' in client) {
        await client.navigate(targetUrl);
      }

      if ('focus' in client) {
        return client.focus();
      }
    }

    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }

    return undefined;
  })());
});
