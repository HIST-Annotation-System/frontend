import { useEffect } from 'react';

const APP_TITLE = 'HistAno';

/** Names the browser tab after the current page, and restores the app name when the page goes away. */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · ${APP_TITLE}`;
    return () => {
      document.title = APP_TITLE;
    };
  }, [title]);
}
