function isLocalhostUrl(value: string) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(value)
}

export function getConfiguredAppUrl(originOverride?: string) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (configuredUrl) {
    const normalizedConfiguredUrl = configuredUrl.replace(/\/+$/, "")

    if (process.env.NODE_ENV !== "production" || !isLocalhostUrl(normalizedConfiguredUrl)) {
      return normalizedConfiguredUrl
    }
  }

  const runtimeOrigin = originOverride?.trim().replace(/\/+$/, "")

  if (runtimeOrigin && (process.env.NODE_ENV !== "production" || !isLocalhostUrl(runtimeOrigin))) {
    return runtimeOrigin
  }

  if (process.env.NODE_ENV === "production") {
    return ""
  }

  return "http://localhost:3000"
}
