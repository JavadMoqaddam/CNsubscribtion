import { clsx, type ClassValue } from "clsx";
import { addDays, format, isThisWeek, isToday } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const calculateRemainingTime = (
  expire: number | string | undefined,
  t: (key: string) => string
) => {
  if (!expire) return t("infinity");

  let expireTimestamp;
  if (typeof expire === "number") {
    expireTimestamp = expire;
  } else if (typeof expire === "string") {
    expireTimestamp = Math.floor(new Date(expire).getTime() / 1000);
  } else {
    throw new Error("Invalid expire format");
  }

  const remainingSeconds = expireTimestamp - Math.floor(Date.now() / 1000);
  if (remainingSeconds <= 0) return t("expired");

  const days = Math.floor(remainingSeconds / (60 * 60 * 24));
  const hours = Math.floor((remainingSeconds % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((remainingSeconds % (60 * 60)) / 60);

  if (days > 0) return `${days} ${t("day")} `;
  if (hours > 0) return `${hours} ${t("hour")}`;
  return `${minutes} ${t("minute")}`;
};

interface StatusData {
  data_limit_reached?: boolean;
  expired?: boolean;
  enabled?: boolean;
  expire_strategy?: string;
  online_at?: string;
  used_traffic?: number;
  data_limit?: number;
  expire_at?: string;
  status?: string;
}

type TranslationFunction = (key: string) => string;

export function getStatus(
  data: StatusData,
  isMarzneshin: boolean,
  t: TranslationFunction
): string {
  if (isMarzneshin) {
    if (data?.data_limit_reached || data?.expired || !data?.enabled)
      return t("disabled");

    if (data?.expire_strategy === "start_on_first_use" && !data?.online_at)
      return t("on_hold");

    const isNearToExpire =
      (data?.used_traffic &&
        data?.data_limit &&
        data?.used_traffic / data?.data_limit > 0.9) ||
      (data?.expire_at && new Date(data?.expire_at) < addDays(new Date(), -3));

    return isNearToExpire ? t("nearToExpire") : t("active");
  }

  const isNearToExpire =
    (data?.used_traffic &&
      data?.data_limit &&
      data?.used_traffic / data?.data_limit > 0.9) ||
    (data?.expire_at && new Date(data?.expire_at) < addDays(new Date(), -3));

  return isNearToExpire ? t("nearToExpire") : t(data?.status as string);
}

export function extractNameFromConfigURL(url: string) {
  const namePattern = /#([^#]*)/;
  const match = namePattern.exec(url);

  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch (error) {
      console.error("Malformed URI component:", match[1], error);
      return match[1];
    }
  }

  if (url.startsWith("vmess://")) {
    const encodedString = url.replace("vmess://", "");

    try {
      const jsonText = new TextDecoder().decode(
        Uint8Array.from(atob(encodedString), (c) => c.charCodeAt(0))
      );
      const parsedData = JSON.parse(jsonText);
      return parsedData.ps ?? "Unnamed Config";
    } catch (error) {
      console.error("Invalid vmess URL format:", error);
      return "Invalid Config";
    }
  }

  return "Unknown";
}

export function formatTraffic(
  bytes: number | null,
  t: (key: string) => string
): string {
  if (bytes === null || bytes < 0) return t("infinity");

  const units = [t("B"), t("KB"), t("MB"), t("GB"), t("TB")];
  let i = 0;
  let value = bytes;

  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }

  return `${value.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return "∞";

  const date = new Date(dateString);
  if (isToday(date)) return format(date, "HH:mm");
  if (isThisWeek(date)) return format(date, "eeee HH:mm");

  return format(date, "MM dd HH:mm");
}

export function naiveAsUTC(dateString: string | null): string | null {
  if (dateString) return dateString + (dateString?.endsWith("Z") ? "" : "Z");
  else return null;
}