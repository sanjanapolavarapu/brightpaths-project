import type { RecipientFilters } from "./types";

export function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function idOf(value: FormDataEntryValue | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export function tagIdsFrom(formData: FormData) {
  return formData
    .getAll("tag")
    .map((value) => Number(value))
    .filter((id) => Number.isInteger(id) && id > 0);
}

export function filtersFrom(formData: FormData): RecipientFilters {
  const role = text(formData, "role");
  return {
    role: role === "volunteer" || role === "intern" ? role : "",
    backgroundApproved: formData.get("background") === "approved",
    includeArchived: formData.get("archived") === "1",
    tagIds: tagIdsFrom(formData),
  };
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function validPhone(phone: string) {
  const digits = phone.replace(/\D/g, "").length;
  return digits >= 10 && digits <= 15;
}

export function adminPath(requested: string, fallback: string) {
  const path = requested.split("#")[0] ?? "";
  if (!path.startsWith("/admin/") || path.includes("//") || path.includes("\\") || path.includes("..")) {
    return fallback;
  }
  return path;
}

export function withParam(path: string, key: string, value: string) {
  const [pathname, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  return `${pathname}?${params.toString()}`;
}

export function uniqueEmail(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}
