import Link from "next/link";

interface RedirectToSettingsProps {
  message: string;
  link: string;
  linkText?: string;
}

export default function RedirectToSettings({
  message,
  link,
  linkText = "Go to settings",
}: RedirectToSettingsProps) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <span className="px-4 text-center capitalize">
        {message}
        <br />
        <br />
        <Link href={link} className="capitalize text-blue-500 underline">
          {linkText}
        </Link>
      </span>
    </div>
  );
}
