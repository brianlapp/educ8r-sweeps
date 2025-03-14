
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Campaign } from '../types';

interface EmailTemplatePreviewProps {
  campaign: Campaign;
  previewData?: {
    firstName: string;
    totalEntries: number;
    referralCode: string;
  };
}

export function EmailTemplatePreview({ campaign, previewData = { firstName: 'John', totalEntries: 3, referralCode: 'ABC123XY' } }: EmailTemplatePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [viewType, setViewType] = useState<'desktop' | 'mobile' | 'code'>('desktop');
  
  // Process the email template with the campaign data and preview data
  useEffect(() => {
    // Generate the referral link using the code
    const referralLink = `https://dmlearninglab.com/homesc/?utm_source=sweeps&oid=1987&sub1=${previewData.referralCode}`;
    
    // Replace variables in the email text
    const processTemplate = (text: string) => {
      return text
        .replace(/\{\{firstName\}\}/g, previewData.firstName)
        .replace(/\{\{first_name\}\}/g, previewData.firstName)
        .replace(/\{\{totalEntries\}\}/g, previewData.totalEntries.toString())
        .replace(/\{\{total_entries\}\}/g, previewData.totalEntries.toString())
        .replace(/\{\{prize_amount\}\}/g, campaign.prize_amount)
        .replace(/\{\{prize_name\}\}/g, campaign.prize_name)
        .replace(/\{\{referralCode\}\}/g, previewData.referralCode)
        .replace(/\{\{referral_code\}\}/g, previewData.referralCode)
        .replace(/\{\{referralLink\}\}/g, referralLink)
        .replace(/\{\{referral_link\}\}/g, referralLink);
    };

    // Process all email template fields
    const emailSubject = processTemplate(campaign.email_subject || 'Congratulations! You earned a Sweepstakes entry!');
    const emailHeading = processTemplate(campaign.email_heading || 'You just earned an extra Sweepstakes entry!');
    const emailReferralMessage = processTemplate(campaign.email_referral_message || `Great news! One of your referrals just tried Comprendi™, and you now have ${previewData.totalEntries} entries in the ${campaign.prize_amount} ${campaign.prize_name} Sweepstakes!`);
    const emailCtaText = processTemplate(campaign.email_cta_text || 'Visit Comprendi Reading');
    const emailFooterMessage = processTemplate(campaign.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!');

    // Generate the HTML template
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <div style="text-align: center; margin-bottom: 20px;">
          <img src="https://educ8r.freeparentsearch.com/lovable-uploads/2b96223c-82ba-48db-9c96-5c37da48d93e.png" alt="FPS Logo" style="max-width: 180px;">
        </div>
        
        <h1 style="color: #2C3E50; text-align: center; margin-bottom: 20px;">Congratulations, ${previewData.firstName}!</h1>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #3b82f6;">
          <h2 style="color: #3b82f6; margin-top: 0;">${emailHeading}</h2>
          <p style="font-size: 16px; line-height: 1.5;">
            ${emailReferralMessage}
          </p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 20px;">
          Keep the momentum going! Share your referral link with more parents to increase your chances of winning:
        </p>
        
        <div style="background-color: #f0f9ff; border-radius: 8px; padding: 15px; margin-bottom: 25px; word-break: break-all; font-family: monospace; font-size: 14px;">
          ${referralLink}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${referralLink}" style="display: inline-block; background-color: #16a34a; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">${emailCtaText}</a>
        </div>
        
        <p style="font-size: 16px; line-height: 1.5;">
          ${emailFooterMessage}
        </p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
          <p>© 2025 Free Parent Search. All rights reserved.</p>
        </div>
      </div>
    `;
    
    setPreviewHtml(html);
  }, [campaign, previewData]);

  // Render appropriate view based on selection
  const renderPreview = () => {
    if (viewType === 'code') {
      return (
        <div className="bg-gray-100 p-4 rounded-md overflow-auto h-[500px]">
          <pre className="text-xs">{previewHtml}</pre>
        </div>
      );
    }
    
    return (
      <div className={`relative overflow-hidden rounded-md border border-gray-200 bg-white ${viewType === 'mobile' ? 'max-w-[375px] h-[600px]' : 'w-full h-[500px]'} mx-auto`}>
        <iframe 
          srcDoc={previewHtml}
          title="Email Preview" 
          className="w-full h-full border-0" 
          sandbox="allow-same-origin"
        />
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-medium">Email Subject:</span> {campaign.email_subject || 'Congratulations! You earned a Sweepstakes entry!'}
          </p>
        </div>
        
        <Tabs defaultValue="desktop" className="w-full" onValueChange={(value) => setViewType(value as 'desktop' | 'mobile' | 'code')}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Preview Mode:</h3>
            <TabsList>
              <TabsTrigger value="desktop">Desktop</TabsTrigger>
              <TabsTrigger value="mobile">Mobile</TabsTrigger>
              <TabsTrigger value="code">HTML</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="desktop" className="m-0">
            {renderPreview()}
          </TabsContent>
          
          <TabsContent value="mobile" className="m-0">
            {renderPreview()}
          </TabsContent>
          
          <TabsContent value="code" className="m-0">
            {renderPreview()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
