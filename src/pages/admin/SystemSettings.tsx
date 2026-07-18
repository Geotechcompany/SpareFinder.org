import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AdminPageHeader, AdminPageHeaderToolbar } from '@/components/admin/AdminPageHeader';
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { adminApi } from '@/lib/api';
import {
  Shield,
  Mail,
  Bell,
  Server,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SystemSettings {
  security: {
    passwordMinLength: number;
    requireSpecialChars: boolean;
    sessionTimeout: number;
    twoFactorRequired: boolean;
  };
  email: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpSecure: boolean;
  };
  notifications: {
    emailEnabled: boolean;
    slackEnabled: boolean;
    webhookUrl: string;
  };
  system: {
    maintenanceMode: boolean;
    debugMode: boolean;
    logLevel: string;
    backupEnabled: boolean;
  };
}

const SystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [gmailRedirectUri, setGmailRedirectUri] = useState('');
  const [gmailDefaultRedirect, setGmailDefaultRedirect] = useState('');
  const [gmailHasSecret, setGmailHasSecret] = useState(false);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [gmailSource, setGmailSource] = useState<string>('none');
  const [gmailMessage, setGmailMessage] = useState<string | null>(null);
  const [gmailLoading, setGmailLoading] = useState(true);
  const [gmailSaving, setGmailSaving] = useState(false);
  const [gmailShowSecret, setGmailShowSecret] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchSystemSettings();
    fetchGmailOauthSettings();
  }, []);

  const fetchGmailOauthSettings = async () => {
    try {
      setGmailLoading(true);
      setGmailError(null);
      const response = await adminApi.getGmailOauthSettings();
      const d = (response as any)?.data ?? response;
      setGmailClientId(String(d?.client_id || ''));
      setGmailRedirectUri(String(d?.redirect_uri || d?.default_redirect_uri || ''));
      setGmailDefaultRedirect(String(d?.default_redirect_uri || ''));
      setGmailHasSecret(Boolean(d?.has_client_secret || d?.client_secret_set));
      setGmailConfigured(Boolean(d?.configured));
      setGmailSource(String(d?.source || 'none'));
      setGmailMessage(typeof d?.message === 'string' ? d.message : null);
      setGmailClientSecret('');
    } catch (err) {
      console.error('Error fetching Gmail OAuth settings:', err);
      setGmailError(err instanceof Error ? err.message : 'Failed to load Gmail OAuth settings');
    } finally {
      setGmailLoading(false);
    }
  };

  const saveGmailOauthSettings = async () => {
    const clientId = gmailClientId.trim();
    const redirectUri = gmailRedirectUri.trim() || gmailDefaultRedirect.trim();
    if (!clientId) {
      setGmailError('Client ID is required.');
      return;
    }
    if (!gmailHasSecret && !gmailClientSecret.trim()) {
      setGmailError('Client Secret is required on first save.');
      return;
    }

    try {
      setGmailSaving(true);
      setGmailError(null);
      const payload: { client_id: string; redirect_uri: string; client_secret?: string } = {
        client_id: clientId,
        redirect_uri: redirectUri,
      };
      if (gmailClientSecret.trim()) {
        payload.client_secret = gmailClientSecret.trim();
      }
      const response = await adminApi.saveGmailOauthSettings(payload);
      if ((response as any)?.success === false) {
        throw new Error((response as any)?.message || 'Failed to save Gmail OAuth settings');
      }
      const d = (response as any)?.data ?? response;
      setGmailClientId(String(d?.client_id || clientId));
      setGmailRedirectUri(String(d?.redirect_uri || redirectUri));
      setGmailDefaultRedirect(String(d?.default_redirect_uri || gmailDefaultRedirect));
      setGmailHasSecret(Boolean(d?.has_client_secret || d?.client_secret_set || gmailHasSecret || Boolean(payload.client_secret)));
      setGmailConfigured(Boolean(d?.configured));
      setGmailSource(String(d?.source || 'settings'));
      setGmailMessage(null);
      setGmailClientSecret('');
      toast({
        title: 'Gmail OAuth saved',
        description: 'Google credentials are stored server-side. Connect Gmail from Email campaigns → Gmail leads.',
      });
    } catch (err) {
      console.error('Error saving Gmail OAuth settings:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save Gmail OAuth settings';
      setGmailError(msg);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: msg,
      });
    } finally {
      setGmailSaving(false);
    }
  };

  const fetchSystemSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Legacy mock block for non-Gmail cards (not wired to API yet).
      await new Promise(resolve => setTimeout(resolve, 400));

      setSettings({
        security: {
          passwordMinLength: 8,
          requireSpecialChars: true,
          sessionTimeout: 3600,
          twoFactorRequired: false,
        },
        email: {
          smtpHost: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUser: 'admin@geotech.com',
          smtpSecure: true,
        },
        notifications: {
          emailEnabled: true,
          slackEnabled: false,
          webhookUrl: '',
        },
        system: {
          maintenanceMode: false,
          debugMode: false,
          logLevel: 'info',
          backupEnabled: true,
        },
      });
    } catch (err) {
      console.error('Error fetching system settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch system settings');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load system settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    try {
      setIsSaving(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      toast({
        title: "Settings saved",
        description: "System settings have been updated successfully.",
      });
    } catch (err) {
      console.error('Error saving settings:', err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (category: keyof SystemSettings, key: string, value: any) => {
    if (!settings) return;

    setSettings(prev => ({
      ...prev!,
      [category]: {
        ...prev![category],
        [key]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <AdminPageContent>
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminPageContent>
    );
  }

  return (
    <AdminPageContent>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto"
      >
        <AdminPageHeader
          breadcrumbPage="Settings"
          title="System settings"
          description="Security, email, notifications, and platform configuration."
          actions={
            <AdminPageHeaderToolbar>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={saveSettings}
                  disabled={isSaving || !settings}
                  className="rounded-xl bg-gradient-to-r from-brand-dark to-brand text-white shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-brand-dark"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Settings
                    </>
                  )}
                </Button>
              </motion.div>
            </AdminPageHeaderToolbar>
          }
        />

        {error && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="flex items-center gap-3 p-4 text-red-600 dark:text-red-300">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <p className="text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Gmail OAuth (inbound leads)
            </CardTitle>
            <CardDescription>
              Google Cloud OAuth credentials for Admin → Email campaigns → Gmail leads.
              The client secret is stored server-side and never returned after save.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {gmailLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading Gmail OAuth settings…
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {gmailConfigured ? (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not configured</Badge>
                  )}
                  {gmailHasSecret ? (
                    <Badge variant="outline">Client secret saved</Badge>
                  ) : null}
                  {gmailSource && gmailSource !== 'none' ? (
                    <Badge variant="outline">Source: {gmailSource}</Badge>
                  ) : null}
                </div>

                {!gmailConfigured && (gmailMessage || gmailError) ? (
                  <p className="text-sm text-amber-700 dark:text-amber-400 flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {gmailError || gmailMessage}
                  </p>
                ) : null}

                {gmailError && gmailConfigured ? (
                  <p className="text-sm text-destructive flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    {gmailError}
                  </p>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="gmail-client-id">Client ID</Label>
                  <Input
                    id="gmail-client-id"
                    value={gmailClientId}
                    onChange={(e) => setGmailClientId(e.target.value)}
                    placeholder="xxxx.apps.googleusercontent.com"
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmail-client-secret">Client Secret</Label>
                  <div className="flex gap-2">
                    <Input
                      id="gmail-client-secret"
                      type={gmailShowSecret ? 'text' : 'password'}
                      value={gmailClientSecret}
                      onChange={(e) => setGmailClientSecret(e.target.value)}
                      placeholder={
                        gmailHasSecret
                          ? 'Leave blank to keep the saved secret'
                          : 'Enter Google client secret'
                      }
                      autoComplete="new-password"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setGmailShowSecret((v) => !v)}
                      aria-label={gmailShowSecret ? 'Hide secret' : 'Show secret'}
                    >
                      {gmailShowSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {gmailHasSecret
                      ? 'A secret is already stored. Enter a new value only when rotating credentials.'
                      : 'Required once. After save, the secret is not shown again.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gmail-redirect-uri">Redirect URI</Label>
                  <Input
                    id="gmail-redirect-uri"
                    value={gmailRedirectUri}
                    onChange={(e) => setGmailRedirectUri(e.target.value)}
                    placeholder={gmailDefaultRedirect || 'https://sparefinder.org/api/admin/marketing/gmail/callback'}
                    autoComplete="off"
                  />
                  <p className="text-xs text-muted-foreground">
                    Must match an Authorized redirect URI in Google Cloud Console.
                    {gmailDefaultRedirect ? (
                      <>
                        {' '}
                        Suggested:{' '}
                        <button
                          type="button"
                          className="underline underline-offset-2"
                          onClick={() => setGmailRedirectUri(gmailDefaultRedirect)}
                        >
                          {gmailDefaultRedirect}
                        </button>
                      </>
                    ) : null}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button onClick={saveGmailOauthSettings} disabled={gmailSaving}>
                    {gmailSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Gmail OAuth
                      </>
                    )}
                  </Button>
                  <Button variant="secondary" asChild>
                    <Link to="/admin/marketing-outbound?tab=gmail">Open Gmail leads</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {settings && (
          <motion.div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>Password and session policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="space-y-2">
                  <Label htmlFor="password-min-length">Minimum password length</Label>
                  <Input
                    id="password-min-length"
                    type="number"
                    value={settings.security.passwordMinLength}
                    onChange={(e) =>
                      updateSetting('security', 'passwordMinLength', Number(e.target.value))
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="require-special-chars">Require special characters</Label>
                  <Switch
                    id="require-special-chars"
                    checked={settings.security.requireSpecialChars}
                    onCheckedChange={(checked) =>
                      updateSetting('security', 'requireSpecialChars', checked)
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="two-factor-required">Require two-factor auth</Label>
                  <Switch
                    id="two-factor-required"
                    checked={settings.security.twoFactorRequired}
                    onCheckedChange={(checked) =>
                      updateSetting('security', 'twoFactorRequired', checked)
                    }
                  />
                </motion.div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email
                </CardTitle>
                <CardDescription>SMTP connection settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP host</Label>
                  <Input
                    id="smtp-host"
                    value={settings.email.smtpHost}
                    onChange={(e) => updateSetting('email', 'smtpHost', e.target.value)}
                  />
                </motion.div>
                <motion.div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={settings.email.smtpPort}
                    onChange={(e) => updateSetting('email', 'smtpPort', Number(e.target.value))}
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="smtp-secure">Use TLS/SSL</Label>
                  <Switch
                    id="smtp-secure"
                    checked={settings.email.smtpSecure}
                    onCheckedChange={(checked) => updateSetting('email', 'smtpSecure', checked)}
                  />
                </motion.div>
                <p className="text-xs text-muted-foreground">
                  For live SMTP credentials, use{' '}
                  <Link to="/admin/email-smtp" className="underline underline-offset-2">
                    Outgoing email
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email notifications</Label>
                  <Switch
                    id="email-notifications"
                    checked={settings.notifications.emailEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'emailEnabled', checked)
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="slack-notifications">Slack notifications</Label>
                  <Switch
                    id="slack-notifications"
                    checked={settings.notifications.slackEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('notifications', 'slackEnabled', checked)
                    }
                  />
                </motion.div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="maintenance-mode">Maintenance mode</Label>
                  <Switch
                    id="maintenance-mode"
                    checked={settings.system.maintenanceMode}
                    onCheckedChange={(checked) =>
                      updateSetting('system', 'maintenanceMode', checked)
                    }
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="debug-mode">Debug mode</Label>
                  <Switch
                    id="debug-mode"
                    checked={settings.system.debugMode}
                    onCheckedChange={(checked) => updateSetting('system', 'debugMode', checked)}
                  />
                </motion.div>
                <motion.div className="flex items-center justify-between">
                  <Label htmlFor="backup-enabled">Automated backups</Label>
                  <Switch
                    id="backup-enabled"
                    checked={settings.system.backupEnabled}
                    onCheckedChange={(checked) =>
                      updateSetting('system', 'backupEnabled', checked)
                    }
                  />
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </AdminPageContent>
  );
};

export default SystemSettings;
