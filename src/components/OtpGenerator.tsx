import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Shield, Clock, History, Download, Settings, Trash2, Timer, Volume2, VolumeX, Play, Pause } from "lucide-react";

type CodeType = 'numeric' | 'alphanumeric';
type CodeLength = 4 | 6 | 8;

interface HistoryItem {
  id: string;
  code: string;
  generatedAt: Date;
  expiresAt: Date;
  length: CodeLength;
  type: CodeType;
}

interface Settings {
  expiryMinutes: number;
  autoRefresh: boolean;
  soundEnabled: boolean;
  batchCount: number;
}

const OtpGenerator = () => {
  const [otp, setOtp] = useState<string>('');
  const [codeLength, setCodeLength] = useState<CodeLength>(6);
  const [codeType, setCodeType] = useState<CodeType>('numeric');
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<Settings>({
    expiryMinutes: 5,
    autoRefresh: false,
    soundEnabled: true,
    batchCount: 1
  });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isAutoRunning, setIsAutoRunning] = useState<boolean>(false);
  const [batchCodes, setBatchCodes] = useState<string[]>([]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('otp-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    const savedHistory = localStorage.getItem('otp-history');
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory).map((item: any) => ({
        ...item,
        generatedAt: new Date(item.generatedAt),
        expiresAt: new Date(item.expiresAt)
      }));
      setHistory(parsedHistory);
    }
  }, []);

  // Save settings to localStorage when changed
  useEffect(() => {
    localStorage.setItem('otp-settings', JSON.stringify(settings));
  }, [settings]);

  // Timer countdown effect
  useEffect(() => {
    if (generatedAt && settings.expiryMinutes > 0) {
      const expiryTime = new Date(generatedAt.getTime() + settings.expiryMinutes * 60 * 1000);
      
      const timer = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, expiryTime.getTime() - now.getTime());
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          clearInterval(timer);
          if (settings.autoRefresh && isAutoRunning) {
            generateOtp();
          }
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [generatedAt, settings.expiryMinutes, settings.autoRefresh, isAutoRunning]);

  const playSound = useCallback(() => {
    if (settings.soundEnabled) {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    }
  }, [settings.soundEnabled]);

  const generateSingleOtp = useCallback(() => {
    const numericChars = '0123456789';
    const alphanumericChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = codeType === 'numeric' ? numericChars : alphanumericChars;
    
    let result = '';
    for (let i = 0; i < codeLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }, [codeType, codeLength]);

  const generateOtp = useCallback(() => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + settings.expiryMinutes * 60 * 1000);
    
    if (settings.batchCount === 1) {
      const newOtp = generateSingleOtp();
      setOtp(newOtp);
      setBatchCodes([]);
      
      // Add to history
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        code: newOtp,
        generatedAt: now,
        expiresAt,
        length: codeLength,
        type: codeType
      };
      
      const newHistory = [historyItem, ...history].slice(0, 20); // Keep last 20
      setHistory(newHistory);
      localStorage.setItem('otp-history', JSON.stringify(newHistory));
    } else {
      const codes = Array.from({ length: settings.batchCount }, () => generateSingleOtp());
      setBatchCodes(codes);
      setOtp('');
      
      // Add all codes to history
      const historyItems: HistoryItem[] = codes.map((code, index) => ({
        id: `${Date.now()}-${index}`,
        code,
        generatedAt: now,
        expiresAt,
        length: codeLength,
        type: codeType
      }));
      
      const newHistory = [...historyItems, ...history].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem('otp-history', JSON.stringify(newHistory));
    }
    
    setGeneratedAt(now);
    playSound();
    
    toast({
      title: settings.batchCount === 1 ? "OTP Generated" : `${settings.batchCount} OTPs Generated`,
      description: settings.batchCount === 1 ? "New one-time password created successfully" : `Generated ${settings.batchCount} one-time passwords`,
    });
  }, [codeType, codeLength, settings.expiryMinutes, settings.batchCount, generateSingleOtp, history, playSound]);

  const copyToClipboard = async (code?: string) => {
    const textToCopy = code || (batchCodes.length > 0 ? batchCodes.join('\n') : otp);
    if (!textToCopy) return;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: "Copied!",
        description: batchCodes.length > 0 ? "All OTPs copied to clipboard" : "OTP copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleCopyClick = () => copyToClipboard();

  const exportCodes = () => {
    const exportData = batchCodes.length > 0 ? batchCodes : (otp ? [otp] : []);
    if (exportData.length === 0) return;
    
    const content = exportData.map((code, index) => 
      `OTP ${index + 1}: ${code}\nGenerated: ${generatedAt?.toLocaleString()}\nExpires: ${new Date(generatedAt!.getTime() + settings.expiryMinutes * 60 * 1000).toLocaleString()}\n`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `otp-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported!",
      description: "OTP codes exported to file",
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('otp-history');
    toast({
      title: "History cleared",
      description: "All previous OTPs have been removed",
    });
  };

  const toggleAutoRefresh = () => {
    setIsAutoRunning(!isAutoRunning);
    setSettings(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isExpired = timeLeft === 0 && generatedAt;
  const progressPercent = generatedAt && settings.expiryMinutes > 0 
    ? ((settings.expiryMinutes * 60 * 1000 - timeLeft) / (settings.expiryMinutes * 60 * 1000)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-primary p-3 rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">OTP Generator Pro</h1>
          <p className="text-muted-foreground">Advanced one-time password generator with history & automation</p>
        </div>

        {/* Quick Settings Row */}
        <div className="flex flex-wrap gap-2 justify-center">
          <div className="flex items-center gap-2">
            <Select value={codeLength.toString()} onValueChange={(value) => setCodeLength(parseInt(value) as CodeLength)}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
            <Select value={codeType} onValueChange={(value) => setCodeType(value as CodeType)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="numeric">Numeric</SelectItem>
                <SelectItem value="alphanumeric">Alpha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={isAutoRunning ? "default" : "outline"}
              size="sm"
              onClick={toggleAutoRefresh}
              className={isAutoRunning ? "bg-success text-success-foreground" : ""}
            >
              {isAutoRunning ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              Auto
            </Button>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Advanced Settings</DialogTitle>
                  <DialogDescription>Configure OTP generation preferences</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Expiry Time (minutes)</label>
                    <Input
                      type="number"
                      min="1"
                      max="60"
                      value={settings.expiryMinutes}
                      onChange={(e) => setSettings(prev => ({ ...prev, expiryMinutes: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Batch Count</label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={settings.batchCount}
                      onChange={(e) => setSettings(prev => ({ ...prev, batchCount: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Sound Notifications</label>
                    <Switch
                      checked={settings.soundEnabled}
                      onCheckedChange={(checked) => setSettings(prev => ({ ...prev, soundEnabled: checked }))}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <History className="h-4 w-4 mr-1" />
                  History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>OTP History</DialogTitle>
                  <DialogDescription>Recent one-time passwords (max 20)</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {history.length > 0 ? (
                    <>
                      <ScrollArea className="h-64">
                        <div className="space-y-2">
                          {history.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 rounded border">
                              <div>
                                <div className="font-mono font-bold">{item.code}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatTime(item.generatedAt)}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(item.code)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={clearHistory}>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No OTPs generated yet
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Generator Card */}
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Timer & Progress */}
              {(otp || batchCodes.length > 0) && generatedAt && settings.expiryMinutes > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4" />
                      <span>Expires in</span>
                    </div>
                    <div className={`font-mono font-bold ${isExpired ? 'text-destructive' : 'text-primary'}`}>
                      {isExpired ? 'EXPIRED' : formatTimeLeft(timeLeft)}
                    </div>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>
              )}

              {/* Generated OTP Display */}
              <div className="text-center space-y-4">
                {batchCodes.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-card p-4 rounded-xl border border-border">
                      <div className="text-sm font-medium mb-3 opacity-60">
                        Batch of {batchCodes.length} codes:
                      </div>
                      <div className="grid gap-2">
                        {batchCodes.map((code, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-background/50 rounded border">
                            <div className="font-mono font-bold text-lg text-primary">{code}</div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(code)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : otp ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-card p-6 rounded-xl border border-border">
                      <div className={`text-4xl font-mono font-bold tracking-widest ${isExpired ? 'text-destructive' : 'text-primary'}`}>
                        {otp}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="text-6xl mb-4">🔐</div>
                    <p className="text-muted-foreground">Click generate to create your OTP</p>
                  </div>
                )}

                {/* Generation Info */}
                {(otp || batchCodes.length > 0) && generatedAt && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Generated at {formatTime(generatedAt)}
                    </div>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Badge variant="secondary">
                        {codeLength} {codeType === 'numeric' ? 'digits' : 'characters'}
                      </Badge>
                      <Badge variant="outline">
                        {codeType === 'numeric' ? 'Numbers only' : 'Letters & Numbers'}
                      </Badge>
                      {settings.batchCount > 1 && (
                        <Badge variant="outline">
                          Batch of {settings.batchCount}
                        </Badge>
                      )}
                      {isExpired && <Badge variant="destructive">EXPIRED</Badge>}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={generateOtp}
                  className="bg-gradient-primary shadow-lg hover:opacity-90 transition-opacity"
                  size="lg"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate
                </Button>
                
                <Button 
                  onClick={handleCopyClick}
                  disabled={!otp && batchCodes.length === 0}
                  variant="outline"
                  size="lg"
                  className="border-primary/20 hover:bg-primary/5"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>

                <Button 
                  onClick={exportCodes}
                  disabled={!otp && batchCodes.length === 0}
                  variant="outline"
                  size="lg"
                  className="border-accent/20 hover:bg-accent/5"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-success">100% Secure</p>
                  <p className="text-xs text-muted-foreground">
                    Generated locally, never sent to servers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <Timer className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-primary">Smart Expiry</p>
                  <p className="text-xs text-muted-foreground">
                    Automatic expiration with visual countdown
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OtpGenerator;