import React, { useState } from "react";
import { FaChevronDown } from "react-icons/fa";

const faqs = [
  {
    question: "Does Autoworx have a mobile app?",
    answer:
      "A dedicated mobile app is on our roadmap as we continue to enhance the Autoworx experience! In the meantime, our platform is available as a Progressive Web App (PWA), offering nearly all the functionality of a native app. You can access it directly from your smartphone or tablet, ensuring you stay connected to your business anytime, anywhere.",
  },
  {
    question: "Do you help with Data migration?",
    answer:
      "Yes, we do! Our team is here to make the transition seamless by assisting with migrating your existing data into Autoworx. Whether it's client and vehicle information, inventory records, or appointment schedules, we'll help you get set up quickly and efficiently so you can hit the ground running.",
  },
  {
    question: "How many devices can I use with my subscription?",
    answer:
      "Unlimited! With your Autoworx subscription, you can log in and manage your shop from as many devices as you need, whether it's a desktop, laptop, tablet, or smartphone. Stay connected to your business anytime, anywhere!",
  },
  {
    question: "Do I have to sign a contract?",
    answer:
      "No, you don't! We offer a flexible month-to-month subscription, giving you the freedom to use Autoworx without a long-term commitment. However, if you're looking to save, we also offer an annual plan at a discounted rate for even better value. The choice is yours!",
  },
  {
    question: "Do you guys offer a free trial?",
    answer:
      "Yes, we do! Your first two months with Autoworx are completely free, giving you full access to all our powerful features. This extended trial allows you to truly experience how Autoworx can streamline operations and boost your shop's efficiency. No commitments—just two full months to see how Autoworx can transform your business.",
  },
  {
    question: "Do you guys offer onboarding support?",
    answer:
      "Absolutely! When you start with Autoworx, you'll receive full onboarding support 24/7 throughout your subscription. We offer 1-on-1 training sessions for your managers, sales team, or technicians to ensure every team member is fully onboarded and confident using the platform. We're here to support you and your team every step of the way!",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index: any) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(315deg, rgba(38, 170, 223, 0.26) 2.16%, rgba(1, 167, 158, 0.26) 97.48%)",
      }}
      className="bg-red-50 pb-16 pt-16 lg:pb-28 lg:pt-28"
    >
      <div className="mx-auto max-w-7xl space-y-4 px-4 xl:px-20">
        <div className="">
          <h1 className="inline-block bg-gradient-to-r from-[#26AADF] to-[#01A79E] bg-clip-text text-3xl font-extrabold italic text-transparent lg:text-6xl">
            FAQs
          </h1>
        </div>
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="rounded-xl bg-gradient-to-r from-[#26AADF] to-[#01A79E] p-1"
          >
            <div className="rounded-md bg-white">
              <button
                onClick={() => toggleAccordion(index)}
                className="flex w-full items-center justify-between p-3 text-left font-semibold hover:cursor-pointer focus:outline-none lg:p-6 lg:text-3xl"
              >
                {faq?.question}
                <FaChevronDown
                  className={`transition-transform duration-300 ${openIndex === index ? "rotate-180 transform" : ""}`}
                />
              </button>
              {openIndex === index && (
                <div className="rounded-b-md bg-gray-50 px-4 py-2 font-medium text-gray-600 md:text-xl">
                  <p>{faq?.answer}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FAQSection;
