self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push received with no data');
    return;
  }

  let data;

  try {
    data = event.data.json();
    console.log('[SW] JSON payload:', data);
  } catch (error) {
    const text = event.data.text();

    console.log('[SW] Non-JSON payload:', text);
    console.log('[SW] JSON parse error:', error);

    data = {
      title: 'Nexus Test',
      body: text
    };
  }

  const options = {
    body: data.body,
    tag: data.tag,
    icon: self.location.origin + '/images/Logo.png',
    badge: self.location.origin + '/images/Logo.png',
    data: {
      url: data.url
    }
  };

  console.log('[SW] Notification options:', options);

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Nexus',
      options
    )
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  let urlToOpen = event.notification.data && event.notification.data.url;

  if (urlToOpen) {
    if (urlToOpen.startsWith('/')) {
      urlToOpen = self.location.origin + urlToOpen;
    }

    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
        for (let i = 0; i < windowClients.length; i++) {
          let client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        for (let i = 0; i < windowClients.length; i++) {
          let client = windowClients[i];
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'NAVIGATE',
              url: urlToOpen
            });
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});
