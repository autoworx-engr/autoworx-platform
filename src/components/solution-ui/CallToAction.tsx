"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import toast from "react-hot-toast";

export default function CallToAction() {
  const [formData, setFormData] = useState({
    name: "",
    shopName: "",
    phone: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoToken, setDemoToken] = useState<string | null>(null);
  // Fetch demo company token on component mount
  useEffect(() => {
    const fetchCRMToken = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL}/api/awx-crm`,
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!demoToken) {
      toast.error("Demo service unavailable. Please try again later.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create lead using the lead generation API
      const opportunitySource = `(Demo Request) ${formData.shopName || "Unknown Shop"} | Demo Request`;

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
            message: formData.message,
            opportunity_source: opportunitySource,
          }),
        },
      );

      if (leadResponse.ok) {
        toast.success("Demo request submitted successfully!");

        // Also send email notification to your team
        const emailBody = `
        Hello,
        A new demo request has been submitted with the following details:

        Name: ${formData.name}
        Phone: ${formData.phone}
        Email: ${formData.email}
        Shop Name: ${formData.shopName}
        Message: ${formData.message}

        This lead has been automatically created in the sales pipeline as new lead.
        Please follow up with the requester as soon as possible.
        Best regards,
        Autoworx.
        `;

        // Send notification email (optional)
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/contactus`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: "info@autoworx.tech",
            subject: "Demo Request - Lead Created",
            text: emailBody,
          }),
        });

        // Reset form
        setFormData({
          name: "",
          shopName: "",
          phone: "",
          email: "",
          message: "",
        });
      } else {
        const errorData = await leadResponse.json();
        toast.error(`Failed to submit demo request: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error submitting demo request:", error);
      toast.error("Failed to submit demo request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="call-to-action"
      className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] py-16 text-white"
    >
      <div className="mx-auto max-w-5xl px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="mb-6 text-3xl font-bold lg:text-4xl">
              Ready to Finally Run Your Shop Instead of It Running You?
            </h2>
            <p className="mb-8 text-gray-300">
              Every day you wait is another day of chaos and missed
              opportunities. Autoworx is the edge you&#39;ve been looking for to
              streamline your shop and supercharge your growth.
            </p>

            <div className="space-y-6">
              {[
                {
                  number: "1",
                  title: "Schedule a Live Demo",
                  description:
                    "Fill out the form to book your personalized demonstration with our team.",
                },
                {
                  number: "2",
                  title: "See Autoworx in Action",
                  description:
                    "We'll walk you through the platform and tailor the demo to your specific needs.",
                },
                {
                  number: "3",
                  title: "Transform Your Business",
                  description:
                    "Get set up on Autoworx and start streamlining your operations immediately.",
                },
              ].map((step, index) => (
                <div key={index} className="flex items-start space-x-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 font-bold text-white">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold">{step.title}</h3>
                    <p className="text-sm text-gray-300">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Card className="rounded-xl bg-white p-0 text-gray-900">
            <CardContent className="p-6">
              <h3 className="mb-6 text-xl font-bold">Book Your Free Demo</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    required
                  />
                  <Input
                    type="text"
                    name="shopName"
                    value={formData.shopName}
                    onChange={handleChange}
                    placeholder="Shop Name"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    placeholder="Email Address"
                    onChange={handleChange}
                  />
                  <Input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    placeholder="Phone Number"
                    onChange={handleChange}
                    required
                  />
                </div>
                <Textarea
                  name="message"
                  placeholder="How can Autoworx help your shop?"
                  className="min-h-[100px]"
                  onChange={handleChange}
                  value={formData.message}
                  required
                />
                <Button
                  type="submit"
                  disabled={
                    !formData.email &&
                    !formData.name &&
                    !formData.phone &&
                    !formData.shopName &&
                    !formData.message
                  }
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  {isSubmitting ? "Submitting..." : "Book My Demo →"}
                </Button>
                <p className="text-center text-xs text-gray-500">
                  Limited beta spots available. No obligation.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
