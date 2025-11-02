"use client";
import { cn } from "@/lib/cn";
import { INFO_EMAIL } from "@/lib/consts";
import { sendMail } from "@/lib/mailgun";
import { Chakra_Petch } from "next/font/google";
import Image from "next/image";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
const chakra_petch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["500"],
});

const inputClass =
  "h-10 md:w-96 w-full rounded-md border border-[#26AADF] pl-2 placeholder:text-xl focus:border-[#bde7f1] focus:outline-none focus:ring-1 focus:ring-[#bde7f1]";

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    businessName: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchCRMToken = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/awx-crm`
        );
        if (response.ok) {
          const data = await response.json();
          setDemoToken(data.token);
        }
      } catch (error) {
        console.error("Failed to fetch awx-crm token:", error);
      }
    };

    fetchCRMToken();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!demoToken) {
      toast.error("Service unavailable. Please try again later.");
      return;
    }

    setIsSubmitting(true);
    try {
      const opportunitySource = `${formData.businessName ?? ""}`;
      const leadResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/lead-generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-TOKEN": demoToken,
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            serviceId: 1,
            message: "",
            opportunity_source: opportunitySource,
          }),
        }
      );

      if (leadResponse.ok) {
        toast.success("Contact request submitted successfully!");
        const emailBody = `
      Hello,
      A new demo request has been submitted with the following details:

      Name: ${formData.name}
      Phone: ${formData.phone}
      Email: ${formData.email}
      Business Name: ${formData.businessName}

      Please follow up with the requester as soon as possible.
      Best regards,
      Autoworx.
    `;

        await fetch("/api/contactus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: "info@autoworx.tech",
            subject: "Demo Request",
            text: emailBody,
          }),
        });

        // Reset form
        setFormData({
          name: "",
          phone: "",
          email: "",
          businessName: "",
        });
      } else {
        const errorData = await leadResponse.json();
        toast.error(`Failed to submit contact request: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Failed to send email. Please try again.");
    }
  };
  return (
    <div className="bg-[#bde7f1] pb-20 pt-32 md:px-20 xl:pt-40">
      <div
        style={chakra_petch.style}
        className="container mx-auto flex min-h-screen flex-col items-center justify-center gap-y-10"
      >
        {/* why choose */}
        <div
          className="mx-5 max-w-4xl rounded-md px-5 py-12 text-white shadow-md md:mx-0 md:px-20"
          style={{
            background: "linear-gradient(to right, #083D45, #0B5662, #1497AB)",
          }}
        >
          <h3 className="mb-10 text-center text-xl font-bold">
            Why Choose Autoworx?
          </h3>
          <ul className="flex flex-col gap-y-8 text-center md:text-start md:text-xl">
            <li>
              {" "}
              • Accuracy You Can Trust: Avoid manual errors and provide precise
              quotes every time.
            </li>
            <li>
              {" "}
              • Efficiency Boost: Free up time for your team to focus on what
              matters—serving your customers.
            </li>
            <li>
              {" "}
              • Reduced Training Costs: Eliminate the need for extensive
              employee training. New team members can start generating estimates
              confidently from day one.
            </li>
            <li>
              {" "}
              • Professional Image: Impress your customers with polished,
              consistent, and reliable estimates.
            </li>
            <li>
              {" "}
              • Flexible Scaling: Perfect for small shops or multi-location
              enterprises.
            </li>
          </ul>
        </div>
        {/* contact section */}
        <div className="mx-5 flex w-[90%] max-w-4xl flex-col items-center gap-x-10 bg-white py-4 shadow-md md:mx-0 md:w-full md:flex-row md:p-16">
          {/* contact form  */}
          <div className="flex w-full flex-col p-4 sm:p-5 md:px-0">
            <h1 className="bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text py-5 text-center text-4xl font-bold text-transparent md:mb-2 md:ml-5 md:pl-4 md:text-left md:text-6xl md:text-[62px]">
              Contact Us
            </h1>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col items-center justify-center gap-y-5 md:text-xl"
            >
              <input
                className={inputClass}
                type="text"
                name="name"
                placeholder="Name"
                onChange={handleChange}
                required
              />
              <input
                className={inputClass}
                type="phone"
                name="phone"
                placeholder="Phone"
                onChange={handleChange}
                required
              />
              <input
                className={inputClass}
                type="email"
                name="email"
                placeholder="Email"
                onChange={handleChange}
                required
              />
              <input
                className={inputClass}
                type="text"
                name="businessName"
                placeholder="Business Name"
                onChange={handleChange}
                required
              />
              <button
                type="submit"
                disabled={
                  !formData.businessName &&
                  !formData.email &&
                  !formData.name &&
                  !formData.phone
                }
                className="w-full rounded-md bg-gradient-to-r from-[#01A79E] to-[#26AADF] py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400 md:w-96 md:text-2xl"
              >
                {isSubmitting ? "Sending..." : "Contact Us"}
              </button>
            </form>
          </div>
          {/* contact info */}
          <div className="mt-6 flex w-full flex-col items-center gap-y-6 px-4 sm:mt-8 sm:gap-y-8 md:mt-10 md:w-auto md:gap-y-10 md:px-0">
            <Image
              src="/icons/autoworx-logo.svg"
              alt="Autoworx Logo"
              width={200}
              height={200}
              className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-32 lg:w-32 xl:h-40 xl:w-40"
            />

            <div className="flex w-full flex-col items-center justify-center gap-y-0.5 sm:gap-y-1">
              <h4 className="text-lg font-semibold sm:text-xl md:text-2xl lg:text-3xl">
                Email
              </h4>

              <p className="w-full max-w-[200px] break-words px-2 text-center text-base font-bold sm:text-lg md:max-w-[250px] md:text-xl lg:max-w-lg lg:text-2xl">
                {INFO_EMAIL}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
