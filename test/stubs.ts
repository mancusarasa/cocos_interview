/**
 * Replaces PrismaService so e2e tests do not need a database. Feature fakes live next to
 * their feature, in `src/<feature>/testing/`.
 */
export const prismaStub = {
  $connect: async () => undefined,
  $disconnect: async () => undefined,
};
