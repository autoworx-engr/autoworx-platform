import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { INFO_EMAIL } from "@/lib/consts";
import Image from "next/image";
import Link from "next/link";
import { CiCircleAlert } from "react-icons/ci";
import { FiHome } from "react-icons/fi";
import { MdMailOutline } from "react-icons/md";

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4">
      <Card className="w-full max-w-3xl space-y-8 p-6 md:p-12">
        <div className="space-y-4 text-center">
          <CiCircleAlert className="mx-auto h-16 w-16 text-[#00b8b0]" />
          <h1 className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            404 - Page Not Found
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-600">
            Oops! The page you&apos;re looking for doesn&apos;t exist. It might
            have been moved or deleted.
          </p>
        </div>

        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-gray-200 p-4 text-center">
            <FiHome className="mx-auto h-6 w-6 text-[#00b8b0]" />
            <p className="text-gray-600">Return to</p>
            <Link
              href="/"
              className="text-lg font-semibold text-[#00b8b0] hover:underline"
            >
              Homepage
            </Link>
          </div>
          <div className="space-y-2 rounded-lg border border-gray-200 p-4 text-center">
            <MdMailOutline className="mx-auto h-6 w-6 text-[#00b8b0]" />
            <p className="text-gray-600">Email us at</p>
            <p className="break-all text-lg font-semibold">{INFO_EMAIL}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Image
            src="/icons/autoworx-logo.svg"
            alt="Autoworx Logo"
            className="h-24 object-contain"
            width={100}
            height={100}
          />
        </div>

        <div className="text-center">
          <Button
            asChild
            className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] text-white transition-opacity hover:opacity-90"
            size="lg"
          >
            <Link href="/">Back to Homepage</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
