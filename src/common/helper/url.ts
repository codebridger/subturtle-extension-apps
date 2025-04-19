export function joinToBaseUrl(path: string) {
  let base_url = process.env.SUBTURTLE_API_URL || "";

  // if base_url has a trailing slash, remove it
  if (base_url.endsWith("/")) {
    base_url = base_url.slice(0, -1);
  }

  // If the path is a full URL, return it
  if (path.startsWith("http")) {
    return path;
  }

  // If the path is a relative URL, return it
  else if (!path.startsWith("/")) {
    path = "/" + path;
  }

  return base_url + path;
}
