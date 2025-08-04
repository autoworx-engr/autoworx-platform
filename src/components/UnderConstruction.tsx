import { Card } from "@/components/ui/card";
import { INFO_EMAIL } from "@/lib/consts";
import Image from "next/image";
import Link from "next/link";
import { FaHome } from "react-icons/fa";
import { LuConstruction, LuMail } from "react-icons/lu";

export default function UnderConstruction() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-white to-gray-100 p-4">
      <Card className="w-full max-w-3xl space-y-8 p-6 md:p-12">
        <div className="space-y-4 text-center">
          <LuConstruction className="mx-auto h-16 w-16 text-[#00b8b0]" />
          <h1 className="bg-gradient-to-r from-[#00b8b0] to-[#0098da] bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl">
            Under Construction
          </h1>
          <p className="mx-auto max-w-xl text-lg text-gray-600">
            We&apos;re working hard to bring you something amazing. Our website
            is currently under construction, but we&apos;re still here to help!
          </p>
        </div>

        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-1">
          <div className="space-y-2 rounded-lg border border-gray-200 p-4 text-center">
            <LuMail className="mx-auto h-6 w-6 text-[#00b8b0]" />
            <p className="text-gray-600">Email us at</p>
            <p className="break-all text-lg font-semibold">{INFO_EMAIL}</p>
          </div>
        </div>

        <div className="flex justify-center">
          <Image
            src="/icons/autoworx-logo.svg"
            alt="phone"
            width={200}
            height={200}
          />
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="mx-auto flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-[#00b8b0] to-[#0098da] px-10 py-3 text-white transition-opacity hover:opacity-90"
          >
            <FaHome />
            Go Home
          </Link>
        </div>
      </Card>
    </div>
  );
}
