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
      className="relative w-full rounded-md border p-2 px-2 xl:flex-row xl:items-start"
    >
      <div className="flex items-center gap-2">
        <Image
          width={60}
          height={60}
          src={photoUrl}
          alt=""
          className="rounded-lg"
        />

        <div>
          <p className="font-semibold flex flex-1">
            {userName.length > 20 ? userName.slice(0, 20) + "..." : userName}
          </p>
          <span className="rounded-md bg-emerald-600 px-2 py-1 text-xs text-white">
            {communicationType}
          </span>
        </div>
      </div>
      <p className="mt-2">{message}</p>
    </Link>
  );
}
