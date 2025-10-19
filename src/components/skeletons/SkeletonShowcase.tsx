import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CardSkeleton,
  TableSkeleton,
  FormSkeleton,
  ListSkeleton,
  ChartSkeleton,
  ModernSkeleton,
  SkeletonText,
  SkeletonTitle,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonImage,
  SkeletonChart,
} from "@/components/skeletons";

const SkeletonShowcase: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Modern Skeleton Loaders</h1>
        <p className="text-muted-foreground">
          A comprehensive collection of modern, element-specific skeleton
          loaders
        </p>
      </div>

      {/* Basic Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Skeleton Components</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Text Skeletons</h3>
              <div className="space-y-2">
                <SkeletonText lines={1} />
                <SkeletonText lines={3} />
                <SkeletonTitle />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Avatar Skeletons</h3>
              <div className="flex space-x-4">
                <SkeletonAvatar size="sm" />
                <SkeletonAvatar size="md" />
                <SkeletonAvatar size="lg" />
                <SkeletonAvatar size="xl" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Button Skeletons</h3>
              <div className="flex space-x-4">
                <SkeletonButton size="sm" />
                <SkeletonButton size="md" />
                <SkeletonButton size="lg" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Image Skeleton</h3>
              <SkeletonImage />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>Card Skeleton Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton variant="default" />
            <CardSkeleton variant="stats" />
            <CardSkeleton variant="profile" />
            <CardSkeleton variant="activity" />
            <CardSkeleton variant="metric" />
            <CardSkeleton variant="chart" />
          </div>
        </CardContent>
      </Card>

      {/* Table Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>Table Skeleton Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Default Table</h3>
            <TableSkeleton columns={4} rows={5} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Compact Table</h3>
            <TableSkeleton variant="compact" columns={3} rows={4} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Detailed Table</h3>
            <TableSkeleton variant="detailed" columns={5} rows={6} />
          </div>
        </CardContent>
      </Card>

      {/* Form Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>Form Skeleton Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Login Form</h3>
            <FormSkeleton variant="login" fields={2} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Profile Form</h3>
            <FormSkeleton variant="profile" fields={4} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Form</h3>
            <FormSkeleton variant="contact" fields={4} />
          </div>
        </CardContent>
      </Card>

      {/* List Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>List Skeleton Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Activity List</h3>
            <ListSkeleton variant="activity" items={4} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">User List</h3>
            <ListSkeleton variant="user" items={5} />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Product List</h3>
            <ListSkeleton variant="product" items={3} />
          </div>
        </CardContent>
      </Card>

      {/* Chart Skeletons */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Skeleton Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Line Chart</h3>
              <ChartSkeleton variant="line" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Bar Chart</h3>
              <ChartSkeleton variant="bar" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Pie Chart</h3>
              <ChartSkeleton variant="pie" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Area Chart</h3>
              <ChartSkeleton variant="area" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animation Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Animation Variants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Pulse Animation</h3>
              <div className="flex space-x-4">
                <ModernSkeleton
                  variant="rectangular"
                  width={100}
                  height={20}
                  animation="pulse"
                />
                <ModernSkeleton
                  variant="circular"
                  width={40}
                  height={40}
                  animation="pulse"
                />
                <ModernSkeleton
                  variant="rounded"
                  width={80}
                  height={32}
                  animation="pulse"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Shimmer Animation</h3>
              <div className="flex space-x-4">
                <ModernSkeleton
                  variant="rectangular"
                  width={100}
                  height={20}
                  animation="shimmer"
                />
                <ModernSkeleton
                  variant="circular"
                  width={40}
                  height={40}
                  animation="shimmer"
                />
                <ModernSkeleton
                  variant="rounded"
                  width={80}
                  height={32}
                  animation="shimmer"
                />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Wave Animation</h3>
              <div className="flex space-x-4">
                <ModernSkeleton
                  variant="rectangular"
                  width={100}
                  height={20}
                  animation="wave"
                />
                <ModernSkeleton
                  variant="circular"
                  width={40}
                  height={40}
                  animation="wave"
                />
                <ModernSkeleton
                  variant="rounded"
                  width={80}
                  height={32}
                  animation="wave"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SkeletonShowcase;
