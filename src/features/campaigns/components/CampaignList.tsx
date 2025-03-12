
import { Campaign } from "../types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { Link } from "react-router-dom";

interface CampaignListProps {
  campaigns: Campaign[];
  onEdit: (campaign: Campaign) => void;
}

export function CampaignList({ campaigns, onEdit }: CampaignListProps) {
  return (
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
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
