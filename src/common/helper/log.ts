export function log(...arg: any[]) {
  console.log("[Subturtle]", ...arg);
}

export function warn(...arg: any[]) {
  console.warn("[Subturtle]", ...arg);
}

export function debug(...arg: any[]) {
  if (process.env.NODE_ENV !== "production") {
    console.debug("[Subturtle]", ...arg);
  }
}

export function error(...arg: any[]) {
  console.error("[Subturtle]", ...arg);
}
