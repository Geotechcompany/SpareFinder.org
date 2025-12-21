/**
 * SpareFinder Research Progress Component
 *
 * Shows real-time progress of SpareFinder AI Research in history cards
 * Displays agent progress and status for background tasks
 */

import React from "react";
import {
  CheckCircle2,
  Loader2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CREW_STAGES,
  getStageDisplayName,
  getStageIcon,
} from "@/services/aiAnalysisCrew";

interface CrewAnalysisProgressProps {
  status: string;
  currentStage?: string;
  progress?: number;
  errorMessage?: string;
  compact?: boolean;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const CrewAnalysisProgress = ({
  status,
  currentStage,
  progress = 0,
  errorMessage,
  compact = false,
  isExpanded = false,
  onToggleExpanded,
}: CrewAnalysisProgressProps) => {
  const isAnalyzing =
    status === "analyzing" ||
    status === "in_progress" ||
    status === "pending" ||
    status === "processing";
  const isCompleted = status === "completed";
  const isError = status === "error" || status === "failed";

  const stages = [
    {
      key: CREW_STAGES.PART_IDENTIFIER,
      name: "Part Identification",
      icon: "🔬",
      inProgress: "Part Being Identified...",
      completed: "✅ Part Identified",
    },
    {
      key: CREW_STAGES.RESEARCH,
      name: "Technical Research",
      icon: "📊",
      inProgress: "Technical Research Ongoing...",
      completed: "✅ Technical Research Completed",
    },
    {
      key: CREW_STAGES.SUPPLIER_FINDER,
      name: "Supplier Discovery",
      icon: "🏪",
      inProgress: "Supplier Search In Progress...",
      completed: "✅ Suppliers Identified",
    },
    {
      key: CREW_STAGES.REPORT_GENERATOR,
      name: "Report Compilation",
      icon: "📄",
      inProgress: "Compiling Structured Report...",
      completed: "✅ Comprehensive Report Generated",
    },
    {
      key: CREW_STAGES.EMAIL_AGENT,
      name: "Completion & Delivery",
      icon: "📧",
      inProgress: "Finalizing Output for Delivery...",
      completed: "✅ Analysis Ready & Delivery Confirmed",
    },
  ];

  const getCurrentStageIndex = () => {
    // Handle special stages
    if (currentStage === "retrying" || currentStage === "initialization") {
      return 0; // Show at Part Identification stage
    }

    // Handle stage mapping (consolidate image_analysis into part_identifier, database_storage into email_agent)
    const stageMapping: Record<string, string> = {
      image_analysis: "part_identifier",
      part_identification: "part_identifier",
      technical_research: "research_agent",
      supplier_discovery: "supplier_finder",
      report_generation: "report_generator",
      database_storage: "email_agent",
      email_sending: "email_agent",
      completed: "email_agent",
    };

    const mappedStage = stageMapping[currentStage || ""] || currentStage;
    return stages.findIndex((s) => s.key === mappedStage);
  };

  const getStageStatus = (index: number) => {
    // If overall status is completed, mark all stages as completed
    if (isCompleted) return "completed";

    const currentIndex = getCurrentStageIndex();
    if (currentIndex === -1) return "pending";
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return "in_progress";
    return "pending";
  };

  if (compact) {
    // Compact view for cards with collapsible stages
    return (
      <div className="space-y-2">
        {isAnalyzing && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">SpareFinder AI Research</span>
              <span className="text-blue-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />

            {/* Current Stage + Toggle Button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin text-blue-400" />
                <span>
                  {currentStage
                    ? getStageDisplayName(currentStage)
                    : "Initializing..."}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onToggleExpanded) {
                    onToggleExpanded();
                  }
                }}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent"
                title={isExpanded ? "Collapse stages" : "Expand stages"}
              >
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Collapsible Stages List */}
            {isExpanded && (
              <div className="space-y-1.5 pt-2 border-t border-border">
                {stages.map((stage, index) => {
                  const stageStatus = getStageStatus(index);
                  const displayText =
                    stageStatus === "in_progress"
                      ? stage.inProgress
                      : stageStatus === "completed"
                      ? stage.completed
                      : stage.name;

                  return (
                    <div
                      key={stage.key}
                      className={`
                        flex items-center gap-2 p-1.5 rounded text-xs transition-all
                        ${
                          stageStatus === "in_progress"
                            ? "bg-blue-600/20 text-blue-300"
                            : ""
                        }
                        ${stageStatus === "completed" ? "text-green-400" : ""}
                        ${
                          stageStatus === "pending"
                            ? "text-muted-foreground/70 opacity-70"
                            : ""
                        }
                      `}
                    >
                      <div className="flex-shrink-0">
                        {stageStatus === "in_progress" && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {stageStatus === "completed" && (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        {stageStatus === "pending" && (
                          <div className="h-3 w-3 rounded-full border border-muted-foreground/50" />
                        )}
                      </div>
                      {stageStatus !== "completed" && (
                        <span className="text-xs">{stage.icon}</span>
                      )}
                      <span className="text-xs font-medium">{displayText}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {isCompleted && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>✅ Analysis Ready & Delivery Confirmed</span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-xs text-red-400">
            <XCircle className="h-4 w-4" />
            <span>{errorMessage || "Analysis Failed"}</span>
          </div>
        )}
      </div>
    );
  }

  // Full view for expanded details
  return (
    <div className="space-y-4">
      {/* Status Badge */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          SpareFinder AI Research
        </h4>
        <Badge
          variant="outline"
          className={`${
            isAnalyzing ? "bg-blue-500" : isCompleted ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {isAnalyzing ? "In Progress" : isCompleted ? "Complete" : "Failed"}
        </Badge>
      </div>

      {/* Overall Progress */}
      {isAnalyzing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-600 dark:text-gray-400">
              Overall Progress
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Agent Stages */}
      <div className="space-y-2">
        {stages.map((stage, index) => {
          const stageStatus = getStageStatus(index);
          const displayText =
            stageStatus === "in_progress"
              ? stage.inProgress
              : stageStatus === "completed"
              ? stage.completed
              : stage.name;

          return (
            <div
              key={stage.key}
              className={`
                flex items-center gap-3 p-2 rounded-lg border transition-all
                ${
                  stageStatus === "in_progress"
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800"
                    : ""
                }
                ${
                  stageStatus === "completed"
                    ? "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800"
                    : ""
                }
                ${
                  stageStatus === "pending"
                    ? "bg-gray-50 border-gray-200 dark:bg-gray-900/30 dark:border-gray-700 opacity-60"
                    : ""
                }
              `}
            >
              <div className="flex-shrink-0">
                {stageStatus === "in_progress" && (
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                )}
                {stageStatus === "completed" && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {stageStatus === "pending" && (
                  <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex items-center gap-2 flex-1">
                {stageStatus !== "completed" && (
                  <span className="text-sm">{stage.icon}</span>
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {displayText}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Message */}
      {isError && errorMessage && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
};
