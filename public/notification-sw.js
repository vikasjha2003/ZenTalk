self.addEventListener('notificationclick', event => {
  event.notification.close();

  const chatId = event.notification.data?.chatId;

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existingClient = allClients[0];

    if (existingClient) {
      existingClient.focus();
      existingClient.postMessage({
        type: 'zentalk-notification-click',
        chatId,
      });
      return;
    }

    const nextClient = await self.clients.openWindow('/');
    nextClient?.postMessage({
      type: 'zentalk-notification-click',
      chatId,
    });
  })());
});
