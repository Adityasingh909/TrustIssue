import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * Hook to monitor and query the backend health state.
 */
export function useHealth(pollIntervalMs = 15000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const checkHealth = useCallback(async () => {
    try {
      setLoading(true);
      const healthData = await api.getHealth();
      setData(healthData);
      setError(null);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    if (pollIntervalMs > 0) {
      const interval = setInterval(checkHealth, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [checkHealth, pollIntervalMs]);

  return { data, loading, error, refetch: checkHealth };
}
