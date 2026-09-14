import { Navbar } from "@/components/Navbar";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const PrivacyPolicy = () => {
  useSEO({
    title: "Privacy Policy | Siyayya",
    description: "Learn how Siyayya collects, uses, and protects your personal information on our campus marketplace platform.",
  });

  const lastUpdated = "September 14, 2026";

  return (
    <div className="min-h-screen bg-background pb-28 md:pb-0">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

        <div className="prose dark:prose-invert max-w-none text-muted-foreground space-y-6">
          <p>
            Siyayya ("we", "us", or "our") operates the siyayya.com website and related services
            (the "Service"). This Privacy Policy explains how we collect, use, disclose, and
            safeguard your information when you use our campus marketplace platform.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">1. Information We Collect</h2>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Account Information</h3>
          <p>
            When you create an account, we collect information you provide directly, including your
            name, email address, phone number, and campus affiliation. If you sign in through a
            third-party provider (such as Google), we receive basic profile information as
            permitted by that provider.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Listings and Transactions</h3>
          <p>
            When you create a listing, we store the content you submit — including product or
            service descriptions, images, prices, and campus location. If you communicate with
            other users through the platform, those messages are stored on our servers to
            enable delivery.
          </p>

          <h3 className="text-lg font-semibold text-foreground mt-6 mb-3">Usage and Device Data</h3>
          <p>
            We automatically collect certain information when you visit the Service, such as your
            IP address, browser type, operating system, device identifiers, pages visited, and
            the date and time of your visit. We may also collect approximate location data
            derived from your IP address or device settings to show you campus-relevant content.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Provide, maintain, and improve the Service.</li>
            <li>Match you with products, services, and listings relevant to your campus.</li>
            <li>Process transactions and send related information (confirmations, receipts).</li>
            <li>Send you technical notices, updates, and administrative messages.</li>
            <li>Detect, investigate, and prevent fraudulent or harmful activity.</li>
            <li>Respond to your support requests and communications.</li>
            <li>Generate anonymised, aggregate analytics to improve the platform.</li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">3. Information Sharing</h2>
          <p>
            We do not sell your personal information. We may share your information in the
            following circumstances:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>With other users:</strong> Your name and listing content are visible to
              other users on your campus as part of normal marketplace functionality.
            </li>
            <li>
              <strong>With service providers:</strong> We share data with trusted third-party
              vendors who assist us in operating the Service (e.g., cloud hosting, image
              hosting, and email delivery), subject to contractual obligations to protect
              your data.
            </li>
            <li>
              <strong>For legal reasons:</strong> We may disclose information if required by
              law, regulation, or a valid legal process, or to protect the rights, safety,
              or property of Siyayya, our users, or the public.
            </li>
          </ul>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">4. Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your personal
            information, including encryption in transit (TLS/HTTPS) and at rest. However, no
            method of electronic transmission or storage is completely secure, and we cannot
            guarantee absolute security.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">5. Data Retention</h2>
          <p>
            We retain your personal information for as long as your account is active or as
            needed to provide the Service. If you delete your account, we will remove your
            personal data within a reasonable period, except where retention is required by
            law or for legitimate business purposes (such as fraud prevention).
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">6. Your Rights</h2>
          <p>
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>Access the personal information we hold about you.</li>
            <li>Request correction of inaccurate data.</li>
            <li>Request deletion of your personal data.</li>
            <li>Object to or restrict certain processing of your data.</li>
            <li>Request a copy of your data in a portable format.</li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{" "}
            <a href="mailto:info@siyayya.com" className="text-primary hover:underline">info@siyayya.com</a>.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">7. Children's Privacy</h2>
          <p>
            The Service is not intended for individuals under the age of 16. We do not knowingly
            collect personal information from children. If you believe we have inadvertently
            collected such information, please contact us so we can promptly delete it.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any
            material changes by posting the new policy on this page and updating the "Last
            updated" date above. Your continued use of the Service after any changes
            constitutes acceptance of the updated policy.
          </p>

          <h2 className="text-xl font-semibold text-foreground mt-8 mb-4">9. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              Email:{" "}
              <a href="mailto:info@siyayya.com" className="text-primary hover:underline">info@siyayya.com</a>
            </li>
            <li>
              <Link to="/contact" className="text-primary hover:underline">Contact Form</Link>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
