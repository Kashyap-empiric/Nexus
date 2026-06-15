import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export type SettingsTab = 'profile' | 'appearance' | 'notifications';

export const useSettingsModal = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTab = searchParams.get('settings') as SettingsTab | null;
  const isOpen = !!currentTab;

  const openSettings = useCallback(
    (tab: SettingsTab) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('settings', tab);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const closeSettings = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('settings');
    const newParams = params.toString();
    router.push(newParams ? `${pathname}?${newParams}` : pathname);
  }, [router, pathname, searchParams]);

  return {
    isOpen,
    currentTab,
    openSettings,
    closeSettings,
  };
};
