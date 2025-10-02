import { INFO_EMAIL } from "@/lib/consts";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#024B5A] py-16 text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Contact Section */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Any Questions?</h2>
            <p className="text-gray-300">We are here to help!</p>

            <div className="space-y-2">
              <h3 className="text-lg">Email</h3>
              <a href="mailto:autoworx@autoworx.com" className="text-xl">
                {INFO_EMAIL}
              </a>
            </div>
          </div>

          {/* Explore Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Solutions</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#crm" className="hover:text-[#00B8D4]">
                  CRM
                </Link>
              </li>
              <li>
                <Link href="/#invoicing" className="hover:text-[#00B8D4]">
                  Invoicing
                </Link>
              </li>
              <li>
                <Link href="/#task-management" className="hover:text-[#00B8D4]">
                  Scheduling
                </Link>
              </li>
              <li>
                <Link href="/#task-management" className="hover:text-[#00B8D4]">
                  Task Management
                </Link>
              </li>
              <li>
                <Link href="/#team-management" className="hover:text-[#00B8D4]">
                  Team Management
                </Link>
              </li>
              <li>
                <Link href="/#crm" className="hover:text-[#00B8D4]">
                  Workflows
                </Link>
              </li>
              <li>
                <Link
                  href="/#inventory-tracking"
                  className="hover:text-[#00B8D4]"
                >
                  Inventory
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Section */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/#pricing" className="hover:text-[#00B8D4]">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/under-cons" className="hover:text-[#00B8D4]">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#00B8D4]">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="hover:text-[#00B8D4]"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-[#00B8D4]">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Logo Section */}
          <div className="flex items-center justify-center md:justify-end">
            <div className="space-y-2">
              <div className="w-full">
                <Image
                  src="/icons/footerLogo.png"
                  alt="Autoworx Logo"
                  width={200}
                  height={100}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
