export const ADMIN_EMAIL = "Greg@Confluity.co.uk";

/**
 * Check if the current user is an admin
 * @returns True if admin, false otherwise
 */
export function isAdmin(): boolean {
  return localStorage.getItem("tcof_user") === ADMIN_EMAIL;
}

/**
 * Log in a user
 * @param email The email to log in with
 * @returns True if login successful, false otherwise
 */
export function login(email: string): boolean {
  if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    localStorage.setItem("tcof_user", ADMIN_EMAIL);
    return true;
  }
  return false;
}

/**
 * Log out the current user
 */
export function logout(): void {
  localStorage.removeItem("tcof_user");
}