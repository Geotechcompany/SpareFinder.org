/**
 * Comprehensive Analysis Modal
 * 
 * Shows real-time progress of AI Analysis Crew
 * Displays updates from all 5 AI agents working in sequence
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2, Mail, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useAIAnalysisCrew, 
  CrewProgressUpdate, 
  getStageDisplayName, 
  getStageIcon,
  CREW_STAGES 
} from '@/services/aiAnalysisCrew';

// ============================================================================
// Types
// ============================================================================

interface ComprehensiveAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageFile: File | null;
  keywords?: string;
}

interface AgentProgress {
  stage: string;
  displayName: string;
  icon: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message: string;
  timestamp?: number;
}

// ============================================================================
// Component
// ============================================================================

export const ComprehensiveAnalysisModal = ({
  open,
  onOpenChange,
  imageFile,
  keywords = '',
}: ComprehensiveAnalysisModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { analyzeWithCrew, disconnect } = useAIAnalysisCrew();

  // State
  const [email, setEmail] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>('');
  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([]);
  const [overallStatus, setOverallStatus] = useState<'idle' | 'analyzing' | 'completed' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Automatically set email from authenticated user
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  // Initialize agent progress stages
  useEffect(() => {
    if (open) {
      initializeAgentProgress();
      setOverallStatus('idle');
      setProgress(0);
      setErrorMessage('');
    }
  }, [open]);

  const initializeAgentProgress = () => {
    const stages = [
      { stage: CREW_STAGES.IMAGE_ANALYSIS, displayName: 'Image Analysis' },
      { stage: CREW_STAGES.PART_IDENTIFIER, displayName: 'Part Identification' },
      { stage: CREW_STAGES.RESEARCH, displayName: 'Technical Research' },
      { stage: CREW_STAGES.SUPPLIER_FINDER, displayName: 'Supplier Discovery' },
      { stage: CREW_STAGES.REPORT_GENERATOR, displayName: 'Report Generation' },
      { stage: CREW_STAGES.DATABASE_STORAGE, displayName: 'Database Storage' },
      { stage: CREW_STAGES.EMAIL_AGENT, displayName: 'Email Delivery' },
    ];

    setAgentProgress(
      stages.map((s) => ({
        stage: s.stage,
        displayName: s.displayName,
        icon: getStageIcon(s.stage),
        status: 'pending',
        message: 'Waiting...',
      }))
    );
  };

  const handleProgressUpdate = (update: CrewProgressUpdate) => {
    console.log('Progress update:', update);

    setCurrentStage(update.stage);

    // Update agent progress
    setAgentProgress((prev) => {
      return prev.map((agent) => {
        if (agent.stage === update.stage) {
          return {
            ...agent,
            status: update.status,
            message: update.message,
            timestamp: update.timestamp || Date.now(),
          };
        }
        return agent;
      });
    });

    // Calculate progress based on stage
    const stageProgress: Record<string, number> = {
      setup: 5,
      [CREW_STAGES.IMAGE_ANALYSIS]: 15,
      [CREW_STAGES.PART_IDENTIFIER]: 30,
      [CREW_STAGES.RESEARCH]: 50,
      [CREW_STAGES.SUPPLIER_FINDER]: 70,
      [CREW_STAGES.REPORT_GENERATOR]: 85,
      [CREW_STAGES.EMAIL_AGENT]: 95,
      [CREW_STAGES.COMPLETION]: 100,
    };

    setProgress(stageProgress[update.stage] || progress);

    // Handle completion
    if (update.stage === CREW_STAGES.COMPLETION || update.stage === 'final') {
      setOverallStatus('completed');
      setProgress(100);
      toast({
        title: 'Analysis Complete! 🎉',
        description: `Your comprehensive report has been sent to ${email}`,
      });
    }

    // Handle errors
    if (update.status === 'error') {
      setOverallStatus('error');
      setErrorMessage(update.message);
      toast({
        title: 'Analysis Failed',
        description: update.message,
        variant: 'destructive',
      });
    }
  };

  const handleStartAnalysis = async () => {
    // Validate email
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    // Validate image
    if (!imageFile) {
      toast({
        title: 'No Image',
        description: 'Please upload an image to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setOverallStatus('analyzing');
    initializeAgentProgress();

    try {
      const result = await analyzeWithCrew(email, imageFile, keywords, handleProgressUpdate);

      if (result.status === 'error') {
        setOverallStatus('error');
        setErrorMessage(result.error || 'Analysis failed');
        toast({
          title: 'Analysis Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setOverallStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      toast({
        title: 'Analysis Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClose = () => {
    if (isAnalyzing) {
      disconnect();
      setIsAnalyzing(false);
    }
    onOpenChange(false);
  };

  const handleDone = () => {
    setEmail('');
    initializeAgentProgress();
    onOpenChange(false);
  };

  // ============================================================================
  // Render Agent Status Icon
  // ============================================================================

  const renderStatusIcon = (status: AgentProgress['status']) => {
    switch (status) {
      case 'in_progress':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            🤖 Comprehensive AI Analysis
          </DialogTitle>
          <DialogDescription>
            Get a detailed professional report with part identification, technical specs, and verified suppliers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Email Display - Only show if not analyzing */}
          {overallStatus === 'idle' && (
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Report Delivery Email
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-gray-50"
                    disabled={isAnalyzing}
                    readOnly={!!user?.email}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {user?.email ? (
                  <>✓ Using your account email - Your comprehensive PDF report will be sent here</>
                ) : (
                  <>Your comprehensive PDF report will be sent to this email</>
                )}
              </p>
            </div>
          )}

          {/* Keywords Display */}
          {keywords && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Keywords:</strong> {keywords}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {overallStatus === 'analyzing' && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-gray-600">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Agent Progress List */}
          {overallStatus !== 'idle' && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700">AI Agents Progress</h3>
              <div className="space-y-2">
                {agentProgress.map((agent, index) => (
                  <div
                    key={agent.stage}
                    className={`
                      flex items-start gap-3 p-3 rounded-lg border transition-all
                      ${agent.status === 'in_progress' ? 'bg-blue-50 border-blue-200' : ''}
                      ${agent.status === 'completed' ? 'bg-green-50 border-green-200' : ''}
                      ${agent.status === 'error' ? 'bg-red-50 border-red-200' : ''}
                      ${agent.status === 'pending' ? 'bg-gray-50 border-gray-200 opacity-60' : ''}
                    `}
                  >
                    <div className="flex-shrink-0 mt-0.5">{renderStatusIcon(agent.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agent.icon}</span>
                        <span className="font-medium text-sm">{agent.displayName}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{agent.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {overallStatus === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900">Analysis Failed</h4>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {overallStatus === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900">Analysis Complete! 🎉</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your comprehensive report has been generated and sent to <strong>{email}</strong>
                  </p>
                  <div className="mt-3 space-y-1 text-xs text-green-600">
                    <p>✅ Part identification with technical specs</p>
                    <p>✅ Top 3 verified suppliers with contact info</p>
                    <p>✅ Alternative/replacement options</p>
                    <p>✅ Professional PDF report</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {overallStatus === 'idle' && (
              <>
                <Button variant="outline" onClick={handleClose} disabled={isAnalyzing}>
                  Cancel
                </Button>
                <Button
                  onClick={handleStartAnalysis}
                  disabled={isAnalyzing || !email || !imageFile}
                  className="min-w-32"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      🚀 Start Analysis
                    </>
                  )}
                </Button>
              </>
            )}

            {overallStatus === 'analyzing' && (
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
            )}

            {(overallStatus === 'completed' || overallStatus === 'error') && (
              <Button onClick={handleDone}>Done</Button>
            )}
          </div>

          {/* Info Footer */}
          {overallStatus === 'idle' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">What you'll receive:</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>Complete part identification with model/serial numbers</li>
                <li>Full technical specifications and features</li>
                <li>Top 3 verified suppliers with pricing and contact details</li>
                <li>Alternative/replacement options</li>
                <li>Professional PDF report sent to your email</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

