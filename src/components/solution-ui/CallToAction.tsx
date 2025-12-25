import React from 'react';
import BookDemoForm from './BookDemoForm';

const CallToAction = () => {
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

          <BookDemoForm />
        </div>
      </div>
    </section>
  );
};

export default CallToAction;