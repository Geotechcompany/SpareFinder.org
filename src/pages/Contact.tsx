import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  MessageSquare, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  subject: string;
  message: string;
  inquiryType: 'support' | 'sales' | 'billing' | 'technical' | 'general';
}

const Contact: React.FC = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    company: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await api.contact.submitForm(formData);
      
      if (response.success) {
        setIsSubmitted(true);
        toast.success('Message sent successfully! We\'ll get back to you soon.');
        
        // Reset form after successful submission
        setFormData({
          name: '',
          email: '',
          company: '',
          subject: '',
          message: '',
          inquiryType: 'general'
        });
      } else {
        toast.error(response.message || 'Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Contact form error:', error);
      toast.error('Failed to send message. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'sales', label: 'Sales & Pricing' },
    { value: 'billing', label: 'Billing Support' },
    { value: 'technical', label: 'Technical Issues' }
  ];

  if (isSubmitted) {
    return (
      <>
        <Header />
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] p-6 dark:from-black dark:via-[#0b0b14] dark:to-black">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md"
          >
            <Card className="border border-border bg-card/95 text-center shadow-soft-elevated dark:border-white/10 dark:bg-gradient-to-b dark:from-gray-900/40 dark:to-black/60">
              <CardContent className="p-8">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15">
                  <CheckCircle className="h-8 w-8 text-emerald-500" />
                </div>
                <h2 className="mb-2 text-2xl font-bold text-foreground dark:text-white">
                  Message Sent!
                </h2>
                <p className="mb-6 text-sm text-muted-foreground dark:text-gray-300">
                  Thank you for contacting us. We've received your message and will respond within 24 hours.
                </p>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] text-white shadow-[0_14px_35px_rgba(15,23,42,0.35)] hover:from-[#324EDC] hover:via-[#3A5AFE] hover:to-[#0891B2] dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700"
                >
                  Send Another Message
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gradient-to-b from-background via-[#F0F2F5] to-[#E8EBF1] text-foreground dark:from-black dark:via-[#0b0b14] dark:to-black dark:text-white">
        {/* Header Section */}
        <div className="px-6 pt-20 pb-12">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="mb-4 text-4xl font-bold text-foreground md:text-5xl dark:text-white">
                Get in Touch
              </h1>
              <p className="mx-auto max-w-2xl text-xl text-muted-foreground dark:text-gray-300">
                Have questions about Part Finder AI? We're here to help. Send us a message and we'll get back to you as soon as possible.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-6 pb-20">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6 lg:col-span-1"
            >
              <Card className="border border-border bg-card/95 shadow-soft-elevated dark:border-white/10 dark:bg-gradient-to-b dark:from-gray-900/40 dark:to-black/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                    <MessageSquare className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-300">
                    Reach out through any of these channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-muted-foreground dark:text-gray-300">
                    <Mail className="h-5 w-5 text-primary dark:text-purple-400" />
                    <div>
                      <p className="font-medium text-foreground dark:text-white">
                        Email
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        tps@tpsinternational.co.uk
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        sales@tpsinternational.co.uk
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-muted-foreground dark:text-gray-300">
                    <Phone className="h-5 w-5 text-[#06B6D4] dark:text-blue-300" />
                    <div>
                      <p className="font-medium text-foreground dark:text-white">
                        Call Us
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        +44 1916499741
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        +44 7415892946
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-muted-foreground dark:text-gray-300">
                    <Clock className="h-5 w-5 text-[#3A5AFE] dark:text-blue-400" />
                    <div>
                      <p className="font-medium text-foreground dark:text-white">
                        Response Time
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Within 24 hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground dark:text-gray-300">
                    <MapPin className="h-5 w-5 text-emerald-500 dark:text-emerald-400" />
                    <div>
                      <p className="font-medium text-foreground dark:text-white">
                        Location
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Durham Workspace – Abbey Road
                      </p>
                      <p className="text-sm text-muted-foreground dark:text-gray-300">
                        Durham DH1 5JZ, UK
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ/Help Section */}
              <Card className="border border-border bg-card/95 shadow-soft-elevated dark:border-white/10 dark:bg-gradient-to-b dark:from-gray-900/40 dark:to-black/60">
                <CardHeader>
                  <CardTitle className="text-foreground dark:text-white">
                    Quick Help
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-300">
                    Common questions and resources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="mb-2 font-medium text-foreground dark:text-white">
                      Frequently Asked:
                    </p>
                    <ul className="space-y-1 text-muted-foreground dark:text-gray-300">
                      <li>• How to upload part images</li>
                      <li>• Subscription pricing plans</li>
                      <li>• API integration support</li>
                      <li>• Account management</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:col-span-2"
            >
              <Card className="border border-border bg-card/95 shadow-soft-elevated dark:border-white/10 dark:bg-gradient-to-b dark:from-gray-900/40 dark:to-black/60">
                <CardHeader>
                  <CardTitle className="text-foreground dark:text-white">
                    Send us a Message
                  </CardTitle>
                  <CardDescription className="text-muted-foreground dark:text-gray-300">
                    Fill out the form below and we'll get back to you soon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name and Email Row */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-foreground dark:text-gray-200">
                          Name *
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Your full name"
                          className="border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-foreground dark:text-gray-200">
                          Email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="your.email@company.com"
                          className="border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                          required
                        />
                      </div>
                    </div>

                    {/* Company and Inquiry Type Row */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-sm font-medium text-foreground dark:text-gray-200">
                          Company
                        </Label>
                        <Input
                          id="company"
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          placeholder="Your company name"
                          className="border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inquiryType" className="text-sm font-medium text-foreground dark:text-gray-200">
                          Inquiry Type
                        </Label>
                        <select
                          id="inquiryType"
                          value={formData.inquiryType}
                          onChange={(e) => handleInputChange('inquiryType', e.target.value)}
                          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-primary/60 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white"
                        >
                          {inquiryTypes.map((type) => (
                            <option
                              key={type.value}
                              value={type.value}
                              className="bg-background text-foreground dark:bg-gray-900 dark:text-white"
                            >
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-sm font-medium text-foreground dark:text-gray-200">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        placeholder="Brief description of your inquiry"
                        className="border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-sm font-medium text-foreground dark:text-gray-200">
                        Message *
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Please provide details about your inquiry..."
                        className="min-h-[120px] border border-border bg-card text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:ring-primary/20 dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-gray-400"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="h-12 w-full border-none bg-gradient-to-r from-[#3A5AFE] via-[#4C5DFF] to-[#06B6D4] text-white shadow-[0_16px_40px_rgba(15,23,42,0.35)] transition-all duration-200 hover:from-[#324EDC] hover:via-[#3A5AFE] hover:to-[#0891B2] hover:shadow-purple-500/40 disabled:opacity-70 dark:from-purple-600 dark:to-blue-600 dark:hover:from-purple-700 dark:hover:to-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending Message...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground dark:text-gray-400">
                      We typically respond within 24 hours during business days
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Contact;