import { useState, useEffect } from 'react';

/**
 * Custom hook that behaves like useState but persists the value to sessionStorage.
 * @param {string} key - Unique key for sessionStorage
 * @param {any} defaultValue - Initial value if none exists in storage
 * @returns [state, setState] pair
 */
function useSessionState(key, defaultValue) {
  // Initialize state with stored value or default
  const [state, setState] = useState(() => {
    try {
      const storedValue = sessionStorage.getItem(key);
      if (storedValue !== null) {
        return JSON.parse(storedValue);
      }
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
    }
    return defaultValue;
  });

  // Update sessionStorage whenever state changes
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key, state]);

  return [state, setState];
}

export default useSessionState;
