import { getConnection, createConnection } from "typeorm";

export async function typeormConnection(ctx, next): Promise<void> {
  try {
    getConnection();
  } catch (error) {
    await createConnection();
  }

  await next();
}
