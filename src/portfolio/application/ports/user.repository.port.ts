export const USER_REPOSITORY = Symbol('USER_REPOSITORY');

export interface UserRepositoryPort {
  exists(userId: number): Promise<boolean>;
}
