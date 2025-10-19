import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonInput,
  SkeletonButton,
  SkeletonText,
} from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FormSkeletonProps {
  fields?: number;
  showHeader?: boolean;
  showButtons?: boolean;
  variant?: "default" | "login" | "profile" | "settings" | "contact";
  className?: string;
}

const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  showHeader = true,
  showButtons = true,
  variant = "default",
  className,
}) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const fieldVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
  };

  const renderLoginForm = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" variant="text" />
          <SkeletonInput />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" variant="text" />
          <SkeletonInput />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-4 rounded" variant="button" />
          <Skeleton className="h-4 w-32" variant="text" />
        </div>
      </div>
      {showButtons && (
        <div className="space-y-2">
          <SkeletonButton className="w-full" />
          <Skeleton className="h-4 w-48 mx-auto" variant="text" />
        </div>
      )}
    </div>
  );

  const renderProfileForm = () => (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" variant="avatar" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" variant="text" />
          <Skeleton className="h-4 w-32" variant="text" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <motion.div key={i} variants={fieldVariants} className="space-y-2">
            <Skeleton className="h-4 w-24" variant="text" />
            <SkeletonInput />
          </motion.div>
        ))}
      </div>
      {showButtons && (
        <div className="flex space-x-2">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      )}
    </div>
  );

  const renderSettingsForm = () => (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, i) => (
        <motion.div key={i} variants={fieldVariants} className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" variant="text" />
            <Skeleton className="h-4 w-48" variant="text" />
          </div>
          <SkeletonInput />
        </motion.div>
      ))}
      {showButtons && (
        <div className="flex space-x-2">
          <SkeletonButton />
          <SkeletonButton />
        </div>
      )}
    </div>
  );

  const renderContactForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={fieldVariants} className="space-y-2">
          <Skeleton className="h-4 w-20" variant="text" />
          <SkeletonInput />
        </motion.div>
        <motion.div variants={fieldVariants} className="space-y-2">
          <Skeleton className="h-4 w-20" variant="text" />
          <SkeletonInput />
        </motion.div>
      </div>
      <motion.div variants={fieldVariants} className="space-y-2">
        <Skeleton className="h-4 w-20" variant="text" />
        <SkeletonInput />
      </motion.div>
      <motion.div variants={fieldVariants} className="space-y-2">
        <Skeleton className="h-4 w-20" variant="text" />
        <Skeleton className="h-24 w-full rounded-md" variant="input" />
      </motion.div>
      {showButtons && (
        <motion.div variants={fieldVariants} className="flex space-x-2">
          <SkeletonButton />
          <SkeletonButton />
        </motion.div>
      )}
    </div>
  );

  const renderDefaultForm = () => (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <motion.div key={i} variants={fieldVariants} className="space-y-2">
          <Skeleton className="h-4 w-24" variant="text" />
          <SkeletonInput />
        </motion.div>
      ))}
      {showButtons && (
        <motion.div variants={fieldVariants} className="flex space-x-2 pt-4">
          <SkeletonButton />
          <SkeletonButton />
        </motion.div>
      )}
    </div>
  );

  const renderForm = () => {
    switch (variant) {
      case "login":
        return renderLoginForm();
      case "profile":
        return renderProfileForm();
      case "settings":
        return renderSettingsForm();
      case "contact":
        return renderContactForm();
      default:
        return renderDefaultForm();
    }
  };

  return (
    <Card className={cn("", className)}>
      {showHeader && (
        <CardHeader>
          <Skeleton className="h-6 w-32" variant="text" />
          <Skeleton className="h-4 w-48" variant="text" />
        </CardHeader>
      )}
      <CardContent>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {renderForm()}
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default FormSkeleton;
