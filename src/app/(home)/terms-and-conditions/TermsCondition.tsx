import Image from "next/image";
import Headings from "../components/landing-page/Headings";

const TermsConditions = () => {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-white px-4 ">
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
          <Headings title="Terms of Service" />
          <p className="text-base text-gray-600 lg:text-lg">
            Last Updated: March 6th, 2025
          </p>
        </div>

        {/* Body */}
        <main className="prose prose-gray mx-auto w-full max-w-3xl">
          <p className="text-center text-lg lg:text-xl">
            Welcome to Autoworx Tech Solutions (“Company”, “we”, “us”, or
            “our”). These Terms of Service (“Terms”) govern your access to and
            use of our website, www.autoworx.tech (“Site”), and any related
            services, software, and content (collectively, “Services”). Please
            read these Terms carefully before using our Services. By accessing
            or using our Services, you agree to be bound by these Terms and our
            Privacy Policy. If you do not agree with these Terms, please do not
            use our Services.
          </p>

          <div className="mb-20 mt-10 flex flex-col gap-10 text-base lg:mb-40 lg:mt-20 lg:text-xl">
            {/* // Point 1 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>1. Definitions</strong>
              </h2>
              <p>
                For purposes of these Terms, the following definitions apply:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  “Account”: A unique personal profile registered on our Site
                  that allows you to access certain features.
                </li>
                <li>
                  “Content”: All text, images, video, audio, and other materials
                  published or made available through our Services.
                </li>
                <li>
                  “User” or “You”: Any person or entity who accesses or uses our
                  Services.
                </li>
                <li>
                  “Third-Party Services”: Any service or content provided by
                  entities not affiliated with Autoworx Tech Solutions.
                </li>
                <li>
                  “Intellectual Property Rights”: All current and future rights
                  under copyright, trademark, patent, trade secret, and other
                  laws related to the ownership and protection of content and
                  technology.
                </li>
              </ul>
            </div>
            {/* // Point 2 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>2. Acceptance of Terms</strong>
              </h2>
              <p>By using our Services, you confirm that you:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Have read, understood, and agree to be bound by these Terms,
                  including any additional policies and guidelines referenced
                  herein;
                </li>
                <li>
                  Consent to the collection, use, and disclosure of your
                  information as described in our Privacy Policy;
                </li>
                <li>
                  Acknowledge that you are entering into a legally binding
                  agreement with Autoworx Tech Solutions.
                </li>
              </ul>
              <p>
                Your use of the Services constitutes acceptance of any
                modifications to these Terms that may be posted from time to
                time. It is your responsibility to review the Terms periodically
                for any updates.
              </p>
            </div>
            {/* // Point 3 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>3. Eligibility and Account Registration</strong>
              </h2>
              <h3>
                <strong>3.1 Eligibility</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Minimum Age Requirement: You must be at least 18 years old or
                  of legal age in your jurisdiction to form a binding contract.
                </li>
                <li>
                  Legal Capacity: You must have the legal capacity to enter into
                  these Terms and abide by them.
                </li>
              </ul>
              <h3>
                <strong>3.2 Account Registration</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Accurate Information: When creating an Account, you agree to
                  provide accurate, current, and complete information.
                </li>
                <li>
                  Security of Credentials: You are responsible for maintaining
                  the confidentiality of your Account credentials (e.g.,
                  username and password) and are fully responsible for all
                  activities that occur under your Account.
                </li>
                <li>
                  Notification of Breach: You agree to notify us immediately if
                  you suspect any unauthorized use of your Account or any other
                  breach of security.
                </li>
                <li>
                  Account Termination: We reserve the right to suspend or
                  terminate your Account, or any part thereof, for any reason
                  including without limitation for breach of these Terms,
                  fraudulent activity, or if we suspect any violation of
                  applicable law.
                </li>
              </ul>
            </div>
            {/* // Point 4 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>4. Use of the Services</strong>
              </h2>
              <h3>
                <strong>4.1 License Grant</strong>
              </h3>
              <p>
                Subject to your compliance with these Terms, Autoworx Tech
                Solutions grants you a limited, non-exclusive, non-transferable,
                revocable license to access and use the Services solely for your
                personal, non-commercial use or for internal business purposes,
                as applicable.
              </p>

              <h3>
                <strong>4.2 Permitted and Prohibited Uses</strong>
              </h3>
              <p>You agree that you will not:</p>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Violation of Laws: Use the Services in any manner that
                  violates any applicable laws or regulations.
                </li>
                <li>
                  Unauthorized Access: Attempt to gain unauthorized access to
                  any portion of the Services, other accounts, computer systems,
                  or networks connected to our Services.
                </li>
                <li>
                  Interference: Interfere with or disrupt the integrity or
                  performance of the Services, including the servers or networks
                  connected to the Services.
                </li>
                <li>
                  Content Misuse: Use, store, or transmit any Content that
                  infringes upon the intellectual property rights or other
                  rights of any third party.
                </li>
                <li>
                  Malicious Activities: Introduce viruses, worms, or any other
                  malicious software into our Services.
                </li>
                <li>
                  Reverse Engineering: Reverse engineer, decompile, or
                  disassemble any part of our Services or related software
                  except as expressly permitted by law.
                </li>
                <li>
                  Data Harvesting: Use any automated means (e.g., bots,
                  scrapers) to access or copy data from our Services without our
                  express permission.
                </li>
              </ul>
            </div>
            {/* // Point 5 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>5. Intellectual Property Rights</strong>
              </h2>
              <h3>
                <strong>5.1 Ownership</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Company Property: All content, trademarks, logos, and
                  intellectual property on the Site are the exclusive property
                  of Autoworx Tech Solutions or its licensors.
                </li>
                <li>
                  Protected Content: The layout, design, and graphics are
                  protected by copyright and other intellectual property laws.
                </li>
              </ul>

              <h3>
                <strong>5.2 Limited Rights</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Viewing and Downloading: You may view, download, and print
                  materials from our Site solely for your personal,
                  non-commercial use, provided that you do not remove or alter
                  any copyright or proprietary notices.
                </li>
                <li>
                  Prohibited Reproduction: You may not reproduce, distribute,
                  modify, create derivative works from, publicly display, or
                  otherwise exploit any content without prior written permission
                  from us.
                </li>
              </ul>
            </div>
            {/* // Point 6 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>6. Third-Party Services and Links</strong>
              </h2>
              <h3>
                <strong>6.1 Third-Party Content</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Non-Affiliated Content: Our Services may contain links to
                  third-party websites, services, or content that are not under
                  our control.
                </li>
                <li>
                  Disclaimer: We do not endorse and are not responsible for the
                  accuracy, legality, or content of third-party websites or
                  resources.
                </li>
                <li>
                  Usage at Your Own Risk: Your interactions with third-party
                  websites are solely between you and the third party, and you
                  should review their terms and privacy policies accordingly.
                </li>
              </ul>

              <h3>
                <strong>6.2 Integration with Third-Party Services</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  API and Widgets: Our Services may integrate with third-party
                  applications or services (e.g., social media platforms,
                  payment processors). By using such integrations, you
                  acknowledge that your data may be shared with these third
                  parties, subject to their respective terms and conditions.
                </li>
                <li>
                  Liability: Autoworx Tech Solutions is not liable for any
                  issues arising from your use of third-party integrations.
                </li>
              </ul>
            </div>
            {/* // Point 7 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>7. Privacy and Data Collection</strong>
              </h2>
              <h3>
                <strong>7.1 Data Collection and Use</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Personal Information: We may collect personal and non-personal
                  information in accordance with our Privacy Policy.
                </li>
                <li>
                  Usage Data: We collect data about your usage of the Services
                  to improve our offerings, enhance user experience, and for
                  security purposes.
                </li>
                <li>
                  Cookies and Similar Technologies: Our Site may use cookies and
                  similar tracking technologies. By using our Services, you
                  consent to the use of cookies in accordance with our Cookie
                  Policy.
                </li>
              </ul>

              <h3>
                <strong>7.2 Data Sharing and Disclosure</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Service Providers: We may share your information with trusted
                  third-party service providers who perform services on our
                  behalf.
                </li>
                <li>
                  Legal Requirements: We may disclose your information if
                  required to do so by law or in response to valid requests by
                  public authorities.
                </li>
                <li>
                  Consent-Based Sharing: We will not share your information with
                  third parties for their marketing purposes without your
                  explicit consent.
                </li>
              </ul>
            </div>
            {/* // Point 8 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>8. Payment, Billing, and Refunds</strong>
              </h2>
              <h3>
                <strong>8.1 Payment Terms</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Pricing and Fees: All prices, fees, and payment terms for any
                  paid Services will be clearly communicated at the point of
                  purchase.
                </li>
                <li>
                  Payment Authorization: By providing a payment method, you
                  authorize us to charge the applicable fees to your account.
                </li>
                <li>
                  Billing Cycle: Payments will be billed on a recurring basis as
                  specified during the subscription or purchase process, unless
                  otherwise agreed.
                </li>
              </ul>

              <h3>
                <strong>8.2 Refund Policy</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Refund Eligibility: Any dispute regarding your purchase must
                  be submitted within 30 days of the transaction. Refunds, if
                  applicable, will be provided in accordance with our Refund
                  Policy.
                </li>
                <li>
                  Disputed Charges: If you believe you have been billed in
                  error, please contact our billing support for resolution.
                </li>
              </ul>
            </div>
            {/* // Point 9 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>9. Disclaimers and Limitations of Liability</strong>
              </h2>
              <h3>
                <strong>9.1 Disclaimers</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  “As Is” and “As Available” Basis: Our Services are provided on
                  an “as is” and “as available” basis without any warranties,
                  either express or implied.
                </li>
                <li>
                  No Guarantee of Accuracy: We do not warrant that the Services
                  will be uninterrupted, error-free, or secure.
                </li>
                <li>
                  Third-Party Content: Any third-party content or links provided
                  on our Site are offered without warranty of any kind.
                </li>
              </ul>

              <h3>
                <strong>9.2 Limitation of Liability</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Indirect and Consequential Damages: Under no circumstances
                  will Autoworx Tech Solutions be liable for any indirect,
                  incidental, special, consequential, or punitive damages
                  arising from or related to your use of the Services.
                </li>
                <li>
                  Aggregate Liability: Our total liability to you for any claim
                  arising from your use of the Services shall not exceed the
                  amount paid by you (if any) for accessing the Services.
                </li>
                <li>
                  Exclusions: Some jurisdictions do not allow the exclusion of
                  certain warranties or liabilities; in such cases, the above
                  limitations may not apply to you.
                </li>
              </ul>
            </div>
            {/* // Point 10 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>10. Indemnification</strong>
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless Autoworx Tech
                Solutions, its affiliates, officers, directors, employees, and
                agents from and against any claims, damages, obligations,
                losses, liabilities, costs, or expenses (including reasonable
                attorneys’ fees) arising from:
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>Your use of and access to the Services;</li>
                <li>Your violation of these Terms;</li>
                <li>
                  Your violation of any rights of another party, including any
                  intellectual property or privacy rights.
                </li>
              </ul>
            </div>
            {/* // Point 11 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>11. Termination and Suspension</strong>
              </h2>
              <h3>
                <strong>11.1 Termination by You</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Voluntary Termination: You may terminate your use of our
                  Services at any time by discontinuing access and, if
                  applicable, cancelling your account or subscription.
                </li>
                <li>
                  Data Retention: Even if you terminate your account, we may
                  retain certain information as required by law or for
                  legitimate business purposes.
                </li>
              </ul>

              <h3>
                <strong>11.2 Termination by Us</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  For Cause: We reserve the right to suspend or terminate your
                  access to the Services immediately, without notice, if you
                  violate these Terms or if we reasonably suspect fraudulent or
                  harmful activity.
                </li>
                <li>
                  Effect of Termination: Upon termination, all rights granted to
                  you under these Terms will immediately cease, and you must
                  stop using the Services. Any provisions of these Terms that by
                  their nature should survive termination shall continue to be
                  in effect.
                </li>
              </ul>
            </div>
            {/* // Point 12 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>12. Governing Law and Dispute Resolution</strong>
              </h2>
              <h3>
                <strong>12.1 Governing Law</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Applicable Law: These Terms shall be governed by and construed
                  in accordance with the laws of the State of Georgia, without
                  regard to its conflict-of-law provisions, and any dispute
                  arising under these Terms shall be subject to the exclusive
                  jurisdiction of the state and federal courts located in
                  Gwinnett County, Georgia.
                </li>
              </ul>

              <h3>
                <strong>12.2 Dispute Resolution</strong>
              </h3>
              <ul className="list-inside list-disc space-y-2">
                <li>
                  Negotiation: In the event of any dispute, controversy, or
                  claim arising out of or relating to these Terms or the
                  Services, you and Autoworx Tech Solutions agree to first
                  attempt to resolve the dispute amicably through negotiation.
                </li>
                <li>
                  Dispute Resolution: : The parties agree to first attempt to
                  resolve any controversy, claim, or dispute arising out of or
                  relating to these Terms through good-faith negotiation. If the
                  parties are unable to resolve the dispute within thirty (30)
                  days of written notice, either party may pursue the matter in
                  the Magistrate Court (small claims division) of Gwinnett
                  County, Georgia, provided the claim falls within that court’s
                  jurisdictional limits. For all other claims, venue shall lie
                  exclusively in the state or federal courts located in Gwinnett
                  County, Georgia, and the parties hereby consent to the
                  personal jurisdiction of those courts.
                </li>
                <li>
                  Class Action Waiver: You agree that any dispute resolution
                  proceedings will be conducted only on an individual basis and
                  not in a class, consolidated, or representative action.
                </li>
              </ul>
            </div>
            {/* // Point 13 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>13. Severability</strong>
              </h2>
              <p>
                If any provision of these Terms is held to be invalid, illegal,
                or unenforceable by a court of competent jurisdiction, the
                remaining provisions of these Terms will remain in full force
                and effect, and the invalid or unenforceable provision shall be
                replaced by a valid and enforceable provision that most closely
                reflects the parties’ intent.
              </p>
            </div>
            {/* // Point 14 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>14. Entire Agreement</strong>
              </h2>
              <p>
                These Terms, together with our Privacy Policy, Refund Policy,
                Cookie Policy, and any other policies or guidelines referenced
                herein, constitute the entire agreement between you and Autoworx
                Tech Solutions regarding your use of the Services. They
                supersede all prior or contemporaneous communications and
                proposals, whether electronic, oral, or written.
              </p>
            </div>
            {/* // Point 15 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>15. Feedback and Suggestions</strong>
              </h2>
              <p>
                Any feedback, comments, or suggestions you provide regarding our
                Services is entirely voluntary. By submitting feedback, you
                grant Autoworx Tech Solutions a non-exclusive, worldwide,
                royalty-free license to use, reproduce, modify, and incorporate
                such feedback into the Services without any obligation to
                compensate you.
              </p>
            </div>
            {/* // Point 16 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>16. Notices</strong>
              </h2>
              <h3>
                <strong>16.1 Electronic Communications</strong>
              </h3>
              <p>
                By using our Services, you consent to receiving electronic
                communications from us, including service-related announcements
                and administrative messages. These communications are considered
                part of the contractual relationship between you and Autoworx
                Tech Solutions.
              </p>

              <h3>
                <strong>16.2 Contact Information</strong>
              </h3>
              <p>
                All notices or communications to you will be sent to the email
                address provided in your Account or as otherwise provided by
                you. It is your responsibility to ensure that your contact
                information is accurate and current.
              </p>

              <h3>
                <strong>16.3 Policy Updates</strong>
              </h3>
              <p>
                Autoworx Tech Solutions reserves the right to modify or update
                these Terms and any related policies at any time in its sole
                discretion. All changes will be posted on our website, and it is
                your responsibility to review the Terms periodically for
                updates. If you do not agree to any revised Terms, you must
                promptly notify our office in writing and cease using the
                service.
              </p>
            </div>
            {/* // Point 17 */}
            <div className="flex flex-col space-y-4">
              <h2 className="text-center">
                <strong>17. Miscellaneous</strong>
              </h2>
              <h3>
                <strong>17.1 Force Majeure</strong>
              </h3>
              <p>
                Autoworx Tech Solutions will not be liable for any failure or
                delay in performance under these Terms caused by circumstances
                beyond its reasonable control, including, but not limited to,
                acts of God, natural disasters, war, or governmental actions.
              </p>

              <h3>
                <strong>17.2 No Waiver</strong>
              </h3>
              <p>
                Failure by either party to enforce any provision of these Terms
                shall not be construed as a waiver of that provision or any
                other provision.
              </p>

              <h3>
                <strong>17.3 Assignment</strong>
              </h3>
              <p>
                You may not assign or transfer these Terms, by operation of law
                or otherwise, without our prior written consent. Any attempt by
                you to assign or transfer these Terms without such consent will
                be null and void. We may assign or transfer these Terms at our
                discretion without restriction.
              </p>

              <h3>
                <strong>17.4 Headings</strong>
              </h3>
              <p>
                The headings used in these Terms are for convenience only and
                shall not affect the interpretation of these Terms.
              </p>
            </div>

            {/* point 18 */}
            <div className="flex flex-col space-y-4 text-center">
              <h2 className="">
                <strong>18. Contact Us</strong>
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

export default TermsConditions;
