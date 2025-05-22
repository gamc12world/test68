import React, { useContext } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

const NotificationList: React.FC = () => {
  const { notifications, markAsRead } = useNotifications();

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  return (
    <ul style={{ listStyle: 'none', padding: 0 }}>
      {notifications.map((notification) => (
        <li
          key={notification.id}
          style={{
            padding: '10px',
            borderBottom: '1px solid #eee',
            fontWeight: notification.read ? 'normal' : 'bold',
            cursor: 'pointer',
            backgroundColor: notification.read ? '#f9f9f9' : '#fff',
          }}
          onClick={() => handleNotificationClick(notification.id)}
        >
          {notification.message}
        </li>
      ))}
    </ul>
  );
};

export default NotificationList;