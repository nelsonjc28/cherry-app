import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { bootstrapAnalyticsConsent, trackPageView } from '../../utils/analytics';

export default function Ga4RouteTracker() {
  const location = useLocation();

  useEffect(() => {
    bootstrapAnalyticsConsent();
  }, []);

  useEffect(() => {
    trackPageView(`${location.pathname}${location.search}`, document.title);
  }, [location.pathname, location.search]);

  return null;
}
