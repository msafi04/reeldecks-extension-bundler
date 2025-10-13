import React, { createContext, useState, useContext, useCallback } from "react";
import "./Notification.css";

const NotificationContext = createContext();

let idCounter = 0;

export function NotificationContainer() {
  const { notifications } = useContext(NotificationContext);
  return (
    <div className="notification-container">
      {notifications.map((n) => (
        <div key={n.id} className={`notification-toast ${n.type}`}>
          {n.message}
        </div>
      ))}
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = "info", duration = 3000) => {
    const id = idCounter++;
    setNotifications((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const value = {
    success: (message, duration) => notify(message, "success", duration),
    error: (message, duration) => notify(message, "error", duration),
    info: (message, duration) => notify(message, "info", duration),
  };

  return (
    <NotificationContext.Provider value={{ ...value, notifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifier = () => {
  return useContext(NotificationContext);
};
