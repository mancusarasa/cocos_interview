export class UserNotFoundError extends Error {
  constructor(public readonly userId: number) {
    super(`User ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}
