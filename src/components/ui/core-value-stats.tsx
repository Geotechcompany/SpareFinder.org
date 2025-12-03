import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export interface CoreStat {
  value: string;
  label: string;
  description: string;
  image?: string;
}

interface CoreValueStatsProps {
  title?: string;
  subtitle?: string;
  description?: string;
  stats: CoreStat[];
}

export default function CoreValueStats({
  title = "Building Scalable Digital Foundations for the Modern Era.",
  subtitle = "Core Values",
  description = "From design systems to digital ecosystems, we create flexible, consistent, and elegant frameworks for forward-thinking teams.",
  stats,
}: CoreValueStatsProps) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 text-center">
      {/* Section header */}
      <div className="mb-12 space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-primary dark:text-purple-400">
          {subtitle}
        </p>
        <h2 className="text-3xl font-semibold leading-tight tracking-tight text-foreground md:text-5xl dark:bg-gradient-to-r dark:from-white dark:via-purple-200 dark:to-blue-200 dark:bg-clip-text dark:text-transparent">
          {title}
        </h2>
        <p className="mx-auto max-w-3xl text-lg text-muted-foreground">
          {description}
        </p>
      </div>

      {/* Flex container for cards */}
      <div className="flex flex-nowrap overflow-x-auto gap-6 mt-10 sm:flex-wrap sm:justify-center">
        {stats.map((item, i) => {
          const cardContent = (
            <CardContent className="relative z-10 flex h-full flex-col justify-end space-y-3 p-6 text-left">
              <div>
                <h3 className="text-4xl font-bold drop-shadow-md text-foreground dark:bg-gradient-to-r dark:from-purple-400 dark:to-blue-400 dark:bg-clip-text dark:text-transparent">
                  {item.value}
                </h3>
                <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground dark:text-white">
                  {item.label}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground dark:text-gray-300">
                  {item.description}
                </p>
              </div>
              <Button
                variant="link"
                className={`mt-2 px-0 text-sm font-medium ${
                  item.image
                    ? "text-primary hover:text-primary/80 dark:text-white dark:hover:text-purple-300"
                    : "text-primary hover:text-primary/80 dark:text-purple-400 dark:hover:text-purple-300"
                }`}
              >
                Learn more →
              </Button>
            </CardContent>
          );

          // If image exists, wrap with 3D hover effect
          if (item.image) {
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                whileHover={{
                  rotateX: 5,
                  rotateY: 5,
                  scale: 1.05,
                  transition: { type: "spring", stiffness: 200, damping: 10 },
                }}
                className="perspective-1000 flex-shrink-0 w-[280px] sm:w-[45%] md:w-[45%] lg:w-[280px]"
              >
                <Card className="relative h-64 overflow-hidden rounded-3xl border border-border bg-card/95 text-foreground shadow-soft-elevated backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/20 dark:border-purple-500/30 dark:bg-gray-900/50 dark:text-white">
                  <img
                    src={item.image}
                    alt={item.label}
                    className="absolute inset-0 object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent dark:from-black dark:via-black/70" />
                  {cardContent}
                </Card>
              </motion.div>
            );
          }

          // Non-image card
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              viewport={{ once: true }}
              className="flex-shrink-0 w-[280px] sm:w-[45%] md:w-[45%] lg:w-[280px]"
            >
              <Card className="relative h-64 overflow-hidden rounded-3xl border border-border bg-card/95 text-foreground shadow-soft-elevated backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/20 dark:border-gray-800 dark:bg-gray-900/50 dark:text-white dark:hover:border-purple-500/50">
                {cardContent}
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

