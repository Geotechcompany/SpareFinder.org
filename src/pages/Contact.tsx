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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-black via-[#0b0b14] to-black p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full"
          >
            <Card className="border-white/10 bg-gradient-to-b from-gray-900/40 to-black/60 text-center">
              <CardContent className="p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
                <p className="text-gray-300 mb-6">
                  Thank you for contacting us. We've received your message and will respond within 24 hours.
                </p>
                <Button
                  onClick={() => setIsSubmitted(false)}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
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
      <div className="min-h-screen bg-gradient-to-b from-black via-[#0b0b14] to-black">
        {/* Header Section */}
        <div className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Get in Touch
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Have questions about Part Finder AI? We're here to help. Send us a message and we'll get back to you as soon as possible.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="lg:col-span-1 space-y-6"
            >
              <Card className="border-white/10 bg-gradient-to-b from-gray-900/40 to-black/60">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Contact Information
                  </CardTitle>
                  <CardDescription className="text-gray-300">
                    Reach out through any of these channels
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-300">
                    <Mail className="w-5 h-5 text-purple-400" />
                    <div>
                      <p className="font-medium text-white">Email</p>
                      <p className="text-sm">sales@tpsinternational.co.uk</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-gray-300">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="font-medium text-white">Response Time</p>
                      <p className="text-sm">Within 24 hours</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-gray-300">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="font-medium text-white">Location</p>
                      <p className="text-sm">United Kingdom</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ/Help Section */}
              <Card className="border-white/10 bg-gradient-to-b from-gray-900/40 to-black/60">
                <CardHeader>
                  <CardTitle className="text-white">Quick Help</CardTitle>
                  <CardDescription className="text-gray-300">
                    Common questions and resources
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <p className="text-white font-medium mb-2">Frequently Asked:</p>
                    <ul className="space-y-1 text-gray-300">
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
              <Card className="border-white/10 bg-gradient-to-b from-gray-900/40 to-black/60">
                <CardHeader>
                  <CardTitle className="text-white">Send us a Message</CardTitle>
                  <CardDescription className="text-gray-300">
                    Fill out the form below and we'll get back to you soon
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Name and Email Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-gray-200">
                          Name *
                        </Label>
                        <Input
                          id="name"
                          type="text"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Your full name"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-200">
                          Email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="your.email@company.com"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                          required
                        />
                      </div>
                    </div>

                    {/* Company and Inquiry Type Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company" className="text-gray-200">
                          Company
                        </Label>
                        <Input
                          id="company"
                          type="text"
                          value={formData.company}
                          onChange={(e) => handleInputChange('company', e.target.value)}
                          placeholder="Your company name"
                          className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inquiryType" className="text-gray-200">
                          Inquiry Type
                        </Label>
                        <select
                          id="inquiryType"
                          value={formData.inquiryType}
                          onChange={(e) => handleInputChange('inquiryType', e.target.value)}
                          className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:ring-purple-500/20"
                        >
                          {inquiryTypes.map((type) => (
                            <option key={type.value} value={type.value} className="bg-gray-900">
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Subject */}
                    <div className="space-y-2">
                      <Label htmlFor="subject" className="text-gray-200">
                        Subject
                      </Label>
                      <Input
                        id="subject"
                        type="text"
                        value={formData.subject}
                        onChange={(e) => handleInputChange('subject', e.target.value)}
                        placeholder="Brief description of your inquiry"
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-2">
                      <Label htmlFor="message" className="text-gray-200">
                        Message *
                      </Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) => handleInputChange('message', e.target.value)}
                        placeholder="Please provide details about your inquiry..."
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-purple-500/50 focus:ring-purple-500/20 min-h-[120px]"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-none shadow-lg shadow-purple-500/25 transition-all duration-200 hover:shadow-purple-500/40 h-12"
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

                    <p className="text-xs text-gray-400 text-center">
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