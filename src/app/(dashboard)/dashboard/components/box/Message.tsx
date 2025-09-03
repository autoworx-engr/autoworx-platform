import Image from "next/image";
import Link from "next/link";

type TMessageProps = {
  communicationType: string;
  userName: string;
  message: string;
  photoUrl?: string;
  redirectUrl?: string;
};

export function Message({
  communicationType,
  userName,
  message,
  redirectUrl,
  photoUrl = "/images/default.png",
}: TMessageProps) {
  return (
    <Link
      href={redirectUrl ?? "#"}
      className="relative flex w-full flex-col gap-x-2 rounded-md border p-2 px-2 xl:flex-row xl:items-start"
    >
      <Image width={60} height={60} src={photoUrl} alt="" />

      <div>
        <p className="mb-2 font-semibold pr-8">{userName}</p>
        <p>{message}</p>
      </div>
      <span className="absolute right-2 top-2 rounded-md bg-emerald-600 px-2 py-1 text-xs text-white">
        {communicationType}
      </span>
    </Link>
  );
}
