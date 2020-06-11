export async function userAuth(ctx, next): Promise<void> {
  if (!ctx.session) {
    return ctx.throw(400);
  }
  if (!ctx.session.loggedInUser) {
    return ctx.throw(401);
  }

  await next();
}
