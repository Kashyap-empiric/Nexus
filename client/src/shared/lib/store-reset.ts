export const storeResetHandlers = new Set<() => void>();

export const resetAllStores = () => {
  storeResetHandlers.forEach((reset) => reset());
};
