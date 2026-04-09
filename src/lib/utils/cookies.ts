/**
 * Utility per la gestione dei cookie lato client.
 */

export const setCookie = (name: string, value: string, days?: number) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax; Secure";
};

export const getCookie = (name: string) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
};

export const deleteCookie = (name: string) => {
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
};

/**
 * Verifica se l'utente ha fornito il consenso per una specifica categoria
 * @param category 'analytics' | 'marketing' | 'essential'
 */
export const hasConsent = (category: 'analytics' | 'marketing' | 'essential'): boolean => {
  if (typeof window === 'undefined') return false;
  
  const mainConsent = getCookie('vibemeet_consent');
  if (mainConsent === 'all') return true;
  if (mainConsent === 'essential' && category === 'essential') return true;
  
  return getCookie(`vibemeet_` + category) === 'true';
};
