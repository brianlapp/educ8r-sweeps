
import React from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Database, Globe, ExternalLink, GitBranch, Code, Zap, Mail, Share2, PieChart } from "lucide-react";
import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TechStack = () => {
  return (
    <div className="container max-w-5xl py-6 md:py-12">
      <Helmet>
        <title>Tech Stack | Educ8r Sweepstakes</title>
        <meta name="description" content="Technical overview of the Educ8r Sweepstakes platform" />
      </Helmet>

      <div className="flex items-center justify-between mb-8">
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Tech Stack</h1>
      </div>

      <div className="space-y-10">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Project Overview</h2>
          <p className="text-muted-foreground mb-4">
            This sweepstakes platform is built with modern web technologies to create 
            a seamless, responsive, and feature-rich user experience. The system 
            manages sweepstakes entries, referrals, and integrates with various external 
            APIs for expanded functionality.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-6">
            <Badge className="justify-center py-1.5">React</Badge>
            <Badge className="justify-center py-1.5">TypeScript</Badge>
            <Badge className="justify-center py-1.5">Supabase</Badge>
            <Badge className="justify-center py-1.5">Tailwind CSS</Badge>
            <Badge className="justify-center py-1.5">Vite</Badge>
            <Badge className="justify-center py-1.5">shadcn/ui</Badge>
            <Badge className="justify-center py-1.5">Everflow</Badge>
            <Badge className="justify-center py-1.5">BeehiiV</Badge>
          </div>
        </section>

        <Separator />

        {/* Core Technologies */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Core Technologies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Globe className="mr-2 h-5 w-5 text-primary" />
                  Frontend Framework
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="font-medium">React</span>
                    <span className="text-muted-foreground">v18.3.1</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">TypeScript</span>
                    <span className="text-muted-foreground">Type safety</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Vite</span>
                    <span className="text-muted-foreground">Build tool</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">React Router</span>
                    <span className="text-muted-foreground">Navigation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Database className="mr-2 h-5 w-5 text-primary" />
                  Backend Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="font-medium">Supabase</span>
                    <span className="text-muted-foreground">Database & Auth</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Edge Functions</span>
                    <span className="text-muted-foreground">Serverless</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">PostgreSQL</span>
                    <span className="text-muted-foreground">Database</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Row Level Security</span>
                    <span className="text-muted-foreground">Data protection</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Code className="mr-2 h-5 w-5 text-primary" />
                  UI & Styling
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="font-medium">Tailwind CSS</span>
                    <span className="text-muted-foreground">Utility-first CSS</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">shadcn/ui</span>
                    <span className="text-muted-foreground">Component library</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Lucide Icons</span>
                    <span className="text-muted-foreground">Icon system</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Responsive Design</span>
                    <span className="text-muted-foreground">Mobile-first</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <GitBranch className="mr-2 h-5 w-5 text-primary" />
                  Development Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex justify-between">
                    <span className="font-medium">ESLint</span>
                    <span className="text-muted-foreground">Code linting</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Tanstack React Query</span>
                    <span className="text-muted-foreground">Data fetching</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">React Hook Form</span>
                    <span className="text-muted-foreground">Form handling</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-medium">Zod</span>
                    <span className="text-muted-foreground">Schema validation</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Key Integrations */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Key Integrations</h2>
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-2">
                      <Share2 className="mr-2 h-5 w-5 text-primary" /> 
                      Everflow Integration
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Complete referral tracking solution using Everflow SDK to monitor 
                      impressions, clicks, and conversions. Supports referral codes and 
                      transaction IDs for accurate attribution.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">Impression Tracking</Badge>
                      <Badge variant="outline">Click Tracking</Badge>
                      <Badge variant="outline">Conversion Tracking</Badge>
                      <Badge variant="outline">Referral Attribution</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-2">
                      <Mail className="mr-2 h-5 w-5 text-primary" /> 
                      BeehiiV Email Integration
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Email marketing platform integration to manage subscriptions,
                      tagging, and automated email sequences for sweepstakes participants.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">User Tagging</Badge>
                      <Badge variant="outline">Email Automation</Badge>
                      <Badge variant="outline">Campaign Tracking</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-2">
                      <Mail className="mr-2 h-5 w-5 text-primary" /> 
                      Resend Email Service
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Transactional email service for sending referral notifications
                      and confirmation emails via Edge Functions.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">Referral Notifications</Badge>
                      <Badge variant="outline">Transactional Emails</Badge>
                      <Badge variant="outline">Edge Function Integration</Badge>
                    </div>
                  </div>

                  <div>
                    <h3 className="flex items-center text-lg font-medium mb-2">
                      <PieChart className="mr-2 h-5 w-5 text-primary" /> 
                      Google Sheets Integration
                    </h3>
                    <p className="text-muted-foreground mb-2">
                      Automated data export to Google Sheets for easy reporting and
                      analysis of sweepstakes entries and referrals.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">Automated Sync</Badge>
                      <Badge variant="outline">Manual Sync Option</Badge>
                      <Badge variant="outline">Entry Tracking</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Architecture & Features */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Architecture & Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Zap className="mr-2 h-5 w-5 text-primary" />
                  Core Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Zap className="h-3 w-3 text-primary" />
                    </span>
                    <span>Entry form with validation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Zap className="h-3 w-3 text-primary" />
                    </span>
                    <span>Referral system with unique codes</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Zap className="h-3 w-3 text-primary" />
                    </span>
                    <span>Automated referral tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Zap className="h-3 w-3 text-primary" />
                    </span>
                    <span>Email notifications for referrals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Zap className="h-3 w-3 text-primary" />
                    </span>
                    <span>Admin dashboard with entry management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Zap className="h-3 w-3 text-primary" />
                    </span>
                    <span>Protected admin routes</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center text-lg">
                  <Database className="mr-2 h-5 w-5 text-primary" />
                  Database Schema
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Database className="h-3 w-3 text-primary" />
                    </span>
                    <span>entries - Main user entries table</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Database className="h-3 w-3 text-primary" />
                    </span>
                    <span>referral_conversions - Tracks all conversions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Database className="h-3 w-3 text-primary" />
                    </span>
                    <span>admin_users - Secure admin authentication</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Database className="h-3 w-3 text-primary" />
                    </span>
                    <span>sheets_sync_metadata - Sync tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="bg-primary/10 p-1 rounded-full">
                      <Database className="h-3 w-3 text-primary" />
                    </span>
                    <span>automated_sync_logs - Log automated processes</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Technical Documentation & Resources */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Developer Resources</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/docs" className="no-underline">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="flex items-center p-6">
                  <div className="mr-4 bg-primary/10 p-3 rounded-full">
                    <Code className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">API Documentation</h3>
                    <p className="text-muted-foreground">View integration guides and API reference</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link to="/admin/webhooks" className="no-underline">
              <Card className="h-full transition-all hover:border-primary/50 hover:shadow-md">
                <CardContent className="flex items-center p-6">
                  <div className="mr-4 bg-primary/10 p-3 rounded-full">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Webhook Status</h3>
                    <p className="text-muted-foreground">Monitor integration health and webhook logs</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t pt-6 text-center text-muted-foreground">
          <p>Created by the Educ8r Team - {new Date().getFullYear()}</p>
        </div>
      </div>
    </div>
  );
};

export default TechStack;
