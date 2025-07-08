"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Settings, CheckCircle, XCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { DatadogConfig, AWSConfig, LoggingConfig, Settings as SettingsType } from "@/types/settings"

export default function SettingsModal() {
  const [open, setOpen] = useState(false)
  const { toast } = useToast()

  // Settings state
  const [datadogConfig, setDatadogConfig] = useState<DatadogConfig>({
    apiKey: "",
    appKey: "",
    site: "api.datadoghq.com",
    emailAddress: "",
  })

  const [awsConfig, setAWSConfig] = useState<AWSConfig>({
    accessKeyId: "",
    secretAccessKey: "",
    sesRegion: "us-west-2",
    fromEmail: "",
  })

  // Removed original config states - no longer needed

  const [loggingConfig, setLoggingConfig] = useState<LoggingConfig>({
    logLevel: "INFO",
  })

  // Loading states
  const [datadogTesting, setDatadogTesting] = useState(false)
  const [datadogSaving, setDatadogSaving] = useState(false)
  const [awsTesting, setAWSTesting] = useState(false)
  const [awsSaving, setAWSSaving] = useState(false)
  const [loggingSaving, setLoggingSaving] = useState(false)

  // Connection status
  const [datadogStatus, setDatadogStatus] = useState<"idle" | "success" | "error">("idle")
  const [awsStatus, setAWSStatus] = useState<"idle" | "success" | "error">("idle")

  // Load settings when modal opens
  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    try {
      // Use the raw endpoint to get unmasked settings
      const response = await fetch('/api/settings/raw')
      if (!response.ok) {
        throw new Error('Failed to load settings')
      }
      const { data } = await response.json()
      
      console.log('[Settings Modal] Loaded settings:', {
        datadogApiKeyLength: data?.datadog?.apiKey?.length || 0,
        datadogAppKeyLength: data?.datadog?.appKey?.length || 0,
        awsAccessKeyLength: data?.aws?.accessKeyId?.length || 0,
        awsSecretKeyLength: data?.aws?.secretAccessKey?.length || 0,
      })
      
      if (data) {
        // Set display values with actual unmasked data
        setDatadogConfig(data.datadog)
        setAWSConfig(data.aws)
        setLoggingConfig(data.logging)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      toast({
        title: "Failed to load settings",
        description: "Could not load current settings configuration.",
        variant: "destructive",
      })
    }
  }

  const testDatadogConnection = async () => {
    setDatadogTesting(true)
    setDatadogStatus("idle")

    try {
      console.log('[Settings Modal] Testing Datadog connection with:', {
        apiKeyPresent: !!datadogConfig.apiKey,
        appKeyPresent: !!datadogConfig.appKey,
        apiKeyLength: datadogConfig.apiKey?.length,
        appKeyLength: datadogConfig.appKey?.length,
        site: datadogConfig.site,
        emailAddress: datadogConfig.emailAddress,
      })
      console.log('[Settings Modal] Full config:', datadogConfig)

      const response = await fetch('/api/settings/test/datadog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datadogConfig),
      })

      const result = await response.json()
      console.log('[Settings Modal] Test result:', result)

      if (result.success) {
        setDatadogStatus("success")
      } else {
        setDatadogStatus("error")
        console.error('[Settings Modal] Test failed:', result.message || result.error)
      }
    } catch (error) {
      console.error('[Settings Modal] Test error:', error)
      setDatadogStatus("error")
    } finally {
      setDatadogTesting(false)
    }
  }

  const saveDatadogSettings = async () => {
    setDatadogSaving(true)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          datadog: datadogConfig
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: "Settings Saved",
        description: "Datadog configuration has been saved successfully.",
      })
    } catch (error) {
      console.error('[Settings Modal] Save error:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save Datadog settings.",
        variant: "destructive",
      })
    } finally {
      setDatadogSaving(false)
    }
  }

  const testAWSConnection = async () => {
    setAWSTesting(true)
    setAWSStatus("idle")

    try {
      const response = await fetch('/api/settings/test/aws', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(awsConfig),
      })

      const result = await response.json()

      if (result.success) {
        setAWSStatus("success")
      } else {
        setAWSStatus("error")
      }
    } catch (error) {
      setAWSStatus("error")
    } finally {
      setAWSTesting(false)
    }
  }

  const saveAWSSettings = async () => {
    setAWSSaving(true)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          aws: awsConfig
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: "Settings Saved",
        description: "AWS SES configuration has been saved successfully.",
      })
    } catch (error) {
      console.error('[Settings Modal] Save error:', error)
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save AWS settings.",
        variant: "destructive",
      })
    } finally {
      setAWSSaving(false)
    }
  }

  const saveLoggingSettings = async () => {
    setLoggingSaving(true)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logging: loggingConfig }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      toast({
        title: "Settings Saved",
        description: "Logging configuration has been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Failed to save logging settings.",
        variant: "destructive",
      })
    } finally {
      setLoggingSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-settings-trigger>
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>Configure your Datadog and AWS SES integrations</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="datadog" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="datadog">Datadog</TabsTrigger>
            <TabsTrigger value="aws">AWS SES</TabsTrigger>
            <TabsTrigger value="logging">Logging</TabsTrigger>
          </TabsList>

          <TabsContent value="datadog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Datadog API Configuration
                  {datadogStatus === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {datadogStatus === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                </CardTitle>
                <CardDescription>Configure your Datadog API credentials and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dd-api-key">API Key</Label>
                    <Input
                      id="dd-api-key"
                      type="password"
                      value={datadogConfig.apiKey}
                      onChange={(e) => {
                        setDatadogConfig((prev) => ({ ...prev, apiKey: e.target.value }))
                      }}
                      placeholder="Enter Datadog API Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dd-app-key">Application Key</Label>
                    <Input
                      id="dd-app-key"
                      type="password"
                      value={datadogConfig.appKey}
                      onChange={(e) => {
                        setDatadogConfig((prev) => ({ ...prev, appKey: e.target.value }))
                      }}
                      placeholder="Enter Datadog Application Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dd-site">Site</Label>
                    <Input
                      id="dd-site"
                      value={datadogConfig.site}
                      onChange={(e) => setDatadogConfig((prev) => ({ ...prev, site: e.target.value }))}
                      placeholder="api.datadoghq.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dd-email">Datadog Email Address</Label>
                    <Input
                      id="dd-email"
                      type="email"
                      value={datadogConfig.emailAddress}
                      onChange={(e) => setDatadogConfig((prev) => ({ ...prev, emailAddress: e.target.value }))}
                      placeholder="Enter Datadog email address"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={testDatadogConnection}
                    disabled={datadogTesting}
                    className="gap-2"
                  >
                    {datadogTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                  <Button onClick={saveDatadogSettings} disabled={datadogSaving} className="gap-2">
                    {datadogSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Settings
                  </Button>
                </div>
                
                {/* Connection Status Indicator */}
                {datadogStatus !== "idle" && (
                  <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                    datadogStatus === "success" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {datadogStatus === "success" ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Connection successful - Datadog API is working</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        <span>Connection failed - Check your API/Application keys and permissions</span>
                      </>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="aws" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  AWS SES Configuration
                  {awsStatus === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {awsStatus === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                </CardTitle>
                <CardDescription>Configure your AWS SES credentials and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="aws-access-key">Access Key ID</Label>
                    <Input
                      id="aws-access-key"
                      type="password"
                      value={awsConfig.accessKeyId}
                      onChange={(e) => {
                        setAWSConfig((prev) => ({ ...prev, accessKeyId: e.target.value }))
                      }}
                      placeholder="Enter AWS Access Key ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-secret-key">Secret Access Key</Label>
                    <Input
                      id="aws-secret-key"
                      type="password"
                      value={awsConfig.secretAccessKey}
                      onChange={(e) => {
                        setAWSConfig((prev) => ({ ...prev, secretAccessKey: e.target.value }))
                      }}
                      placeholder="Enter AWS Secret Access Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-region">SES Region</Label>
                    <Select
                      value={awsConfig.sesRegion}
                      onValueChange={(value) => setAWSConfig((prev) => ({ ...prev, sesRegion: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AWS region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                        <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                        <SelectItem value="eu-west-1">Europe (Ireland)</SelectItem>
                        <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aws-from-email">From Email</Label>
                    <Input
                      id="aws-from-email"
                      type="email"
                      value={awsConfig.fromEmail}
                      onChange={(e) => setAWSConfig((prev) => ({ ...prev, fromEmail: e.target.value }))}
                      placeholder="Enter from email address"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <div className="flex gap-2 w-full">
                  <Button
                    variant="outline"
                    onClick={testAWSConnection}
                    disabled={awsTesting}
                    className="gap-2"
                  >
                    {awsTesting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Test Connection
                  </Button>
                  <Button onClick={saveAWSSettings} disabled={awsSaving} className="gap-2">
                    {awsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Settings
                  </Button>
                </div>
                
                {/* Connection Status Indicator */}
                {awsStatus !== "idle" && (
                  <div className={`flex items-center gap-2 text-sm p-2 rounded ${
                    awsStatus === "success" 
                      ? "bg-green-50 text-green-700 border border-green-200" 
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    {awsStatus === "success" ? (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Connection successful - AWS SES is working</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" />
                        <span>Connection failed - Check your AWS credentials and region</span>
                      </>
                    )}
                  </div>
                )}
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="logging" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Logging Configuration</CardTitle>
                <CardDescription>Configure application logging settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="log-level">Log Level</Label>
                  <Select
                    value={loggingConfig.logLevel}
                    onValueChange={(value: "DEBUG" | "INFO" | "WARN" | "ERROR") => 
                      setLoggingConfig((prev) => ({ ...prev, logLevel: value }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select log level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBUG">DEBUG</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARN">WARN</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveLoggingSettings} disabled={loggingSaving} className="gap-2">
                  {loggingSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Logging Settings
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}