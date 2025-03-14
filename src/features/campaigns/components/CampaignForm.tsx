
import { Campaign, CampaignFormData } from "../types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CampaignFormProps {
  initialData?: Campaign;
  onSubmit: (data: CampaignFormData) => void;
  onCancel: () => void;
}

export function CampaignForm({ initialData, onSubmit, onCancel }: CampaignFormProps) {
  const [formData, setFormData] = useState<CampaignFormData>({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    is_active: initialData?.is_active ?? true,
    prize_name: initialData?.prize_name || '',
    prize_amount: initialData?.prize_amount || '',
    target_audience: initialData?.target_audience || '',
    thank_you_title: initialData?.thank_you_title || '',
    thank_you_description: initialData?.thank_you_description || '',
    email_template_id: initialData?.email_template_id || 'default',
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    end_date: initialData?.end_date || new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    share_title: initialData?.share_title || 'Give Your Students\' Parents a Free Gift!',
    share_description: initialData?.share_description || 'Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you\'ll earn an extra entry for every parent who activates the trial.',
    hero_image_url: initialData?.hero_image_url || '',
    subtitle: initialData?.subtitle || 'Support Your Students and Stock Up on Classroom Supplies',
    mobile_subtitle: initialData?.mobile_subtitle || 'Support Your Students',
    promotional_text: initialData?.promotional_text || 'Enter for a chance to win $200 to spend on everything on your Anything from Amazon list - from backpacks and notebooks to markers and more! Get ready for a successful school year.',
    meta_title: initialData?.meta_title || '',
    meta_description: initialData?.meta_description || '',
    meta_image: initialData?.meta_image || '',
    meta_url: initialData?.meta_url || '',
    email_subject: initialData?.email_subject || 'Congratulations! You earned a Sweepstakes entry!',
    email_heading: initialData?.email_heading || 'You just earned an extra Sweepstakes entry!',
    email_referral_message: initialData?.email_referral_message || 'Great news! One of your referrals just tried Comprendi™, and you now have {{totalEntries}} entries in the {{prize_amount}} {{prize_name}} Sweepstakes!',
    email_cta_text: initialData?.email_cta_text || 'Visit Comprendi Reading',
    email_footer_message: initialData?.email_footer_message || 'Remember, each parent who activates a free trial through your link gives you another entry in the sweepstakes!'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
    
    if (fieldErrors[name]) {
      const updatedErrors = { ...fieldErrors };
      delete updatedErrors[name];
      setFieldErrors(updatedErrors);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    const requiredFields: Array<{ field: keyof CampaignFormData; label: string }> = [
      { field: 'title', label: 'Campaign Title' },
      { field: 'slug', label: 'Campaign Slug' },
      { field: 'prize_name', label: 'Prize Name' },
      { field: 'prize_amount', label: 'Prize Amount' },
      { field: 'target_audience', label: 'Target Audience' },
      { field: 'thank_you_title', label: 'Thank You Title' },
      { field: 'thank_you_description', label: 'Thank You Description' },
      { field: 'email_template_id', label: 'Email Template ID' },
      { field: 'start_date', label: 'Start Date' },
      { field: 'end_date', label: 'End Date' }
    ];

    for (const { field, label } of requiredFields) {
      if (!formData[field]) {
        errors[field] = `${label} is required`;
        isValid = false;
      }
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      
      if (endDate < startDate) {
        errors.end_date = 'End date must be after start date';
        isValid = false;
      }
    }

    setFieldErrors(errors);
    
    if (!isValid) {
      setFormError("Please fix the highlighted errors");
    } else {
      setFormError(null);
    }
    
    return isValid;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">Campaign Title *</label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="e.g. Classroom Supplies 2024"
            className={fieldErrors.title ? "border-red-500" : ""}
            required
          />
          {fieldErrors.title && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="slug" className="text-sm font-medium">Campaign Slug *</label>
          <Input
            id="slug"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="e.g. classroom-supplies-2024"
            className={fieldErrors.slug ? "border-red-500" : ""}
            required
          />
          {fieldErrors.slug && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.slug}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="subtitle" className="text-sm font-medium">Form Subtitle (Desktop)</label>
        <Input
          id="subtitle"
          name="subtitle"
          value={formData.subtitle}
          onChange={handleInputChange}
          placeholder="e.g. Support Your Students and Stock Up on Classroom Supplies"
        />
        <p className="text-xs text-gray-500 mt-1">This appears as a subtitle below the main form title on desktop</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="mobile_subtitle" className="text-sm font-medium">Form Subtitle (Mobile)</label>
        <Input
          id="mobile_subtitle"
          name="mobile_subtitle"
          value={formData.mobile_subtitle}
          onChange={handleInputChange}
          placeholder="e.g. Support Your Students"
        />
        <p className="text-xs text-gray-500 mt-1">A shorter subtitle that appears on mobile devices</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="promotional_text" className="text-sm font-medium">Promotional Description</label>
        <Input
          id="promotional_text"
          name="promotional_text"
          value={formData.promotional_text}
          onChange={handleInputChange}
          placeholder="Enter for a chance to win $200 to spend on everything on your Anything from Amazon list..."
        />
        <p className="text-xs text-gray-500 mt-1">This appears as the main promotional description on the landing page</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="prize_name" className="text-sm font-medium">Prize Name *</label>
          <Input
            id="prize_name"
            name="prize_name"
            value={formData.prize_name}
            onChange={handleInputChange}
            placeholder="e.g. Classroom Supplies"
            className={fieldErrors.prize_name ? "border-red-500" : ""}
            required
          />
          {fieldErrors.prize_name && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.prize_name}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="prize_amount" className="text-sm font-medium">Prize Amount *</label>
          <Input
            id="prize_amount"
            name="prize_amount"
            value={formData.prize_amount}
            onChange={handleInputChange}
            placeholder="e.g. $500"
            className={fieldErrors.prize_amount ? "border-red-500" : ""}
            required
          />
          {fieldErrors.prize_amount && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.prize_amount}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="target_audience" className="text-sm font-medium">Target Audience *</label>
        <Input
          id="target_audience"
          name="target_audience"
          value={formData.target_audience}
          onChange={handleInputChange}
          placeholder="e.g. Teachers"
          className={fieldErrors.target_audience ? "border-red-500" : ""}
          required
        />
        {fieldErrors.target_audience && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.target_audience}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="email_template_id" className="text-sm font-medium">Email Template ID *</label>
        <Input
          id="email_template_id"
          name="email_template_id"
          value={formData.email_template_id}
          onChange={handleInputChange}
          placeholder="e.g. default"
          className={fieldErrors.email_template_id ? "border-red-500" : ""}
          required
        />
        <p className="text-xs text-gray-500 mt-1">Use "default" if you don't have a specific template ID</p>
        {fieldErrors.email_template_id && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.email_template_id}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="start_date" className="text-sm font-medium">Start Date *</label>
          <Input
            id="start_date"
            name="start_date"
            type="date"
            value={formData.start_date}
            onChange={handleInputChange}
            className={fieldErrors.start_date ? "border-red-500" : ""}
            required
          />
          {fieldErrors.start_date && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.start_date}</p>
          )}
        </div>
        <div className="space-y-2">
          <label htmlFor="end_date" className="text-sm font-medium">End Date *</label>
          <Input
            id="end_date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleInputChange}
            className={fieldErrors.end_date ? "border-red-500" : ""}
            required
          />
          {fieldErrors.end_date && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.end_date}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="thank_you_title" className="text-sm font-medium">Thank You Title *</label>
        <Input
          id="thank_you_title"
          name="thank_you_title"
          value={formData.thank_you_title}
          onChange={handleInputChange}
          placeholder="e.g. Thanks for entering!"
          className={fieldErrors.thank_you_title ? "border-red-500" : ""}
          required
        />
        {fieldErrors.thank_you_title && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.thank_you_title}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="thank_you_description" className="text-sm font-medium">Thank You Description *</label>
        <Input
          id="thank_you_description"
          name="thank_you_description"
          value={formData.thank_you_description}
          onChange={handleInputChange}
          placeholder="e.g. You've been successfully entered in our sweepstakes."
          className={fieldErrors.thank_you_description ? "border-red-500" : ""}
          required
        />
        {fieldErrors.thank_you_description && (
          <p className="text-xs text-red-500 mt-1">{fieldErrors.thank_you_description}</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="share_title" className="text-sm font-medium">Share Title</label>
        <Input
          id="share_title"
          name="share_title"
          value={formData.share_title}
          onChange={handleInputChange}
          placeholder="e.g. Give Your Students' Parents a Free Gift!"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="share_description" className="text-sm font-medium">Share Description</label>
        <Input
          id="share_description"
          name="share_description"
          value={formData.share_description}
          onChange={handleInputChange}
          placeholder="Share description..."
        />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleInputChange}
          />
          <span className="text-sm font-medium">Active Campaign</span>
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor="hero_image_url" className="text-sm font-medium">Landing Page Hero Image URL</label>
        <Input
          id="hero_image_url"
          name="hero_image_url"
          value={formData.hero_image_url}
          onChange={handleInputChange}
          placeholder="e.g. https://example.com/hero-image.jpg"
        />
        <p className="text-sm text-gray-500">URL for the campaign landing page hero image</p>
      </div>

      <div className="mt-8 border-t pt-8">
        <h2 className="text-lg font-semibold mb-4">Email Template Content</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email_subject" className="text-sm font-medium">Email Subject Line</label>
            <Input
              id="email_subject"
              name="email_subject"
              value={formData.email_subject}
              onChange={handleInputChange}
              placeholder="e.g. Congratulations! You earned a Sweepstakes entry!"
            />
            <p className="text-xs text-gray-500">The subject line of the email sent when someone uses a referral link</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="email_heading" className="text-sm font-medium">Email Heading</label>
            <Input
              id="email_heading"
              name="email_heading"
              value={formData.email_heading}
              onChange={handleInputChange}
              placeholder="e.g. You just earned an extra Sweepstakes entry!"
            />
            <p className="text-xs text-gray-500">The main heading displayed in the email</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="email_referral_message" className="text-sm font-medium">Email Referral Message</label>
            <Textarea
              id="email_referral_message"
              name="email_referral_message"
              value={formData.email_referral_message}
              onChange={handleInputChange}
              placeholder="Great news! One of your referrals just tried Comprendi™..."
              rows={3}
            />
            <p className="text-xs text-gray-500">Use &#123;&#123;totalEntries&#125;&#125; as a placeholder for the number of entries, and &#123;&#123;prize_amount&#125;&#125; &#123;&#123;prize_name&#125;&#125; for the prize details</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="email_cta_text" className="text-sm font-medium">Email CTA Button Text</label>
            <Input
              id="email_cta_text"
              name="email_cta_text"
              value={formData.email_cta_text}
              onChange={handleInputChange}
              placeholder="e.g. Visit Comprendi Reading"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email_footer_message" className="text-sm font-medium">Email Footer Message</label>
            <Textarea
              id="email_footer_message"
              name="email_footer_message"
              value={formData.email_footer_message}
              onChange={handleInputChange}
              placeholder="Remember, each parent who activates a free trial..."
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 border-t pt-8">
        <h2 className="text-lg font-semibold mb-4">SEO & Social Sharing Metadata</h2>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="meta_title" className="text-sm font-medium">Meta Title</label>
            <Input
              id="meta_title"
              name="meta_title"
              value={formData.meta_title}
              onChange={handleInputChange}
              placeholder="e.g. Win $1,000 for Your Classroom - Educ8r Sweepstakes"
            />
            <p className="text-xs text-gray-500">The title that appears in search results and social shares</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="meta_description" className="text-sm font-medium">Meta Description</label>
            <Textarea
              id="meta_description"
              name="meta_description"
              value={formData.meta_description}
              onChange={handleInputChange}
              placeholder="Enter a compelling description for search results and social shares..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="meta_image" className="text-sm font-medium">Meta Image URL</label>
            <Input
              id="meta_image"
              name="meta_image"
              value={formData.meta_image}
              onChange={handleInputChange}
              placeholder="https://example.com/share-image.jpg"
            />
            <p className="text-xs text-gray-500">The image that appears when sharing on social media</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="meta_url" className="text-sm font-medium">Meta URL</label>
            <Input
              id="meta_url"
              name="meta_url"
              value={formData.meta_url}
              onChange={handleInputChange}
              placeholder="https://educ8r.freeparentsearch.com/your-campaign"
            />
            <p className="text-xs text-gray-500">The canonical URL for this campaign</p>
          </div>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction type="submit">
          {initialData ? 'Update Campaign' : 'Create Campaign'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </form>
  );
}
