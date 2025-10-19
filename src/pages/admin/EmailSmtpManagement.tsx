import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import AdminDesktopSidebar from "@/components/AdminDesktopSidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { adminApi } from "@/lib/api";
import {
  Mail,
  Server,
  Lock,
  TestTube2,
  Shield,
  CheckCircle,
  AlertTriangle,
  Settings,
  Eye,
  EyeOff,
  Send,
  Zap,
  Clock,
  Globe,
  Loader2,
  Edit,
  Plus,
  Trash2,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

const EmailSmtpManagement = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    name: "",
    subject: "",
    html_content: "",
    text_content: "",
    status: "draft",
    description: "",
    variables: [] as string[],
  });
  const [templateSaving, setTemplateSaving] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);

  const handleToggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const [smtpConfig, setSmtpConfig] = useState({
    host: "smtp.gmail.com",
    port: 587,
    username: "noreply.tpsinternational@gmail.com",
    password: "",
    encryption: "TLS",
    fromName: "SpareFinder",
    fromEmail: "noreply.tpsinternational@gmail.com",
  });

  const [emailTemplates, setEmailTemplates] = useState<
    Array<{
      id: number;
      name: string;
      subject: string;
      status: string;
      description?: string;
      html_content?: string;
      text_content?: string;
      variables?: string[];
    }>
  >([]);

  // Fetch email templates from database
  useEffect(() => {
    const fetchEmailTemplates = async () => {
      try {
        const response = await adminApi.getEmailTemplates();

        if (response.success && response.templates) {
          setEmailTemplates(
            response.templates.map((template: any) => ({
              id: template.id,
              name: template.name,
              subject: template.subject,
              status: template.status,
              description: template.description,
              html_content: template.html_content,
              text_content: template.text_content,
              variables: template.variables,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to fetch email templates:", err);
      }
    };

    fetchEmailTemplates();
  }, []);

  // Fetch SMTP settings from database
  useEffect(() => {
    const fetchSmtpSettings = async () => {
      try {
        setLoading(true);
        const response = await adminApi.getSmtpSettings();

        if (response.success && (response as any).data?.settings?.email) {
          const emailSettings = (response as any).data.settings.email;
          setSmtpConfig((prev) => ({
            ...prev,
            host: emailSettings.smtp_host || prev.host,
            port: parseInt(emailSettings.smtp_port) || prev.port,
            username: emailSettings.smtp_user || prev.username,
            password: emailSettings.smtp_password || "",
            encryption: emailSettings.smtp_secure === "true" ? "SSL" : "TLS",
            fromName: emailSettings.smtp_from_name || prev.fromName,
            fromEmail: emailSettings.smtp_user || prev.fromEmail,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch SMTP settings:", err);
        setError("Failed to load SMTP settings");
      } finally {
        setLoading(false);
      }
    };

    fetchSmtpSettings();
  }, []);

  const smtpProviders = [
    { name: "Gmail", host: "smtp.gmail.com", port: 587, icon: "📧" },
    { name: "Outlook", host: "smtp-mail.outlook.com", port: 587, icon: "📨" },
    { name: "SendGrid", host: "smtp.sendgrid.net", port: 587, icon: "🚀" },
    { name: "Mailgun", host: "smtp.mailgun.org", port: 587, icon: "💌" },
  ];

  const handleTestConnection = async () => {
    try {
      setTestResult("testing");
      setError(null);

      const response = await adminApi.testSmtpConnection(smtpConfig);

      if (response.success) {
        setTestResult("success");
      } else {
        setTestResult("error");
        setError(response.message || "Test failed");
      }
    } catch (err) {
      console.error("SMTP test error:", err);
      setTestResult("error");
      setError("Failed to test SMTP connection");
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await adminApi.saveSmtpSettings(smtpConfig);

      if (response.success) {
        // Show success message or toast
        console.log("SMTP settings saved successfully");
      } else {
        setError(response.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setError("Failed to save SMTP settings");
    } finally {
      setSaving(false);
    }
  };

  const handleProviderSelect = (provider: (typeof smtpProviders)[0]) => {
    setSmtpConfig((prev) => ({
      ...prev,
      host: provider.host,
      port: provider.port,
    }));
  };

  const handleManageTemplates = () => {
    setShowTemplateModal(true);
    setIsEditingTemplate(false);
    setIsCreatingTemplate(false);
    setSelectedTemplate(null);
    resetTemplateForm();
  };

  const handleEditTemplate = (template: any) => {
    setSelectedTemplate(template);
    setIsEditingTemplate(true);
    setIsCreatingTemplate(false);
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      html_content: template.html_content || "",
      text_content: template.text_content || "",
      status: template.status,
      description: template.description || "",
      variables: template.variables || [],
    });
    setShowTemplateModal(true);
  };

  const handleCreateTemplate = () => {
    setSelectedTemplate(null);
    setIsEditingTemplate(false);
    setIsCreatingTemplate(true);
    resetTemplateForm();
    setShowTemplateModal(true);
  };

  const handleDeleteTemplate = async (template: any) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      setTemplateLoading(true);
      const response = await adminApi.deleteEmailTemplate(template.id);

      if (response.success) {
        // Refresh templates list
        const templatesResponse = await adminApi.getEmailTemplates();
        if (templatesResponse.success && (templatesResponse as any).templates) {
          setEmailTemplates(
            (templatesResponse as any).templates.map((t: any) => ({
              id: t.id,
              name: t.name,
              subject: t.subject,
              status: t.status,
              description: t.description,
              html_content: t.html_content,
              text_content: t.text_content,
              variables: t.variables,
            }))
          );
        }
        alert("Template deleted successfully!");
      } else {
        alert(
          "Failed to delete template: " + (response.message || "Unknown error")
        );
      }
    } catch (err) {
      console.error("Delete template error:", err);
      alert("Failed to delete template");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleToggleTemplateStatus = async (template: any) => {
    try {
      setTemplateLoading(true);
      const newStatus = template.status === "active" ? "inactive" : "active";

      const response = await adminApi.updateEmailTemplate(template.id, {
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content,
        status: newStatus,
        description: template.description,
        variables: template.variables,
      });

      if (response.success) {
        // Refresh templates list
        const templatesResponse = await adminApi.getEmailTemplates();
        if (templatesResponse.success && (templatesResponse as any).templates) {
          setEmailTemplates(
            (templatesResponse as any).templates.map((t: any) => ({
              id: t.id,
              name: t.name,
              subject: t.subject,
              status: t.status,
              description: t.description,
              html_content: t.html_content,
              text_content: t.text_content,
              variables: t.variables,
            }))
          );
        }
      } else {
        alert(
          "Failed to update template status: " +
            (response.message || "Unknown error")
        );
      }
    } catch (err) {
      console.error("Toggle template status error:", err);
      alert("Failed to update template status");
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.subject) {
      setTemplateError("Name and subject are required");
      return;
    }

    try {
      setTemplateSaving(true);
      setTemplateError(null);

      let response;
      if (isCreatingTemplate) {
        response = await adminApi.createEmailTemplate(templateForm);
      } else if (isEditingTemplate && selectedTemplate) {
        response = await adminApi.updateEmailTemplate(
          selectedTemplate.id,
          templateForm
        );
      }

      if (response?.success) {
        // Refresh templates list
        const templatesResponse = await adminApi.getEmailTemplates();
        if (templatesResponse.success && (templatesResponse as any).templates) {
          setEmailTemplates(
            (templatesResponse as any).templates.map((t: any) => ({
              id: t.id,
              name: t.name,
              subject: t.subject,
              status: t.status,
              description: t.description,
              html_content: t.html_content,
              text_content: t.text_content,
              variables: t.variables,
            }))
          );
        }

        setShowTemplateModal(false);
        resetTemplateForm();
        alert(
          isCreatingTemplate
            ? "Template created successfully!"
            : "Template updated successfully!"
        );
      } else {
        setTemplateError(response?.message || "Failed to save template");
      }
    } catch (err) {
      console.error("Save template error:", err);
      setTemplateError("Failed to save template");
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleTestTemplate = async (template: any) => {
    try {
      setTemplateLoading(true);
      const testEmail = prompt("Enter test email address:");
      if (!testEmail) return;

      const response = await adminApi.testEmailTemplate(template.id, {
        test_email: testEmail,
        variables: {
          user_name: "Test User",
          dashboard_url: "https://app.sparefinder.org",
          reset_url: "https://app.sparefinder.org/reset",
          expiry_hours: "24",
        },
      });

      if (response.success) {
        alert("Test email sent successfully!");
      } else {
        alert(
          "Failed to send test email: " + (response.message || "Unknown error")
        );
      }
    } catch (err) {
      console.error("Test template error:", err);
      alert("Failed to send test email");
    } finally {
      setTemplateLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      subject: "",
      html_content: "",
      text_content: "",
      status: "draft",
      description: "",
      variables: [],
    });
    setTemplateError(null);
  };

  const addVariable = () => {
    const variable = prompt("Enter variable name (without {{}}):");
    if (variable && !templateForm.variables.includes(variable)) {
      setTemplateForm((prev) => ({
        ...prev,
        variables: [...prev.variables, variable],
      }));
    }
  };

  const removeVariable = (variable: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v !== variable),
    }));
  };

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -right-40 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl opacity-60"
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl opacity-40"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, 50, 0],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <AdminDesktopSidebar
        isCollapsed={isCollapsed}
        onToggle={handleToggleSidebar}
      />

      <motion.div
        initial={false}
        animate={{ marginLeft: isCollapsed ? 80 : 320 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="flex-1 p-4 lg:p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6 lg:space-y-8 max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-3xl blur-xl opacity-60" />
            <div className="relative bg-black/20 backdrop-blur-xl rounded-3xl p-6 border border-white/10">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-full border border-blue-500/30 backdrop-blur-xl mb-4"
                  >
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="mr-2"
                    >
                      <Mail className="w-4 h-4 text-blue-400" />
                    </motion.div>
                    <span className="text-blue-300 text-sm font-semibold">
                      Email Configuration
                    </span>
                  </motion.div>
                  <motion.h1
                    className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent mb-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Email SMTP Management
                  </motion.h1>
                  <motion.p
                    className="text-gray-400 text-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    Configure email server settings and templates
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center space-x-3"
                >
                  <Badge className="bg-green-600/20 text-green-300 border-green-500/30 px-3 py-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    SMTP Active
                  </Badge>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* SMTP Configuration */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Quick Setup */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-pink-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-purple-400" />
                      <span>Quick Setup</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Choose a provider for automatic configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {smtpProviders.map((provider, index) => (
                        <motion.button
                          key={provider.name}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 + index * 0.1 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleProviderSelect(provider)}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 text-left"
                        >
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{provider.icon}</span>
                            <div>
                              <div className="font-medium text-white">
                                {provider.name}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {provider.host}
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* SMTP Server Settings */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5 rounded-3xl blur-xl opacity-60" />
                <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center space-x-2">
                      <Server className="w-5 h-5 text-blue-400" />
                      <span>SMTP Server Configuration</span>
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Configure your email server settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 rounded-lg bg-red-600/20 border border-red-500/30"
                      >
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <span className="text-red-300 text-sm">{error}</span>
                        </div>
                      </motion.div>
                    )}

                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                        <span className="ml-2 text-gray-400">
                          Loading SMTP settings...
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label
                            htmlFor="host"
                            className="text-gray-200 font-medium"
                          >
                            SMTP Host
                          </Label>
                          <Input
                            id="host"
                            value={smtpConfig.host}
                            onChange={(e) =>
                              setSmtpConfig((prev) => ({
                                ...prev,
                                host: e.target.value,
                              }))
                            }
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 rounded-xl"
                            placeholder="smtp.example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="port"
                            className="text-gray-200 font-medium"
                          >
                            SMTP Port
                          </Label>
                          <Input
                            id="port"
                            type="number"
                            value={smtpConfig.port}
                            onChange={(e) =>
                              setSmtpConfig((prev) => ({
                                ...prev,
                                port: parseInt(e.target.value),
                              }))
                            }
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 rounded-xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="username"
                            className="text-gray-200 font-medium"
                          >
                            Username
                          </Label>
                          <Input
                            id="username"
                            value={smtpConfig.username}
                            onChange={(e) =>
                              setSmtpConfig((prev) => ({
                                ...prev,
                                username: e.target.value,
                              }))
                            }
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 rounded-xl"
                            placeholder="your-email@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="password"
                            className="text-gray-200 font-medium"
                          >
                            Password
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? "text" : "password"}
                              value={smtpConfig.password}
                              onChange={(e) =>
                                setSmtpConfig((prev) => ({
                                  ...prev,
                                  password: e.target.value,
                                }))
                              }
                              className="h-12 pr-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 rounded-xl"
                              placeholder="Your password or app key"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="encryption"
                            className="text-gray-200 font-medium"
                          >
                            Encryption
                          </Label>
                          <Select
                            value={smtpConfig.encryption}
                            onValueChange={(value) =>
                              setSmtpConfig((prev) => ({
                                ...prev,
                                encryption: value,
                              }))
                            }
                          >
                            <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TLS">TLS</SelectItem>
                              <SelectItem value="SSL">SSL</SelectItem>
                              <SelectItem value="None">None</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label
                            htmlFor="fromName"
                            className="text-gray-200 font-medium"
                          >
                            From Name
                          </Label>
                          <Input
                            id="fromName"
                            value={smtpConfig.fromName}
                            onChange={(e) =>
                              setSmtpConfig((prev) => ({
                                ...prev,
                                fromName: e.target.value,
                              }))
                            }
                            className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 rounded-xl"
                            placeholder="Your Company Name"
                          />
                        </div>
                      </div>
                    )}

                    {/* Test Connection */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium text-white">
                            Test Configuration
                          </h3>
                          <p className="text-gray-400 text-sm">
                            Send a test email to verify settings
                          </p>
                        </div>
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button
                            onClick={handleTestConnection}
                            disabled={testResult === "testing"}
                            className="bg-purple-600 hover:bg-purple-700 rounded-xl"
                          >
                            {testResult === "testing" ? (
                              <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <TestTube2 className="w-4 h-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </Button>
                        </motion.div>
                      </div>

                      {testResult !== "idle" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-3 rounded-lg ${
                            testResult === "success"
                              ? "bg-green-600/20 border border-green-500/30"
                              : testResult === "error"
                              ? "bg-red-600/20 border border-red-500/30"
                              : "bg-purple-600/20 border border-purple-500/30"
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {testResult === "success" ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : testResult === "error" ? (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            ) : (
                              <Clock className="w-4 h-4 text-purple-400 animate-spin" />
                            )}
                            <span
                              className={`text-sm ${
                                testResult === "success"
                                  ? "text-green-300"
                                  : testResult === "error"
                                  ? "text-red-300"
                                  : "text-purple-300"
                              }`}
                            >
                              {testResult === "success" &&
                                "Test email sent successfully!"}
                              {testResult === "error" &&
                                "Failed to send test email. Check your settings."}
                              {testResult === "testing" &&
                                "Sending test email..."}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end space-x-3">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          variant="outline"
                          className="border-white/10 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl"
                        >
                          Reset
                        </Button>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          onClick={handleSaveSettings}
                          disabled={saving}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 rounded-xl"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-2" />
                              Save Configuration
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Email Templates */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/5 to-emerald-600/5 rounded-3xl blur-xl opacity-60" />
              <Card className="relative bg-black/20 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Send className="w-5 h-5 text-green-400" />
                    <span>Email Templates</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Manage email templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {emailTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8 + index * 0.1 }}
                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                              <Mail className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-white">
                                {template.name}
                              </div>
                              <div className="text-gray-400 text-sm mt-1">
                                {template.subject}
                              </div>
                              {template.description && (
                                <div className="text-gray-500 text-xs mt-1">
                                  {template.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                handleToggleTemplateStatus(template)
                              }
                              disabled={templateLoading}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              title={`${
                                template.status === "active"
                                  ? "Deactivate"
                                  : "Activate"
                              } template`}
                            >
                              {template.status === "active" ? (
                                <ToggleRight className="h-3 w-3 text-green-400" />
                              ) : (
                                <ToggleLeft className="h-3 w-3 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditTemplate(template)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              title="Edit template"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTestTemplate(template)}
                              disabled={templateLoading}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              title="Test template"
                            >
                              {templateLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <TestTube2 className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteTemplate(template)}
                              disabled={templateLoading}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                              title="Delete template"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        onClick={handleManageTemplates}
                        className="w-full border-white/10 text-gray-300 hover:bg-white/10 hover:text-white rounded-xl"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Manage Templates
                      </Button>
                    </motion.div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant="outline"
                        onClick={handleCreateTemplate}
                        className="w-full border-blue-500/30 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200 rounded-xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Template
                      </Button>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Template Management Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {isCreatingTemplate
                    ? "Create New Template"
                    : isEditingTemplate
                    ? "Edit Template"
                    : "Template Management"}
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {isCreatingTemplate
                    ? "Create a new email template"
                    : isEditingTemplate
                    ? "Edit email template"
                    : "Manage your email templates"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTemplateModal(false);
                  resetTemplateForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isCreatingTemplate || isEditingTemplate ? (
                <div className="space-y-6">
                  {templateError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-sm">{templateError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="template-name"
                        className="text-gray-200 font-medium"
                      >
                        Template Name *
                      </Label>
                      <Input
                        id="template-name"
                        value={templateForm.name}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50"
                        placeholder="e.g., Welcome Email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="template-status"
                        className="text-gray-200 font-medium"
                      >
                        Status
                      </Label>
                      <Select
                        value={templateForm.status}
                        onValueChange={(value) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            status: value,
                          }))
                        }
                      >
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="template-subject"
                      className="text-gray-200 font-medium"
                    >
                      Email Subject *
                    </Label>
                    <Input
                      id="template-subject"
                      value={templateForm.subject}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50"
                      placeholder="e.g., Welcome to SpareFinder!"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="template-description"
                      className="text-gray-200 font-medium"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="template-description"
                      value={templateForm.description}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50"
                      placeholder="Brief description of this template"
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="template-html"
                      className="text-gray-200 font-medium"
                    >
                      HTML Content
                    </Label>
                    <Textarea
                      id="template-html"
                      value={templateForm.html_content}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          html_content: e.target.value,
                        }))
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 font-mono text-sm"
                      placeholder="<html><body><h1>Hello {{user_name}}!</h1></body></html>"
                      rows={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="template-text"
                      className="text-gray-200 font-medium"
                    >
                      Text Content
                    </Label>
                    <Textarea
                      id="template-text"
                      value={templateForm.text_content}
                      onChange={(e) =>
                        setTemplateForm((prev) => ({
                          ...prev,
                          text_content: e.target.value,
                        }))
                      }
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50 font-mono text-sm"
                      placeholder="Hello {{user_name}}! Welcome to SpareFinder."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-gray-200 font-medium">
                        Template Variables
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addVariable}
                        className="text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Variable
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {templateForm.variables.map((variable, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2"
                        >
                          <Input
                            value={variable}
                            onChange={(e) => {
                              const newVariables = [...templateForm.variables];
                              newVariables[index] = e.target.value;
                              setTemplateForm((prev) => ({
                                ...prev,
                                variables: newVariables,
                              }));
                            }}
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-blue-400/50"
                            placeholder="variable_name"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeVariable(variable)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                      {templateForm.variables.length === 0 && (
                        <p className="text-gray-500 text-sm">
                          No variables added. Use {`{{variable_name}}`} in your
                          content.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowTemplateModal(false);
                        resetTemplateForm();
                      }}
                      className="border-white/10 text-gray-300 hover:bg-white/10"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveTemplate}
                      disabled={templateSaving}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {templateSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          {isCreatingTemplate
                            ? "Create Template"
                            : "Save Changes"}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">
                      Template Management
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Use the buttons above to create, edit, test, or manage
                      your email templates.
                    </p>
                    <div className="flex justify-center space-x-3">
                      <Button
                        onClick={handleCreateTemplate}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Template
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default EmailSmtpManagement;
