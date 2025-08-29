import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Shield, Clock } from "lucide-react";

type CodeType = 'numeric' | 'alphanumeric';
type CodeLength = 4 | 6 | 8;

const OtpGenerator = () => {
  const [otp, setOtp] = useState<string>('');
  const [codeLength, setCodeLength] = useState<CodeLength>(6);
  const [codeType, setCodeType] = useState<CodeType>('numeric');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);

  const generateOtp = () => {
    const numericChars = '0123456789';
    const alphanumericChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = codeType === 'numeric' ? numericChars : alphanumericChars;
    
    let result = '';
    for (let i = 0; i < codeLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    setOtp(result);
    setGeneratedAt(new Date());
    
    toast({
      title: "OTP Generated",
      description: "New one-time password created successfully",
    });
  };

  const copyToClipboard = async () => {
    if (!otp) return;
    
    try {
      await navigator.clipboard.writeText(otp);
      toast({
        title: "Copied!",
        description: "OTP copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">OTP Generator</h1>
          <p className="text-muted-foreground">Generate secure one-time passwords</p>
        </div>

        {/* Settings Card */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
            <CardDescription>Configure your OTP preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Length</label>
                <Select value={codeLength.toString()} onValueChange={(value) => setCodeLength(parseInt(value) as CodeLength)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 digits</SelectItem>
                    <SelectItem value="6">6 digits</SelectItem>
                    <SelectItem value="8">8 digits</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={codeType} onValueChange={(value) => setCodeType(value as CodeType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="numeric">Numeric</SelectItem>
                    <SelectItem value="alphanumeric">Alphanumeric</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generator Card */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Generated OTP Display */}
              <div className="text-center space-y-4">
                {otp ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-card p-6 rounded-xl border border-border">
                      <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                        {otp}
                      </div>
                    </div>
                    
                    {generatedAt && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Generated at {formatTime(generatedAt)}
                      </div>
                    )}

                    <div className="flex gap-2 justify-center">
                      <Badge variant="secondary">
                        {codeLength} {codeType === 'numeric' ? 'digits' : 'characters'}
                      </Badge>
                      <Badge variant="outline">
                        {codeType === 'numeric' ? 'Numbers only' : 'Letters & Numbers'}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <p className="text-muted-foreground">Click generate to create your OTP</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={generateOtp}
                  className="bg-gradient-primary shadow-lg hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate
                </Button>
                
                <Button 
                  onClick={copyToClipboard}
                  disabled={!otp}
                  variant="outline"
                  size="lg"
                  className="border-primary/20 hover:bg-primary/5"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-success/20 bg-success/5">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-success">Security Notice</p>
                <p className="text-xs text-muted-foreground">
                  OTPs are generated locally in your browser. No data is sent to external servers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OtpGenerator;