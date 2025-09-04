import NotFound from "@/components/NotFound";
import getUser from "@/lib/getUser";

export default async function NotFoundPage() {
  const user = await getUser();
  return <NotFound user={user} />;
}
