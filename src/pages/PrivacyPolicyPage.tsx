import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/20">
        <button onClick={() => navigate(-1)} className="p-1">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 pb-nav-safe">
        <p className="text-xs text-muted-foreground">Last updated: March 6, 2026</p>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Introduction</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Timetrade Wallet ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use the Timetrade Wallet application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Wallet Data:</strong> Your seed phrase, private keys, and PIN are stored locally on your device. We never transmit or store these on our servers.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Device Information:</strong> We may collect basic device information such as device type, operating system, and app version for analytics and support purposes.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Network Data:</strong> Blockchain transactions are broadcast to public networks. Transaction data on public blockchains is inherently public.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. How We Use Information</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use collected information to provide and improve the wallet experience, deliver price data and portfolio insights, send notifications you've opted into, and ensure the security and integrity of the application.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Data Storage & Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All sensitive wallet data (seed phrases, private keys, PINs) is encrypted and stored exclusively on your device. We employ industry-standard encryption practices. We do not have access to your funds or private keys.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Third-Party Services</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We integrate with third-party blockchain APIs, price feeds, and analytics services. These services have their own privacy policies. We recommend reviewing them independently.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Since your data is stored locally, you maintain full control. You can delete all wallet data at any time by resetting the wallet through Settings. No account creation is required to use the app.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">7. Children's Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Timetrade Wallet is not intended for use by individuals under the age of 18. We do not knowingly collect information from children.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">8. Changes to This Policy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We may update this Privacy Policy from time to time. Any changes will be reflected within the app. Continued use of the app constitutes acceptance of the updated policy.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">9. Contact Us</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            If you have questions about this Privacy Policy, please contact us at support@timetradewallet.com.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
