
import { Campaign, CampaignFormData } from "../types";
import { Input } from "@/components/ui/input";
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
    email_template_id: initialData?.email_template_id || 'default', // Provide a default value
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    end_date: initialData?.end_date || new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split('T')[0],
    share_title: initialData?.share_title || 'Give Your Students\' Parents a Free Gift!',
    share_description: initialData?.share_description || 'Share your referral link with the parents of your students. When they sign up for a free trial of Comprendi™, you\'ll earn an extra entry for every parent who activates the trial.',
    hero_image_url: initialData?.hero_image_url || '',
    subtitle: initialData?.subtitle || 'Support Your Students and Stock Up on Classroom Supplies'
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    
    // Clear error for this field when user starts typing
    if (fieldErrors[name]) {
      const updatedErrors = { ...fieldErrors };
      delete updatedErrors[name];
      setFieldErrors(updatedErrors);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let isValid = true;

    // Required fields validation
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

    // Date validation
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
        <label htmlFor="subtitle" className="text-sm font-medium">Form Subtitle</label>
        <Input
          id="subtitle"
          name="subtitle"
          value={formData.subtitle}
          onChange={handleInputChange}
          placeholder="e.g. Support Your Students and Stock Up on Classroom Supplies"
        />
        <p className="text-xs text-gray-500 mt-1">This appears as a subtitle below the main form title</p>
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

      <AlertDialogFooter>
        <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
        <AlertDialogAction type="submit">
          {initialData ? 'Update Campaign' : 'Create Campaign'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </form>
  );
}
