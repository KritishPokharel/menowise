const localeMap: Record<string, string> = {
  en: "en-US",
  hi: "hi-IN",
  ne: "ne-NP",
  es: "es-ES"
};

export const formatNumber = (num: number, lang: string) => {
  const normalized = (lang || "en").split("-")[0];
  const locale = localeMap[normalized] || "en-US";
  return new Intl.NumberFormat(locale).format(num);
};
