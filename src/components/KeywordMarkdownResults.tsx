import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Brain, FileText } from 'lucide-react';
import { parseMarkdownSections, MarkdownCard } from '@/lib/markdown-parser';

interface KeywordMarkdownResultsProps {
  markdown: string;
  modelVersion?: string;
}

const KeywordMarkdownResults: React.FC<KeywordMarkdownResultsProps> = ({ markdown, modelVersion = 'Keyword AI' }) => {
  const sections = React.useMemo(() => parseMarkdownSections(markdown || ''), [markdown]);

  if (!markdown?.trim()) {
    return (
      <div className="text-center text-gray-400 p-8 bg-black/20 rounded-2xl border border-white/10">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>No analysis content available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <span className="text-2xl">🔍</span>
            <span>Keyword Analysis</span>
          </h2>
          <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 px-4 py-2">
            {modelVersion}
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        {sections.map((section, idx) => (
          <motion.div
            key={`${section.title}-${idx}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <MarkdownCard 
              title={section.title}
              content={section.content}
              emoji={section.emoji}
              level={section.level || 2}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default KeywordMarkdownResults; 