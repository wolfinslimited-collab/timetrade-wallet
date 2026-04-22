import { ChevronLeft, Shield, Database, Eye, Lock, Globe, UserCheck, Baby, RefreshCw, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    icon: <Eye className="w-4 h-4" />,
    title: "Introduction",
    content: 'Timetrade Wallet ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use the Timetrade Wallet application.',
  },
  {
    icon: <Database className="w-4 h-4" />,
    title: "Information We Collect",
    items: [
      { label: "Wallet Data", text: "Your seed phrase, private keys, and PIN are stored locally on your device. We never transmit or store these on our servers." },
      { label: "Device Information", text: "We may collect basic device information such as device type, operating system, and app version for analytics and support purposes." },
      { label: "Network Data", text: "Blockchain transactions are broadcast to public networks. Transaction data on public blockchains is inherently public." },
    ],
  },
  {
    icon: <Shield className="w-4 h-4" />,
    title: "How We Use Information",
    content: "We use collected information to provide and improve the wallet experience, deliver price data and portfolio insights, send notifications you've opted into, and ensure the security and integrity of the application.",
  },
  {
    icon: <Lock className="w-4 h-4" />,
    title: "Data Storage & Security",
    content: "All sensitive wallet data (seed phrases, private keys, PINs) is encrypted and stored exclusively on your device. We employ industry-standard encryption practices. We do not have access to your funds or private keys.",
  },
  {
    icon: <Globe className="w-4 h-4" />,
    title: "Third-Party Services",
    content: "We integrate with third-party blockchain APIs, price feeds, and analytics services. These services have their own privacy policies. We recommend reviewing them independently.",
  },
  {
    icon: <UserCheck className="w-4 h-4" />,
    title: "Your Rights",
    content: "Since your data is stored locally, you maintain full control. You can delete all wallet data at any time by resetting the wallet through Settings. No account creation is required to use the app.",
  },
  {
    icon: <Baby className="w-4 h-4" />,
    title: "Children's Privacy",
    content: "Timetrade Wallet is not intended for use by individuals under the age of 18. We do not knowingly collect information from children.",
  },
  {
    icon: <RefreshCw className="w-4 h-4" />,
    title: "Changes to This Policy",
    content: "We may update this Privacy Policy from time to time. Any changes will be reflected within the app. Continued use of the app constitutes acceptance of the updated policy.",
  },
  {
    icon: <Mail className="w-4 h-4" />,
    title: "Contact Us",
    content: "If you have questions about this Privacy Policy, please contact us at support@timetradewallet.com.",
  },
];

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/10">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-card border border-border/50 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold flex-1">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-nav-safe">
        {/* Hero */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1">Your Privacy Matters</h2>
          <p className="text-sm text-muted-foreground">
            We believe in transparency and your right to control your data.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-2">Last updated: March 6, 2026</p>
        </div>

        {/* Key highlights */}
        <div className="px-5 mb-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Local Storage", sub: "Keys stay on device" },
              { label: "Encrypted", sub: "AES-256 protection" },
              { label: "No Tracking", sub: "Zero personal data" },
            ].map((h) => (
              <div key={h.label} className="bg-card/60 border border-border/30 rounded-xl p-3 text-center">
                <p className="text-[11px] font-semibold text-foreground">{h.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{h.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        <div className="px-5 space-y-3 pb-8">
          {sections.map((section, i) => (
            <div
              key={section.title}
              className="bg-card/50 border border-border/20 rounded-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  {section.icon}
                </div>
                <h3 className="text-sm font-semibold">
                  {i + 1}. {section.title}
                </h3>
              </div>
              <div className="px-4 pb-4">
                {section.content && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed pl-11">
                    {section.content}
                  </p>
                )}
                {section.items && (
                  <div className="space-y-2.5 pl-11">
                    {section.items.map((item) => (
                      <div key={item.label}>
                        <p className="text-[13px] text-foreground/90 font-medium">{item.label}</p>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
