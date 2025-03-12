
import { Campaign } from "../types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { useState } from "react";

interface CampaignListProps {
  campaigns: Campaign[];
  onEdit: (campaign: Campaign) => void;
  onHide: (campaignId: string) => void;
}

export function CampaignList({ campaigns, onEdit, onHide }: CampaignListProps) {
  const [campaignToHide, setCampaignToHide] = useState<string | null>(null);

  const handleHide = () => {
    if (campaignToHide) {
      onHide(campaignToHide);
      setCampaignToHide(null);
    }
  };
  
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Campaign</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.id}>
              <TableCell className="font-medium">{campaign.title}</TableCell>
              <TableCell>{campaign.slug}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${campaign.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {campaign.is_active ? 'Active' : 'Inactive'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8" onClick={() => onEdit(campaign)}>
                    <Edit size={16} />
                  </Button>
                  <Link to={`/admin/campaign/${campaign.id}`}>
                    <Button variant="ghost" size="sm" className="h-8 w-8">
                      <Eye size={16} />
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    onClick={() => setCampaignToHide(campaign.id)}
                  >
                    <EyeOff size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!campaignToHide} onOpenChange={(open) => !open && setCampaignToHide(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hide Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              This will hide the campaign from the admin interface. The campaign data and associated entries will be preserved. You can restore hidden campaigns later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleHide} className="bg-slate-600 hover:bg-slate-700">
              Hide Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
