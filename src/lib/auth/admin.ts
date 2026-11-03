import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./session";

/** Role comes from the database via getSessionUser. Non-admins get a 404, so the area looks like it does not exist. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mock || user.role !== "admin") notFound();
  return user;
}
