export const USER_REPOSITORY = Symbol('portfolio/UserRepositoryPort');

export interface UserRepositoryPort {
  exists(userId: number): Promise<boolean>;
}
