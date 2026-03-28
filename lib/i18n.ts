import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { resources } from "@/i18n/resources";

const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
const fallbackLanguage = Object.keys(resources).includes(deviceLanguage) ? deviceLanguage : "en";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: fallbackLanguage,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    keySeparator: ".",
    returnNull: false
  });
}

export default i18n;
