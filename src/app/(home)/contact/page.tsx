import ContactUs from "../components/landing-page/Contact";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
};

export default function ContactPage() {
  return <ContactUs />;
}
