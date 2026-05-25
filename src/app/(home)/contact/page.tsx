import ContactUs from "../components/landing-page/Contact";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with us. We'd love to hear from you.",
};

export default function ContactPage() {
  return <ContactUs />;
}
