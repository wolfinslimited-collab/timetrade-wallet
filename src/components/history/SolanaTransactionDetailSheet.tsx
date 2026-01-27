import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowUpRight, ArrowDownLeft, ExternalLink, Copy, Check, 
  Clock, CheckCircle, XCircle, Cpu, ArrowRightLeft, Coins,
  ChevronDown, ChevronUp, Code, Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import type { Transaction, ParsedInstruction, SolanaTokenTransfer } from "@/hooks/useBlockchain";

interface SolanaTransactionDetailSheetProps {
  transaction: Transaction | null;
  userAddress?: string;
  onClose: () => void;
}

export const SolanaTransactionDetailSheet = ({ 
  transaction, 
  userAddress,
  onClose 
}: SolanaTransactionDetailSheetProps) => {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAllInstructions, setShowAllInstructions] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  if (!transaction) return null;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isSend = transaction.from?.toLowerCase() === userAddress?.toLowerCase();
  const status = transaction.status;

  const formatAddress = (addr: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatLamports = (lamports: string | number) => {
    const value = typeof lamports === 'string' ? parseInt(lamports, 10) : lamports;
    return (value / 1e9).toFixed(6);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = () => {
    switch (status) {
      case "confirmed": return CheckCircle;
      case "pending": return Clock;
      case "failed": return XCircle;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "confirmed": return "text-green-500 bg-green-500/10";
      case "pending": return "text-amber-500 bg-amber-500/10";
      case "failed": return "text-red-500 bg-red-500/10";
    }
  };

  const getInstructionIcon = (type: string) => {
    if (type.includes('transfer')) return ArrowRightLeft;
    if (type.includes('create')) return Cpu;
    if (type.includes('swap')) return Coins;
    return Code;
  };

  const getInstructionColor = (programName: string) => {
    if (programName.includes('Token')) return 'text-purple-500 bg-purple-500/10';
    if (programName.includes('System')) return 'text-blue-500 bg-blue-500/10';
    if (programName.includes('Jupiter')) return 'text-orange-500 bg-orange-500/10';
    if (programName.includes('Raydium')) return 'text-cyan-500 bg-cyan-500/10';
    return 'text-muted-foreground bg-muted';
  };

  const StatusIcon = getStatusIcon();
  const parsedInstructions = transaction.parsedInstructions || [];
  const tokenTransfers = transaction.tokenTransfers || [];
  const signers = transaction.signers || [];
  const logs = transaction.logs || [];
  const displayedInstructions = showAllInstructions ? parsedInstructions : parsedInstructions.slice(0, 3);

  return (
    <Sheet open={!!transaction} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl bg-background border-border p-0">
        <SheetHeader className="px-6 pt-6 pb-2">
          <SheetTitle className="text-xl font-bold">
            Solana Transaction Details
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(90vh-100px)] px-6 pb-8">
          {/* Status and Amount Header */}
          <div className="text-center py-4">
            <div className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3",
              isSend ? "bg-red-500/10" : "bg-green-500/10"
            )}>
              {isSend ? (
                <ArrowUpRight className="w-7 h-7 text-red-500" />
              ) : (
                <ArrowDownLeft className="w-7 h-7 text-green-500" />
              )}
            </div>

            <p className={cn(
              "text-2xl font-bold",
              isSend ? "text-red-500" : "text-green-500"
            )}>
              {isSend ? "-" : "+"}
              {formatLamports(transaction.value || '0')} SOL
            </p>

            {/* Status Badge */}
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-1.5 rounded-full mt-3",
              getStatusColor()
            )}>
              <StatusIcon className="w-4 h-4" />
              <span className="text-sm font-medium capitalize">{status}</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Token Transfers Section */}
          {tokenTransfers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Token Transfers ({tokenTransfers.length})
              </h3>
              <div className="space-y-2">
                {tokenTransfers.map((transfer, index) => {
                  const isOutgoing = transfer.source?.toLowerCase() === userAddress?.toLowerCase();
                  const amount = transfer.decimals 
                    ? (parseInt(transfer.amount) / Math.pow(10, transfer.decimals)).toFixed(transfer.decimals > 4 ? 4 : transfer.decimals)
                    : transfer.amount;
                  
                  return (
                    <div 
                      key={index}
                      className="p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "text-sm font-semibold",
                          isOutgoing ? "text-red-500" : "text-green-500"
                        )}>
                          {isOutgoing ? "Sent" : "Received"}
                        </span>
                        <span className="font-mono font-bold">
                          {isOutgoing ? "-" : "+"}{amount} {transfer.symbol || 'Token'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>From:</span>
                          <button 
                            onClick={() => handleCopy(transfer.source, `Transfer ${index} source`)}
                            className="font-mono hover:text-primary"
                          >
                            {formatAddress(transfer.source)}
                          </button>
                        </div>
                        <div className="flex justify-between">
                          <span>To:</span>
                          <button 
                            onClick={() => handleCopy(transfer.destination, `Transfer ${index} destination`)}
                            className="font-mono hover:text-primary"
                          >
                            {formatAddress(transfer.destination)}
                          </button>
                        </div>
                        {transfer.mint && (
                          <div className="flex justify-between">
                            <span>Mint:</span>
                            <button 
                              onClick={() => handleCopy(transfer.mint!, `Transfer ${index} mint`)}
                              className="font-mono hover:text-primary"
                            >
                              {formatAddress(transfer.mint)}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Parsed Instructions Section */}
          {parsedInstructions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4" />
                Instructions ({parsedInstructions.length})
              </h3>
              <div className="space-y-2">
                {displayedInstructions.map((instruction, index) => {
                  const Icon = getInstructionIcon(instruction.type);
                  return (
                    <div 
                      key={index}
                      className="p-3 rounded-xl bg-card border border-border"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          getInstructionColor(instruction.programName)
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm capitalize">
                            {instruction.type.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {instruction.programName}
                          </p>
                        </div>
                      </div>
                      {instruction.info && Object.keys(instruction.info).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border">
                          <div className="text-xs text-muted-foreground space-y-1">
                            {Object.entries(instruction.info).slice(0, 3).map(([key, val]) => (
                              <div key={key} className="flex justify-between gap-2">
                                <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                                <span className="font-mono truncate max-w-[150px]">
                                  {typeof val === 'object' ? JSON.stringify(val).slice(0, 20) + '...' : String(val).slice(0, 20)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {parsedInstructions.length > 3 && (
                <button
                  onClick={() => setShowAllInstructions(!showAllInstructions)}
                  className="w-full mt-2 py-2 text-sm text-primary flex items-center justify-center gap-1 hover:underline"
                >
                  {showAllInstructions ? (
                    <>Show Less <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show All ({parsedInstructions.length}) <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Signers Section */}
          {signers.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Signers ({signers.length})
              </h3>
              <div className="p-3 rounded-xl bg-card border border-border space-y-2">
                {signers.map((signer, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-mono text-sm">{formatAddress(signer)}</span>
                    <button
                      onClick={() => handleCopy(signer, `Signer ${index + 1}`)}
                      className="text-primary text-xs flex items-center gap-1 hover:underline"
                    >
                      {copiedField === `Signer ${index + 1}` ? (
                        <><Check className="w-3 h-3" /> Copied</>
                      ) : (
                        <><Copy className="w-3 h-3" /> Copy</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Details Card */}
          <div className="bg-card border border-border rounded-xl divide-y divide-border mb-4">
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Date</span>
              <span className="text-sm font-medium">{formatDate(transaction.timestamp)}</span>
            </div>

            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Block (Slot)</span>
              <span className="text-sm font-mono">{transaction.blockNumber?.toLocaleString() || 'N/A'}</span>
            </div>

            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Network Fee</span>
              <span className="text-sm font-mono">
                {transaction.fee ? `${(transaction.fee / 1e9).toFixed(6)} SOL` : 'N/A'}
              </span>
            </div>

            <div className="p-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-muted-foreground">Transaction Signature</span>
                <button
                  onClick={() => handleCopy(transaction.hash, "Signature")}
                  className="text-primary text-xs flex items-center gap-1 hover:underline"
                >
                  {copiedField === "Signature" ? (
                    <><Check className="w-3 h-3" /> Copied</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy</>
                  )}
                </button>
              </div>
              <p className="font-mono text-xs text-muted-foreground break-all">
                {transaction.hash}
              </p>
            </div>
          </div>

          {/* Logs Section */}
          {logs.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setShowLogs(!showLogs)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-card border border-border"
              >
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  Program Logs ({logs.length})
                </span>
                {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showLogs && (
                <div className="mt-2 p-3 rounded-xl bg-muted/50 border border-border overflow-x-auto">
                  <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                    {logs.join('\n')}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* View on Explorer */}
          <Button
            variant="outline"
            onClick={() => window.open(`https://explorer.solana.com/tx/${transaction.hash}`, "_blank")}
            className="w-full h-12 border-border bg-card hover:bg-secondary mb-3"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View on Solana Explorer
          </Button>

          {/* Close Button */}
          <Button
            onClick={onClose}
            className="w-full h-12 bg-primary hover:bg-primary/90"
          >
            Done
          </Button>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
