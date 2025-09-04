import Image from "next/image";
import Headings from "../components/landing-page/Headings";

const PrivacyPolicy = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-white px-4">
      {/* Container wrapper */}

      <div className="absolute w-full overflow-hidden">
        <Image
          src="/landing/termsConditionsbg.png"
          alt="Gradient Background"
          aria-hidden="true"
          width={1028}
          height={600}
          className="left-0 top-0 h-auto w-full object-contain sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1028px]"
        />
        {/* <img
          src={bg}
          alt="Gradient Background"
          aria-hidden="true"
          className="bottom-0 right-0 w-full sm:max-w-[600px] md:max-w-[800px] lg:max-w-[1028px] h-auto object-contain translate-y-[20%] translate-x-[25%]"
        /> */}
      </div>

      {/* Header */}
      <div className="container mx-auto flex flex-col gap-10">
        <div className="mt-10 flex flex-col items-center text-center lg:mt-20 lg:space-y-2">
          <Headings title="Privacy Policy" />
          <p className="text-base text-gray-600 lg:text-lg">
            Last Updated: March 6th, 2025
          </p>
        </div>

        {/* Body */}
        <main className="prose prose-gray mx-auto w-full max-w-3xl">
          <p className="text-center text-lg lg:text-xl">
            This Privacy Policy explains how Autoworx Tech Solutions (“Company”,
            “we”, “us”, or “our”) collects, uses, discloses, and safeguards your
            information when you visit and use our website, www.autoworx.tech
            (the “Site”), and any related services, applications, or content
            (collectively, the “Services”). Please read this Privacy Policy
            carefully. By accessing or using our Services, you acknowledge that
            you have read, understood, and agree to the collection and use of
            your information as described in this Privacy Policy.
          </p>

          <div className="mb-20 mt-10 flex flex-col gap-10 text-base lg:mb-40 lg:mt-20 lg:text-xl">
            {/* // Point 1 */}
            {/* Section 1: Introduction */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>1. Introduction</strong>
              </h2>
              <p>
                We are committed to protecting your privacy and ensuring you
                have a positive experience on our Site. This Privacy Policy is
                designed to inform you about:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>The types of information we collect;</li>
                <li>How we use and share your information;</li>
                <li>Your rights regarding your personal data;</li>
                <li>
                  The security measures we take to protect your information;
                </li>
                <li>How you can contact us with questions or concerns.</li>
              </ul>
            </div>

            {/* Section 2: Information We Collect */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>2. Information We Collect</strong>
              </h2>

              <h3>
                <strong>2.1 Personal Information</strong>
              </h3>
              <p>
                When you interact with our Services, we may collect information
                that can be used to identify you (“Personal Information”),
                including:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Contact Information: Name, email address, mailing address, and
                  telephone number.
                </li>
                <li>
                  Account Information: Username, password, and any other
                  information you provide when you register for an account.
                </li>
                <li>
                  Payment Information: Billing address, credit/debit card
                  details, and other financial information when you make a
                  purchase or subscribe to our Services.
                </li>
                <li>
                  Profile Information: Preferences, interests, and any
                  additional information you choose to provide in your profile.
                </li>
              </ul>

              <h3>
                <strong>2.2 Non-Personal Information</strong>
              </h3>
              <p>
                We also collect non-personal information that does not directly
                identify you, including:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Usage Data: Information about how you access and interact with
                  our Services, including pages visited, time spent on pages,
                  click data, and navigation paths.
                </li>
                <li>
                  Technical Data: Internet protocol (IP) address, browser type
                  and version, operating system, device type, and other
                  technical information.
                </li>
                <li>
                  Cookies and Tracking Technologies: Data collected via cookies,
                  web beacons, and similar tracking technologies to enhance your
                  browsing experience. For more details, please see Section 4
                  below.
                </li>
              </ul>

              <h3>
                <strong>2.3 Information from Third Parties</strong>
              </h3>
              <p>
                We may receive information about you from third-party sources,
                such as:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Social Media Platforms: When you connect your account with a
                  social media account.
                </li>
                <li>
                  Partners and Affiliates: Data provided by partners or
                  affiliates if you interact with their services through our
                  Site.
                </li>
                <li>
                  Public Databases: Information available from public sources
                  that is relevant to your use of our Services.
                </li>
              </ul>
            </div>

            {/* Section 3: How We Use Your Information */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>3. How We Use Your Information</strong>
              </h2>
              <p>
                We use the collected information for various purposes,
                including:
              </p>

              <h3>
                <strong>3.1 To Provide and Improve Our Services</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Service Delivery: To operate, maintain, and provide you with
                  access to our Services.
                </li>
                <li>
                  Personalization: To personalize your experience by presenting
                  content and offers tailored to your interests.
                </li>
                <li>
                  Performance Analytics: To analyze and improve the performance,
                  functionality, and user experience of our Services.
                </li>
              </ul>

              <h3>
                <strong>3.2 To Communicate With You</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Transactional Communications: To send you confirmations,
                  receipts, updates, and other service-related messages.
                </li>
                <li>
                  Promotional Communications: To provide you with information
                  about products, services, promotions, and events that we
                  believe may interest you (with your consent, where required by
                  law).
                </li>
                <li>
                  Support: To respond to your inquiries, provide technical
                  support, and facilitate customer service.
                </li>
              </ul>

              <h3>
                <strong>3.3 For Legal and Security Purposes</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Compliance: To comply with legal obligations, resolve
                  disputes, and enforce our policies.
                </li>
                <li>
                  Security: To monitor, prevent, and respond to fraud,
                  unauthorized access, or other illegal activities.
                </li>
                <li>
                  Research: To conduct research and analysis to better
                  understand our audience and improve our Services.
                </li>
              </ul>
            </div>

            {/* Section 4: Cookies and Tracking Technologies */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>4. Cookies and Tracking Technologies</strong>
              </h2>

              <h3>
                <strong>4.1 Use of Cookies</strong>
              </h3>
              <p>Our Site uses cookies and similar tracking technologies to:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Enhance Your Experience: Remember your preferences and login
                  details for future visits.
                </li>
                <li>
                  Analyze Usage: Gather data on how visitors interact with our
                  Site to help improve functionality and content.
                </li>
                <li>
                  Personalize Content: Display personalized content and
                  advertising based on your interests.
                </li>
              </ul>

              <h3>
                <strong>4.2 Managing Cookies</strong>
              </h3>
              <p>You can control and manage cookies in various ways:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Browser Settings: Most browsers allow you to refuse cookies or
                  alert you when cookies are being sent. Please note that if you
                  disable cookies, some parts of our Site may not function
                  properly.
                </li>
                <li>
                  Opt-Out Options: To unsubscribe from marketing emails, simply
                  reply “STOP” to any such message.
                </li>
              </ul>
            </div>

            {/* Section 5: How We Share Your Information */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>5. How We Share Your Information</strong>
              </h2>
              <p>
                We may share your information with third parties in the
                following circumstances:
              </p>

              <h3>
                <strong>5.1 Service Providers</strong>
              </h3>
              <p>
                We may engage trusted third-party service providers to perform
                functions on our behalf (e.g., payment processing, data
                analysis, email delivery, customer support). These providers are
                only permitted to use your information as necessary to perform
                their services for us.
              </p>

              <h3>
                <strong>5.2 Business Transfers</strong>
              </h3>
              <p>
                In the event of a merger, acquisition, restructuring, sale of
                assets, or similar transaction, your information may be
                transferred as part of the transaction. In such cases, we will
                ensure that the recipient agrees to safeguard your information
                in a manner consistent with this Privacy Policy.
              </p>

              <h3>
                <strong>5.3 Legal Obligations</strong>
              </h3>
              <p>
                We may disclose your information if required by law, regulation,
                or legal process, such as:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Subpoenas or Court Orders: In response to a subpoena, court
                  order, or legal process.
                </li>
                <li>
                  Legal Claims: To protect our rights, property, or safety or
                  that of our users or others.
                </li>
                <li>
                  Investigations: To respond to investigations conducted by
                  governmental or regulatory authorities.
                </li>
              </ul>

              <h3>
                <strong>5.4 With Your Consent</strong>
              </h3>
              <p>
                We may share your information with third parties when we have
                obtained your explicit consent or as otherwise described at the
                time of collection.
              </p>
            </div>

            {/* Section 6: Data Security */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>6. Data Security</strong>
              </h2>
              <p>
                We take the security of your information seriously and implement
                a variety of technical, administrative, and physical safeguards
                to protect your data from unauthorized access, use, or
                disclosure. These measures include:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Encryption: Use of encryption technology for data transmission
                  and storage where appropriate.
                </li>
                <li>
                  Access Controls: Restricted access to your information on a
                  need-to-know basis within our organization.
                </li>
                <li>
                  Regular Audits: Periodic reviews of our data collection,
                  storage, and processing practices to maintain security
                  standards.
                </li>
                <li>
                  Incident Response: Procedures in place to detect, report, and
                  address any data breaches or security incidents.
                </li>
              </ul>
              <p>
                While we strive to use commercially acceptable means to protect
                your information, no method of transmission over the internet or
                electronic storage is completely secure. We cannot guarantee the
                absolute security of your data.
              </p>
            </div>

            {/* Remaining sections 7-12 follow the exact same pattern */}
            {/* Section 7: Data Retention */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>7. Data Retention</strong>
              </h2>
              <p>
                We retain your information for as long as necessary to fulfill
                the purposes for which it was collected, to comply with legal
                obligations, resolve disputes, and enforce our agreements.
                Specific retention periods may vary based on:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>The nature of the information;</li>
                <li>The purposes for which it is collected;</li>
                <li>Legal or regulatory requirements.</li>
              </ul>
              <p>
                Once the information is no longer necessary, we will take steps
                to delete or anonymize it.
              </p>
            </div>

            {/* Section 8: Your Rights and Choices */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>8. Your Rights and Choices</strong>
              </h2>
              <p>
                Depending on your jurisdiction, you may have certain rights
                regarding your Personal Information, including:
              </p>

              <h3>
                <strong>8.1 Access and Correction</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Access: You may request access to the Personal Information we
                  hold about you.
                </li>
                <li>
                  Correction: You can request that we correct or update any
                  inaccurate or incomplete information.
                </li>
              </ul>

              <h3>
                <strong>8.2 Deletion and Objection</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Deletion: Subject to applicable law, you may request the
                  deletion of your Personal Information.
                </li>
                <li>
                  Objection: You may have the right to object to certain data
                  processing activities, including direct marketing.
                </li>
              </ul>

              <h3>
                <strong>8.3 Data Portability</strong>
              </h3>
              <p>
                Where applicable, you may have the right to request the transfer
                of your Personal Information to another organization or directly
                to you in a structured, commonly used, and machine-readable
                format.
              </p>

              <h3>
                <strong>8.4 Exercising Your Rights</strong>
              </h3>
              <p>
                To exercise any of these rights, please contact us using the
                contact details provided in Section 10. We will respond to your
                request in accordance with applicable law. Please note that we
                may ask you to verify your identity before processing your
                request.
              </p>
            </div>

            {/* Section 9: International Data Transfers */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>9. International Data Transfers</strong>
              </h2>
              <p>
                Our Services are global, and your information may be transferred
                to, stored, and processed in countries other than your own. We
                take appropriate measures to ensure that your data is treated
                securely and in accordance with this Privacy Policy regardless
                of where it is processed.
              </p>
            </div>

            {/* Section 10: Children’s Privacy */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>10. Children’s Privacy</strong>
              </h2>
              <p>
                Our Services are not directed to children under the age of 18
                (or the applicable age of consent in your jurisdiction). We do
                not knowingly collect Personal Information from children without
                parental consent. If you believe that we have inadvertently
                collected Personal Information from a child, please contact us
                immediately so that we can delete the information.
              </p>
            </div>

            {/* Section 11: Third-Party Links and Services */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>11. Third-Party Links and Services</strong>
              </h2>
              <p>
                Our Site may contain links to third-party websites,
                applications, or services that are not operated or controlled by
                us. This Privacy Policy does not apply to the practices of those
                third parties. We encourage you to review the privacy policies
                of any third-party sites you visit.
              </p>
            </div>

            {/* Section 12: Changes to This Privacy Policy */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>12. Changes to This Privacy Policy</strong>
              </h2>
              <p>
                We may update this Privacy Policy from time to time to reflect
                changes in our practices, legal requirements, or other factors.
                When we make changes, we will:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Update the “Last Updated” date at the top of this Privacy
                  Policy.
                </li>
                <li>
                  Provide a notice on our Site or through other communication
                  channels if the changes are significant.
                </li>
                <li>
                  Encourage you to review the Privacy Policy periodically.
                </li>
              </ul>
              <p>
                Your continued use of our Services after any such changes
                constitutes your acceptance of the updated Privacy Policy.
              </p>
            </div>

            {/* Section 13: Contact Us */}
            <div className="flex flex-col space-y-4 text-center">
              <h2 className="">
                <strong>13. Contact Us</strong>
              </h2>
              <p>
                If you have any questions, concerns, or requests regarding this
                Privacy Policy or our data practices, please contact us at:
              </p>

              <p>
                <strong>Autoworx Tech Solutions</strong>
                <br />
                Email: info@autoworx.tech
                <br />
                Address: 6350 Medonough Dr Norcross GA 30093
              </p>

              <p>
                By using our Services, you agree to the terms of this Privacy
                Policy. We are committed to protecting your privacy and
                appreciate your trust in us.
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
