export function friendlyError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('invalid login credentials')) {
      return 'That email or password does not match.';
    }

    if (message.includes('email not confirmed')) {
      return 'Please confirm your email address first.';
    }

    if (message.includes('user already registered')) {
      return 'That email is already registered.';
    }

    if (message.includes('password should be at least')) {
      return 'Please use a longer password.';
    }

    if (message.includes('network')) {
      return 'Network problem. Please check your connection and try again.';
    }

    return error.message;
  }

  return 'Something went wrong. Please try again.';
}