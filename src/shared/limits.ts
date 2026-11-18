/**
 * Largest value of a Postgres INT4 column (`SERIAL` ids, `orders.size`). Values above it
 * cannot be sent to the database: Prisma fails with "Unable to fit integer value".
 */
export const MAX_INT4 = 2_147_483_647;
