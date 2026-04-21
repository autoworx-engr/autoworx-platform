import { useSession } from "next-auth/react";

export const useGetCurrentUser = () => {
  const { data: session } = useSession();
  return session?.user;
};
