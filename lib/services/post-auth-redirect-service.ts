"use client"

const POST_AUTH_REDIRECT_STORAGE_KEY = "post_auth_redirect"

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined"
}

function isSafeRelativePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
}

export function savePostAuthRedirect(destination: string) {
  if (!canUseStorage() || !isSafeRelativePath(destination)) {
    return
  }

  window.sessionStorage.setItem(POST_AUTH_REDIRECT_STORAGE_KEY, destination)
}

export function readPostAuthRedirect() {
  if (!canUseStorage()) {
    return null
  }

  const destination = window.sessionStorage.getItem(POST_AUTH_REDIRECT_STORAGE_KEY)

  if (!destination || !isSafeRelativePath(destination)) {
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY)
    return null
  }

  return destination
}

export function clearPostAuthRedirect() {
  if (!canUseStorage()) {
    return
  }

  window.sessionStorage.removeItem(POST_AUTH_REDIRECT_STORAGE_KEY)
}
