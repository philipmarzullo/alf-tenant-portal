import { createContext, useContext, useState, useCallback } from 'react';

const DashboardDataContext = createContext({
  activeDomain: null,
  data: null,
  filters: null,
  setDashboardData: () => {},
});

export function DashboardDataProvider({ children }) {
  const [state, setState] = useState({ activeDomain: null, data: null, filters: null });

  const setDashboardData = useCallback(({ domain, data, filters }) => {
    setState({ activeDomain: domain, data: data || null, filters: filters || null });
  }, []);

  return (
    <DashboardDataContext.Provider value={{ ...state, setDashboardData }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardDataContext() {
  return useContext(DashboardDataContext);
}
