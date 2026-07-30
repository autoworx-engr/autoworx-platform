import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communication Hub - Client",
  description: "Manage client and supplier collaboration",
};

type TProps = {
  params?: {
    id: string;
  };
  searchParams?: {
    filter: string;
    search: string;
  };
};

export default function ClientListPage() {
  return null;
}
