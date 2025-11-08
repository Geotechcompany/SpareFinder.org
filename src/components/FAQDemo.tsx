import FAQ1 from "@/components/ui/faq-monochrome";

const FAQDemo = () => {
  const faqs = [
    {
      question: "How accurate is the AI part identification?",
      answer:
        "Our advanced AI models achieve 99.3% accuracy across 50+ industrial categories. Using state-of-the-art computer vision and machine learning, we continuously improve our recognition capabilities with every scan performed.",
      meta: "Accuracy",
    },
    {
      question: "What types of parts can SpareFinder identify?",
      answer:
        "SpareFinder can identify automotive parts, heavy equipment components, aerospace parts, industrial machinery, marine equipment, agricultural machinery, and more. Our database covers over 10 million parts across diverse industrial sectors.",
      meta: "Coverage",
    },
    {
      question: "How long does it take to get results?",
      answer:
        "Most part identifications are completed within seconds. Our AI processes your image in real-time, providing instant results with part names, specifications, compatibility information, and supplier recommendations.",
      meta: "Speed",
    },
    {
      question: "Can I use SpareFinder for my business?",
      answer:
        "Absolutely! We offer enterprise plans specifically designed for businesses. Features include bulk analysis, API access, priority support, team collaboration tools, and custom integrations with your existing systems.",
      meta: "Enterprise",
    },
    {
      question: "Is my data secure with SpareFinder?",
      answer:
        "Yes, we take security seriously. All images and data are encrypted in transit and at rest. We comply with industry standards and never share your proprietary information with third parties. Enterprise plans include additional security features.",
      meta: "Security",
    },
    {
      question: "What if the AI can't identify my part?",
      answer:
        "If our AI can't provide a confident match, our expert support team will manually review your submission. We'll work with you to identify the part and use this feedback to improve our AI models for future recognition.",
      meta: "Support",
    },
  ];

  return (
    <FAQ1
      faqs={faqs}
      title="Find the answers you're looking for"
      subtitle="SpareFinder FAQ"
      description="Everything you need to know about AI-powered part identification and how SpareFinder can transform your operations."
    />
  );
};

export default FAQDemo;



