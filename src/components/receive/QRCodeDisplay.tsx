import { QRCodeSVG } from "qrcode.react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  tokenLogo?: React.ReactNode;
}

export const QRCodeDisplay = ({ value, size = 200, tokenLogo }: QRCodeDisplayProps) => {
  const iconSize = size * 0.2;

  return (
    <div className="relative inline-block p-4 bg-white rounded-2xl shadow-lg">
      <QRCodeSVG
        value={value}
        size={size}
        level="M"
        marginSize={0}
        bgColor="#FFFFFF"
        fgColor="#000000"
      />

      {/* Center Logo */}
      {tokenLogo && (
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl flex items-center justify-center shadow-sm p-2"
          style={{ width: iconSize + 16, height: iconSize + 16 }}
        >
          <div className="w-8 h-8">
            {tokenLogo}
          </div>
        </div>
      )}
    </div>
  );
};
